// MongoDB Admin User Verification Script
const mongoose = require('mongoose');
require('dotenv').config();

const MONGO_URI = process.env.MONGO_URI;
const ADMIN_EMAIL = process.env.ADMIN_EMAIL || 'admuser.collearning.2025@gmail.com';

if (!MONGO_URI) {
    console.error('❌ MONGO_URI not found in .env');
    process.exit(1);
}

console.log('🔍 Connecting to MongoDB...');
console.log('📧 Looking for admin:', ADMIN_EMAIL);

mongoose.connect(MONGO_URI)
    .then(async () => {
        console.log('✅ Connected to MongoDB');
        console.log('📊 Database:', mongoose.connection.name);

        // Check users collection
        const User = mongoose.connection.collection('users');
        const adminUser = await User.findOne({ email: ADMIN_EMAIL });

        console.log('\n=== ADMIN USER CHECK ===');
        if (adminUser) {
            console.log('✅ Admin user EXISTS in MongoDB');
            console.log('📝 User data:');
            console.log('   - _id:', adminUser._id);
            console.log('   - email:', adminUser.email);
            console.log('   - name:', adminUser.name);
            console.log('   - firebaseUid:', adminUser.firebaseUid);
            console.log('   - role:', adminUser.role);
            console.log('   - groupId:', adminUser.groupId || 'null');
        } else {
            console.log('❌ Admin user NOT FOUND in MongoDB');
            console.log('⚠️  Admin must login first to create user document');
        }

        // Check groups collection
        const Group = mongoose.connection.collection('groups');
        const groupCount = await Group.countDocuments();
        console.log('\n=== GROUPS CHECK ===');
        console.log('📊 Total groups:', groupCount);

        if (groupCount > 0) {
            const groups = await Group.find({}).limit(5).toArray();
            console.log('📝 Sample groups:');
            groups.forEach((g, i) => {
                console.log(`   ${i + 1}. ${g.name} (${g.members?.length || 0} members)`);
            });
        }

        await mongoose.connection.close();
        console.log('\n✅ Verification complete');
        process.exit(0);
    })
    .catch(err => {
        console.error('❌ MongoDB connection error:', err.message);
        process.exit(1);
    });
