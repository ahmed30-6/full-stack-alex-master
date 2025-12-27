/**
 * Group Endpoints Unit Tests
 *
 * These tests verify the functionality of:
 * - POST /api/groups (admin-only group creation)
 * - GET /api/groups (admin-only group retrieval with pagination)
 *
 * Tests cover:
 * - Group creation with valid data
 * - Single-member validation rejection
 * - Admin-only access control
 * - Group retrieval with pagination
 */

import request from "supertest";
import express from "express";
import mongoose from "mongoose";
import { MongoMemoryServer } from "mongodb-memory-server";
import admin from "firebase-admin";
import { Group } from "../models";
import groupRoutes from "../routes/groups";

// Create Express app for testing
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
    apps: { length: 1 }, // Simulate initialized Firebase
    credential: {
      cert: jest.fn(),
    },
    initializeApp: jest.fn(),
  };
});

beforeAll(async () => {
  mongoServer = await MongoMemoryServer.create();
  const mongoUri = mongoServer.getUri();
  await mongoose.connect(mongoUri);
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

  // Create admin and student users for resolution tests
  await User.create([
    {
      firebaseUid: "admin-uid-123",
      email: "admin-ge@example.com",
      username: "admin",
      name: "Admin User",
      role: "admin"
    },
    {
      firebaseUid: "student-uid-456",
      email: "student-ge@example.com",
      username: "student",
      name: "Student User",
      role: "student"
    },
    { firebaseUid: "user1", email: "user1@example.com", username: "user1", name: "User 1", role: "student" },
    { firebaseUid: "user2", email: "user2@example.com", username: "user2", name: "User 2", role: "student" },
    { firebaseUid: "user3", email: "user3@example.com", username: "user3", name: "User 3", role: "student" }
  ]);

  jest.clearAllMocks();
});

describe("POST /api/groups", () => {
  const adminEmail = "admin-ge@example.com";
  const studentEmail = "student-ge@example.com";
  const adminUid = "admin-uid-123";
  const studentUid = "student-uid-456";

  beforeEach(() => {
    process.env.ADMIN_EMAIL = adminEmail;
  });

  it("should create a group with valid data (admin)", async () => {
    // Mock admin token verification
    mockVerifyIdToken.mockResolvedValue({
      uid: adminUid,
      email: adminEmail,
    });

    const response = await request(app)
      .post("/api/groups")
      .set("Authorization", "Bearer valid-admin-token")
      .send({
        name: "Test Group",
        type: "single",
        members: [studentUid],
        level: "beginner",
      });

    expect(response.status).toBe(201);
    expect(response.body.success).toBe(true);
    expect(response.body.group).toBeDefined();
    expect(response.body.group.name).toBe("Test Group");
    expect(response.body.group.type).toBe("single");
    expect(response.body.group.level).toBe("beginner");
    const adminUser = await (await import("../models/User")).User.findOne({ firebaseUid: adminUid });
    expect(response.body.group.createdBy).toBe(adminUser?._id.toString());
  });

  it("should reject single-type group with zero members", async () => {
    mockVerifyIdToken.mockResolvedValue({
      uid: adminUid,
      email: adminEmail,
    });

    const response = await request(app)
      .post("/api/groups")
      .set("Authorization", "Bearer valid-admin-token")
      .send({
        name: "Invalid Group",
        type: "single",
        members: [],
      });

    expect(response.status).toBe(400);
    expect(response.body.success).toBe(false);
    expect(response.body.error).toBeDefined();
  });

  it("should reject single-type group with multiple members", async () => {
    mockVerifyIdToken.mockResolvedValue({
      uid: adminUid,
      email: adminEmail,
    });

    const response = await request(app)
      .post("/api/groups")
      .set("Authorization", "Bearer valid-admin-token")
      .send({
        name: "Invalid Group",
        type: "single",
        members: ["user1", "user2"],
      });

    expect(response.status).toBe(400);
    expect(response.body.success).toBe(false);
    expect(response.body.error.message).toBe("Validation failed");
    expect(response.body.error.details).toBeDefined();
    expect(response.body.error.details.length).toBeGreaterThan(0);
  });

  it("should accept multi-type group with multiple members", async () => {
    mockVerifyIdToken.mockResolvedValue({
      uid: adminUid,
      email: adminEmail,
    });

    const response = await request(app)
      .post("/api/groups")
      .set("Authorization", "Bearer valid-admin-token")
      .send({
        name: "Multi Group",
        type: "multi",
        members: ["user1", "user2", "user3"],
        level: "intermediate",
      });

    expect(response.status).toBe(201);
    expect(response.body.success).toBe(true);
    expect(response.body.group.type).toBe("multi");
    expect(response.body.group.members).toHaveLength(3);
  });

  it("should reject request without authentication", async () => {
    const response = await request(app)
      .post("/api/groups")
      .send({
        name: "Test Group",
        type: "single",
        members: ["user1"],
      });

    expect(response.status).toBe(401);
    expect(response.body.error).toBe("Authentication required");
  });

  it("should reject request with invalid token", async () => {
    mockVerifyIdToken.mockRejectedValue(new Error("Invalid token"));

    const response = await request(app)
      .post("/api/groups")
      .set("Authorization", "Bearer invalid-token")
      .send({
        name: "Test Group",
        type: "single",
        members: ["user1"],
      });

    expect(response.status).toBe(401);
    expect(response.body.error).toBe("Invalid auth token");
  });

  it("should reject non-admin user", async () => {
    mockVerifyIdToken.mockResolvedValue({
      uid: studentUid,
      email: studentEmail,
    });

    const response = await request(app)
      .post("/api/groups")
      .set("Authorization", "Bearer valid-student-token")
      .send({
        name: "Test Group",
        type: "single",
        members: ["user1"],
      });

    expect(response.status).toBe(403);
    expect(response.body.success).toBe(false);
    expect(response.body.error).toBe("Forbidden: Admin access required");
  });

  it("should default to single type if not specified", async () => {
    mockVerifyIdToken.mockResolvedValue({
      uid: adminUid,
      email: adminEmail,
    });

    const response = await request(app)
      .post("/api/groups")
      .set("Authorization", "Bearer valid-admin-token")
      .send({
        name: "Default Type Group",
        members: [studentUid],
      });

    expect(response.status).toBe(201);
    expect(response.body.group.type).toBe("single");
  });
});

describe("GET /api/groups", () => {
  const adminEmail = "admin-ge@example.com";
  const studentEmail = "student-ge@example.com";
  const adminUid = "admin-uid-123";
  const studentUid = "student-uid-456";

  beforeEach(() => {
    process.env.ADMIN_EMAIL = adminEmail;
  });

  it("should return all groups for admin", async () => {
    // Create test groups
    await (Group as any).create([
      {
        name: "Group 1",
        type: "single",
        members: [new mongoose.Types.ObjectId() as any],
        level: "beginner",
        createdBy: new mongoose.Types.ObjectId() as any,
      },
      {
        name: "Group 2",
        type: "single",
        members: [new mongoose.Types.ObjectId() as any],
        level: "beginner",
        createdBy: new mongoose.Types.ObjectId() as any,
      },
      {
        name: "Group 3",
        type: "multi",
        members: [new mongoose.Types.ObjectId() as any, new mongoose.Types.ObjectId() as any],
        level: "intermediate",
        createdBy: new mongoose.Types.ObjectId() as any,
      },
    ]);

    mockVerifyIdToken.mockResolvedValue({
      uid: adminUid,
      email: adminEmail,
    });

    const response = await request(app)
      .get("/api/groups")
      .set("Authorization", "Bearer valid-admin-token");

    expect(response.status).toBe(200);
    expect(response.body.success).toBe(true);
    expect(response.body.groups).toHaveLength(3);
    expect(response.body.pagination.total).toBe(3);
  });

  it("should filter groups by type", async () => {
    const { User } = await import("../models/User");
    const adminUser = await User.findOne({ firebaseUid: adminUid });
    if (!adminUser) throw new Error("Admin user not found");

    await (Group as any).create([
      {
        name: "Single Group 1",
        type: "single",
        members: [new mongoose.Types.ObjectId()],
        level: "beginner",
        createdBy: adminUser._id,
      },
      {
        name: "Single Group 2",
        type: "single",
        members: [new mongoose.Types.ObjectId()],
        level: "beginner",
        createdBy: adminUser._id,
      },
      {
        name: "Multi Group",
        type: "multi",
        members: [new mongoose.Types.ObjectId(), new mongoose.Types.ObjectId()],
        level: "intermediate",
        createdBy: adminUser._id,
      },
    ]);

    mockVerifyIdToken.mockResolvedValue({
      uid: adminUid,
      email: adminEmail,
    });

    const response = await request(app)
      .get("/api/groups?type=single")
      .set("Authorization", "Bearer valid-admin-token");

    expect(response.status).toBe(200);
    expect(response.body.groups).toHaveLength(2);
    expect(response.body.groups.every((g: any) => g.type === "single")).toBe(
      true
    );
  });

  it("should filter groups by level", async () => {
    const { User } = await import("../models/User");
    const adminUser = await User.findOne({ firebaseUid: adminUid });
    if (!adminUser) throw new Error("Admin user not found");

    await (Group as any).create([
      {
        name: "Group 1",
        type: "single",
        members: [new mongoose.Types.ObjectId()],
        level: "beginner",
        createdBy: adminUser._id,
      },
      {
        name: "Group 2",
        type: "single",
        members: [new mongoose.Types.ObjectId()],
        level: "beginner",
        createdBy: adminUser._id,
      },
      {
        name: "Group 3",
        type: "single",
        members: [new mongoose.Types.ObjectId()],
        level: "intermediate",
        createdBy: adminUser._id,
      },
      {
        name: "Group 4",
        type: "single",
        members: [new mongoose.Types.ObjectId()],
        level: "intermediate",
        createdBy: adminUser._id,
      },
      {
        name: "Group 5",
        type: "single",
        members: [new mongoose.Types.ObjectId()],
        level: "advanced",
        createdBy: adminUser._id,
      },
    ]);

    mockVerifyIdToken.mockResolvedValue({
      uid: adminUid,
      email: adminEmail,
    });

    const response = await request(app)
      .get("/api/groups?level=beginner")
      .set("Authorization", "Bearer valid-admin-token");

    expect(response.status).toBe(200);
    expect(response.body.groups).toHaveLength(2); // Changed from 1 to 2 based on the new data
    expect(response.body.groups[0].level).toBe("beginner");
  });

  it("should paginate results correctly", async () => {
    // Create 15 groups
    const { User } = await import("../models/User");
    const adminUser = await User.findOne({ firebaseUid: adminUid });
    if (!adminUser) throw new Error("Admin user not found");

    const groups = Array.from({ length: 15 }, (_, i) => ({
      name: `Group ${i + 1}`,
      type: "single" as const,
      members: [new mongoose.Types.ObjectId()],
      level: "beginner",
      createdBy: adminUser._id,
    }));
    await (Group as any).create(groups);

    mockVerifyIdToken.mockResolvedValue({
      uid: adminUid,
      email: adminEmail,
    });

    // Get first page
    const response1 = await request(app)
      .get("/api/groups?limit=10&skip=0")
      .set("Authorization", "Bearer valid-admin-token");

    expect(response1.status).toBe(200);
    expect(response1.body.groups).toHaveLength(10);
    expect(response1.body.pagination.total).toBe(15);
    expect(response1.body.pagination.hasMore).toBe(true);

    // Get second page
    const response2 = await request(app)
      .get("/api/groups?limit=10&skip=10")
      .set("Authorization", "Bearer valid-admin-token");

    expect(response2.status).toBe(200);
    expect(response2.body.groups).toHaveLength(5);
    expect(response2.body.pagination.hasMore).toBe(false);
  });

  it("should reject request without authentication", async () => {
    const response = await request(app).get("/api/groups");

    expect(response.status).toBe(401);
    expect(response.body.error).toBe("Authentication required");
  });

  it("should reject non-admin user", async () => {
    mockVerifyIdToken.mockResolvedValue({
      uid: studentUid,
      email: studentEmail,
    });

    const response = await request(app)
      .get("/api/groups")
      .set("Authorization", "Bearer valid-student-token");

    expect(response.status).toBe(403);
    expect(response.body.error).toBe("Forbidden: Admin access required");
  });

  it("should return empty array when no groups exist", async () => {
    mockVerifyIdToken.mockResolvedValue({
      uid: adminUid,
      email: adminEmail,
    });

    const response = await request(app)
      .get("/api/groups")
      .set("Authorization", "Bearer valid-admin-token");

    expect(response.status).toBe(200);
    expect(response.body.groups).toHaveLength(0);
    expect(response.body.pagination.total).toBe(0);
  });
});
