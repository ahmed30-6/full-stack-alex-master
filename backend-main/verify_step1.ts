import mongoose from "mongoose";
import { User, Group } from "./models";
import { MongoMemoryServer } from "mongodb-memory-server";

async function verify() {
    const mongoServer = await MongoMemoryServer.create();
    const mongoUri = mongoServer.getUri();
    await mongoose.connect(mongoUri);

    console.log("Connected to in-memory database.");

    try {
        // 0. Setup: Create a dummy group
        // Using any to bypass strict type check for the sake of simple validation
        const dummyGroup: any = await Group.create({
            name: "Test Group",
            type: "single",
            members: [new mongoose.Types.ObjectId()], // Dummy member
            createdBy: new mongoose.Types.ObjectId(), // Dummy admin
            level: "beginner"
        } as any);
        const groupId = dummyGroup._id;
        console.log(`Created dummy group with ID: ${groupId}`);

        // 1. Tries to create a student without groupId (must fail)
        console.log("\nTest 1: Create student without groupId...");
        try {
            const student1 = new User({
                firebaseUid: "student1",
                username: "student1",
                name: "Student One",
                email: "student1@example.com",
                role: "student"
            });
            await student1.save();
            console.error("FAIL: Student created without groupId, but should have failed.");
        } catch (error: any) {
            console.log("SUCCESS: Caught expected validation error:", error.message);
        }

        // 2. Tries to create a student with groupId (must succeed)
        console.log("\nTest 2: Create student with groupId...");
        try {
            const student2 = new User({
                firebaseUid: "student2",
                username: "student2",
                name: "Student Two",
                email: "student2@example.com",
                role: "student",
                groupId: groupId
            } as any);
            const savedStudent = await student2.save();
            console.log("SUCCESS: Student created with groupId:", savedStudent._id);
        } catch (error: any) {
            console.error("FAIL: Could not create student with groupId:", error.message);
        }

        // 3. Tries to create an admin without groupId (must succeed)
        console.log("\nTest 3: Create admin without groupId...");
        try {
            const admin1 = new User({
                firebaseUid: "admin1",
                username: "admin1",
                name: "Admin One",
                email: "admin1@example.com",
                role: "admin"
            });
            const savedAdmin = await admin1.save();
            console.log("SUCCESS: Admin created without groupId:", savedAdmin._id);
        } catch (error: any) {
            console.error("FAIL: Could not create admin without groupId:", error.message);
        }

    } finally {
        await mongoose.disconnect();
        await mongoServer.stop();
        console.log("\nVerification complete.");
    }
}

verify().catch(console.error);
