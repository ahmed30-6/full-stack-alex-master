const mongoose = require('./node_modules/mongoose');

async function fixAdminRole() {
    try {
        await mongoose.connect(process.env.MONGO_URI);
        console.log('✅ Connected to MongoDB');

        const User = mongoose.model('User', new mongoose.Schema({}, { strict: false }));

        const adminEmail = 'admuser.collearning.2025@gmail.com';
        const admin = await User.findOne({ email: adminEmail });

        if (!admin) {
            console.log('❌ Admin user not found in MongoDB');
            process.exit(1);
        }

        console.log('Current admin user:');
        console.log('  Email:', admin.email);
        console.log('  Name:', admin.name);
        console.log('  Role:', admin.role);
        console.log('  FirebaseUid:', admin.firebaseUid);

        if (admin.role !== 'admin') {
            console.log('\n🔧 Correcting admin role...');
            await User.updateOne(
                { email: adminEmail },
                { $set: { role: 'admin' } }
            );
            console.log('✅ Admin role corrected to "admin"');
        } else {
            console.log('\n✅ Admin role is already correct');
        }

        process.exit(0);
    } catch (err) {
        console.error('❌ Error:', err);
        process.exit(1);
    }
}

fixAdminRole();
