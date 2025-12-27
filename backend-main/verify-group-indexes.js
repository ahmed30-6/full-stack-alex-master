// MongoDB Index Verification Script
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
        console.log('📊 Database:', mongoose.connection.name);

        const Group = mongoose.connection.collection('groups');

        console.log('\n=== GROUP INDEXES ===');
        const indexes = await Group.indexes();
        console.log('Current indexes:');
        indexes.forEach((idx, i) => {
            console.log(`${i + 1}. ${JSON.stringify(idx.key)} - name: ${idx.name}`);
        });

        // Check for invalid 'id' index
        const hasIdIndex = indexes.some(idx => idx.name === 'id_1' || idx.key.id);

        if (hasIdIndex) {
            console.log('\n⚠️  FOUND INVALID INDEX: id_1');
            console.log('🔧 Attempting to drop...');
            try {
                await Group.dropIndex('id_1');
                console.log('✅ Dropped id_1 index');
            } catch (err) {
                console.log('⚠️  Could not drop id_1:', err.message);
            }
        } else {
            console.log('\n✅ No invalid id_1 index found');
        }

        // Verify sample documents
        console.log('\n=== SAMPLE DOCUMENTS ===');
        const samples = await Group.find({}).limit(3).toArray();
        console.log(`Found ${samples.length} groups`);
        samples.forEach((g, i) => {
            console.log(`\n${i + 1}. ${g.name}`);
            console.log('   Fields:', Object.keys(g).join(', '));
            console.log('   Has _id:', !!g._id);
            console.log('   Has id:', !!g.id);
            console.log('   Has groupId:', !!g.groupId);
        });

        await mongoose.connection.close();
        console.log('\n✅ Verification complete');
        process.exit(0);
    })
    .catch(err => {
        console.error('❌ Error:', err.message);
        process.exit(1);
    });
