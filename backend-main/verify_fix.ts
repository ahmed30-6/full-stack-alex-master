import axios from "axios";
import mongoose from "mongoose";
import dotenv from "dotenv";
import { User, Group } from "./models";

dotenv.config();

const API_BASE = "http://localhost:5001/api";

async function verifyFix() {
    console.log("🚀 Starting verification of Create Group fix...");

    try {
        // 1. Setup Database state
        await mongoose.connect(process.env.MONGO_URI as string);
        console.log("✅ Connected to MongoDB");

        const adminEmail = process.env.ADMIN_EMAIL;
        const adminUser = await User.findOne({ email: adminEmail });
        if (!adminUser) throw new Error("Admin user not found in DB");

        // Clear previous test groups
        await Group.deleteMany({ name: /^TEST_GROUP_/ });

        // Ensure we have a student for testing
        let student = await User.findOne({ role: "student" });
        if (!student) {
            student = await User.create({
                firebaseUid: "test-student-uid",
                email: "student-test@example.com",
                username: "teststudent",
                name: "Test Student",
                role: "student",
                status: "active"
            }) as any;
        }
        // Remove student from any group
        student!.groupId = undefined;
        await student!.save();
        console.log("✅ Test student prepared:", student!.email);

        // 2. Create Group with no members (Should succeed now)
        console.log("📝 Attempting to create an empty group...");

        // We need a token. For the sake of this script, we assume the server is running 
        // and we can bypass auth or we use a real token.
        // Since I can't easily get a real Firebase token here, I will test the logic 
        // by calling the route handler logic OR I will try to use a mock token if the server allows it.
        // Actually, I'll just check if I can run the existing tests with modifications.

        console.log("ℹ️  Note: This script requires a running server and valid admin token.");
        console.log("ℹ️  Switching to JEST verification for automated reliable testing.");

    } catch (err) {
        console.error("❌ Verification failed:", err);
    } finally {
        await mongoose.disconnect();
    }
}

// verifyFix();
