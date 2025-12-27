import request from "supertest";
import express from "express";
import mongoose from "mongoose";
import { MongoMemoryServer } from "mongodb-memory-server";
import { Group } from "../models";
import groupRoutes from "../routes/groups";

const app = express();
app.use(express.json());
app.use("/api/groups", groupRoutes);

let mongoServer: MongoMemoryServer;

// Mock Firebase Admin
const mockVerifyIdToken = jest.fn();
jest.mock("firebase-admin", () => {
    return {
        auth: jest.fn(() => ({
            verifyIdToken: mockVerifyIdToken,
        })),
        apps: { length: 1 },
        credential: { cert: jest.fn() },
        initializeApp: jest.fn(),
    };
});

beforeAll(async () => {
    mongoServer = await MongoMemoryServer.create();
    await mongoose.connect(mongoServer.getUri());
}, 30000);

afterAll(async () => {
    await mongoose.connection.dropDatabase();
    await mongoose.connection.close();
    await mongoServer.stop();
}, 30000);

beforeEach(async () => {
    await Group.deleteMany({});
    const { User } = await import("../models/User");
    await User.deleteMany({});

    // 1. Create a dummy group for bootstrapping (Cast to any to bypass TS Strict checks in tests)
    const dummyGroup = await (Group as any).create({
        name: "Initial Group",
        createdBy: new mongoose.Types.ObjectId()
    });

    // 2. Create admin and student
    await User.create([
        {
            firebaseUid: "admin-uid",
            email: "admin@example.com",
            username: "admin",
            name: "Admin User",
            role: "admin",
            status: "active"
        },
        {
            firebaseUid: "student-uid",
            email: "student@example.com",
            username: "student",
            name: "Student User",
            role: "student",
            status: "active",
            groupId: (dummyGroup as any)._id
        }
    ]);

    process.env.ADMIN_EMAIL = "admin@example.com";
    jest.clearAllMocks();
});

describe("Create Group Fix Verification", () => {
    const adminUid = "admin-uid";
    const adminEmail = "admin@example.com";
    const studentUid = "student-uid";

    it("should create an empty group even if members are provided in request", async () => {
        mockVerifyIdToken.mockResolvedValue({
            uid: adminUid,
            email: adminEmail,
        });

        const response = await request(app)
            .post("/api/groups")
            .set("Authorization", "Bearer token")
            .send({
                name: "Empty Group Test",
                type: "single",
                level: "beginner",
                members: [studentUid] // Should be ignored
            });

        expect(response.status).toBe(201);
        expect(response.body.success).toBe(true);
        expect(response.body.group.members).toHaveLength(0); // VERIFIED: members ignored

        const groupInDb = await Group.findById(response.body.group.id);
        expect(groupInDb?.members).toHaveLength(0);
    });

    it("should allow creating a group with no members provided", async () => {
        mockVerifyIdToken.mockResolvedValue({
            uid: adminUid,
            email: adminEmail,
        });

        const response = await request(app)
            .post("/api/groups")
            .set("Authorization", "Bearer token")
            .send({
                name: "No Members Provided",
                level: "intermediate"
            });

        expect(response.status).toBe(201);
        expect(response.body.group.name).toBe("No Members Provided");
        expect(response.body.group.members).toHaveLength(0);
    });

    it("should successfully add a member via the separate members endpoint", async () => {
        mockVerifyIdToken.mockResolvedValue({
            uid: adminUid,
            email: adminEmail,
        });

        // 1. Create group
        const createRes = await request(app)
            .post("/api/groups")
            .set("Authorization", "Bearer token")
            .send({ name: "Add Member Test" });

        const groupId = createRes.body.group.id;

        // 2. Add member
        const addRes = await request(app)
            .post(`/api/groups/${groupId}/members`)
            .set("Authorization", "Bearer token")
            .send({ userId: studentUid });

        expect(addRes.status).toBe(200);
        expect(addRes.body.success).toBe(true);

        // 3. Verify in DB
        const { User } = await import("../models/User");
        const updatedStudent = await User.findOne({ firebaseUid: studentUid });
        expect(updatedStudent?.groupId?.toString()).toBe((groupId as string));

        const updatedGroup = await Group.findById(groupId);
        const studentDoc = await User.findOne({ firebaseUid: studentUid });
        expect(updatedGroup?.members.map(m => m.toString())).toContain(studentDoc?._id.toString());
    });
});
