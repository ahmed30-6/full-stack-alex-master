// Admin User Verification Script
const mongoose = require('mongoose');
require('dotenv').config();

const MONGO_URI = process.env.MONGO_URI;
const ADMIN_EMAIL = process.env.ADMIN_EMAIL;

if (!MONGO_URI) {
    console.error('❌ MONGO_URI not found in .env');
    process.exit(1);
}

if (!ADMIN_EMAIL) {
    console.error('❌ ADMIN_EMAIL not found in .env');
    process.exit(1);
}

console.log('🔍 Connecting to MongoDB...');
console.log('📧 ADMIN_EMAIL from .env:', ADMIN_EMAIL);

mongoose.connect(MONGO_URI)
    .then(async () => {
        console.log('✅ Connected to MongoDB');
        console.log('📊 Database:', mongoose.connection.name);

        const User = mongoose.connection.collection('users');

        console.log('\n=== ADMIN USER VERIFICATION ===');

        // Find admin user by email
        const adminUser = await User.findOne({ email: ADMIN_EMAIL });

        if (!adminUser) {
            console.log('❌ Admin user NOT FOUND in MongoDB');
            console.log('   Email searched:', ADMIN_EMAIL);
            console.log('\n⚠️  ACTION REQUIRED: Admin must log in via frontend to persist user');
        } else {
            console.log('✅ Admin user FOUND in MongoDB');
            console.log('   _id:', adminUser._id);
            console.log('   email:', adminUser.email);
            console.log('   name:', adminUser.name);
            console.log('   role:', adminUser.role);
            console.log('   firebaseUid:', adminUser.firebaseUid);

            if (adminUser.role === 'admin') {
                console.log('\n✅ Admin role is CORRECT');
            } else {
                console.log('\n❌ Admin role is INCORRECT');
                console.log('   Current role:', adminUser.role);
                console.log('   Expected role: admin');
                console.log('\n🔧 Correcting admin role...');

                await User.updateOne(
                    { email: ADMIN_EMAIL },
                    { $set: { role: 'admin' } }
                );

                console.log('✅ Admin role corrected to "admin"');
            }
        }

        // Check all users with role field
        console.log('\n=== ALL USERS ROLE SUMMARY ===');
        const allUsers = await User.find({}).toArray();
        console.log(`Total users: ${allUsers.length}`);

        const roleCount = {};
        allUsers.forEach(u => {
            const role = u.role || 'undefined';
            roleCount[role] = (roleCount[role] || 0) + 1;
        });

        console.log('Role distribution:');
        Object.entries(roleCount).forEach(([role, count]) => {
            console.log(`  ${role}: ${count}`);
        });

        await mongoose.connection.close();
        console.log('\n✅ Verification complete');
        process.exit(0);
    })
    .catch(err => {
        console.error('❌ Error:', err.message);
        process.exit(1);
    });
