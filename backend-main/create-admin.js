// Create Admin User in MongoDB
// This script creates the admin user document required for group creation
const mongoose = require('mongoose');
const { User } = require('./models/User');
require('dotenv').config();

const MONGO_URI = process.env.MONGO_URI;
const ADMIN_EMAIL = process.env.ADMIN_EMAIL || 'admuser.collearning.2025@gmail.com';

// ⚠️ IMPORTANT: You need to get the admin's Firebase UID
// Option 1: Check Firebase Console → Authentication → Users
// Option 2: Have admin login and check browser console for decoded.uid
// Option 3: Check backend logs when admin tries to login

const ADMIN_FIREBASE_UID = process.argv[2];

if (!ADMIN_FIREBASE_UID) {
    console.error('❌ Usage: node create-admin.js <FIREBASE_UID>');
    console.error('');
    console.error('Example: node create-admin.js abc123xyz456');
    console.error('');
    console.error('To get Firebase UID:');
    console.error('1. Go to Firebase Console → Authentication → Users');
    console.error('2. Find admin user and copy UID');
    console.error('3. OR have admin login and check browser console');
    process.exit(1);
}

console.log('🔍 Connecting to MongoDB...');
console.log('📧 Admin email:', ADMIN_EMAIL);
console.log('🔑 Firebase UID:', ADMIN_FIREBASE_UID);

mongoose.connect(MONGO_URI)
    .then(async () => {
        console.log('✅ Connected to MongoDB');

        // Check if admin already exists
        const existing = await User.findOne({
            $or: [
                { email: ADMIN_EMAIL },
                { firebaseUid: ADMIN_FIREBASE_UID }
            ]
        });

        if (existing) {
            console.log('⚠️  Admin user already exists:');
            console.log('   - _id:', existing._id);
            console.log('   - email:', existing.email);
            console.log('   - firebaseUid:', existing.firebaseUid);
            console.log('   - name:', existing.name);
            console.log('   - role:', existing.role);

            // Update if needed
            if (existing.role !== 'admin') {
                console.log('🔄 Updating role to admin...');
                existing.role = 'admin';
                await existing.save();
                console.log('✅ Role updated to admin');
            }

            await mongoose.connection.close();
            console.log('\n✅ Admin user verified');
            process.exit(0);
        }

        // Create new admin user
        console.log('📝 Creating admin user...');
        const adminUser = await User.create({
            firebaseUid: ADMIN_FIREBASE_UID,
            email: ADMIN_EMAIL,
            name: 'Admin User',
            username: ADMIN_EMAIL.split('@')[0],
            role: 'admin',
            status: 'active',
            registeredAt: new Date(),
            lastActivityAt: new Date(),
            loginTimes: [],
            profile: {},
        });

        console.log('✅ Admin user created successfully!');
        console.log('📝 User data:');
        console.log('   - _id:', adminUser._id);
        console.log('   - email:', adminUser.email);
        console.log('   - firebaseUid:', adminUser.firebaseUid);
        console.log('   - name:', adminUser.name);
        console.log('   - role:', adminUser.role);

        await mongoose.connection.close();
        console.log('\n✅ Done! Admin can now create groups.');
        process.exit(0);
    })
    .catch(err => {
        console.error('❌ Error:', err.message);
        process.exit(1);
    });
