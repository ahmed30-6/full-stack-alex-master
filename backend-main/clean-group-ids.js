// Clean invalid 'id' field from existing Group documents
const mongoose = require('mongoose');
require('dotenv').config();

const MONGO_URI = process.env.MONGO_URI;

if (!MONGO_URI) {
    console.error('❌ MONGO_URI not found');
    process.exit(1);
}

console.log('🔍 Connecting to MongoDB...');

mongoose.connect(MONGO_URI)
    .then(async () => {
        console.log('✅ Connected to MongoDB');

        const Group = mongoose.connection.collection('groups');

        // Count documents with 'id' field
        const count = await Group.countDocuments({ id: { $exists: true } });
        console.log(`\n📊 Found ${count} groups with invalid 'id' field`);

        if (count > 0) {
            console.log('🔧 Removing invalid id field from all groups...');
            const result = await Group.updateMany(
                {},
                { $unset: { id: "" } }
            );
            console.log(`✅ Updated ${result.modifiedCount} documents`);
        }

        // Verify cleanup
        const remaining = await Group.countDocuments({ id: { $exists: true } });
        console.log(`\n📊 Remaining groups with 'id' field: ${remaining}`);

        if (remaining === 0) {
            console.log('✅ All groups cleaned successfully');
        } else {
            console.log('⚠️  Some groups still have id field');
        }

        await mongoose.connection.close();
        console.log('\n✅ Cleanup complete');
        process.exit(0);
    })
    .catch(err => {
        console.error('❌ Error:', err.message);
        process.exit(1);
    });
