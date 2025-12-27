import mongoose from "mongoose";
import { User, Group } from "./models";
import { GroupService } from "./services/GroupService";
import { MongoMemoryServer } from "mongodb-memory-server";

async function verify() {
    const mongoServer = await MongoMemoryServer.create();
    const mongoUri = mongoServer.getUri();
    await mongoose.connect(mongoUri);

    console.log("Connected to in-memory database.");

    try {
        // 1. Create a user (role: admin to bypass groupId requirement for now)
        const student: any = await User.create({
            firebaseUid: "student_step2",
            username: "student_step2",
            name: "Step 2 Student",
            email: "student_step2@example.com",
            role: "admin" // Bypassing Step 1 student requirement for testing Step 2 logic
        } as any);
        console.log(`Created user: ${student._id}`);

        // 2. Create Group A and Group B
        const groupA: any = new Group({
            name: "Group A",
            type: "single",
            members: [],
            createdBy: new mongoose.Types.ObjectId(),
            level: "beginner"
        } as any);
        await groupA.save({ validateBeforeSave: false });

        const groupB: any = new Group({
            name: "Group B",
            type: "single",
            members: [],
            createdBy: new mongoose.Types.ObjectId(),
            level: "beginner"
        } as any);
        await groupB.save({ validateBeforeSave: false });

        console.log(`Created Group A: ${groupA._id}`);
        console.log(`Created Group B: ${groupB._id}`);

        // 3. Assign student to Group A (should succeed)
        console.log("\nAttempting to assign student to Group A...");
        await GroupService.assignUserToGroup(student._id, groupA._id);
        console.log("SUCCESS: Student assigned to Group A.");

        // Refresh student and Group A
        const updatedStudent: any = await User.findById(student._id);
        const updatedGroupA: any = await Group.findById(groupA._id);

        console.log(`Student.groupId: ${updatedStudent?.groupId}`);
        console.log(`Group A members: ${updatedGroupA?.members}`);

        if (updatedStudent?.groupId?.toString() !== groupA._id.toString()) {
            throw new Error("Verification failed: student.groupId mismatch");
        }
        if (!updatedGroupA?.members.some((m: any) => m.toString() === student._id.toString())) {
            throw new Error("Verification failed: student not in groupA.members");
        }

        // 4. Attempt to assign the same student to Group B (must fail)
        console.log("\nAttempting to assign same student to Group B...");
        try {
            await GroupService.assignUserToGroup(student._id, groupB._id);
            console.error("FAIL: Should have thrown an error for double assignment!");
        } catch (error: any) {
            console.log("SUCCESS: Caught expected error:", error.message);
        }

        // 5. Final check of state
        const finalStudent: any = await User.findById(student._id);
        const finalGroupB: any = await Group.findById(groupB._id);

        console.log(`\nFinal check:`);
        console.log(`Student.groupId is still Group A: ${finalStudent?.groupId?.toString() === groupA._id.toString()}`);
        console.log(`Group B members is still empty: ${finalGroupB?.members.length === 0}`);

        if (finalStudent?.groupId?.toString() !== groupA._id.toString()) {
            throw new Error("Verification failed: student switched groups!");
        }
        if (finalGroupB?.members.length !== 0) {
            throw new Error("Verification failed: student added to Group B members!");
        }

    } finally {
        await mongoose.disconnect();
        await mongoServer.stop();
        console.log("\nVerification complete.");
    }
}

verify().catch(console.error);
