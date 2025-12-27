/**
 * Activity Endpoints Unit Tests
 *
 * These tests verify the functionality of:
 * - POST /api/activity/message (with groupId validation)
 * - POST /api/activity/file (with groupId validation)
 * - GET /api/activity/message (with group filtering)
 * - GET /api/activity/file (with group filtering)
 */

import request from "supertest";
import express from "express";
import mongoose from "mongoose";
import { MongoMemoryServer } from "mongodb-memory-server";
import admin from "firebase-admin";
import { Group, Message, ActivityFile } from "../models";
import syncRoutes from "../routes/sync";

const app = express();
app.use(express.json());
app.use("/api", syncRoutes);

let mongoServer: MongoMemoryServer;

// Mock Firebase Admin
const mockVerifyIdToken = jest.fn();
jest.mock("firebase-admin", () => {
  return {
    auth: jest.fn(() => ({
      verifyIdToken: mockVerifyIdToken,
    })),
    apps: { length: 1 },
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
  await Message.deleteMany({});
  await ActivityFile.deleteMany({});

  const { User } = await import("../models/User");
  await User.deleteMany({});

  // Create test users for resolution
  await User.create([
    { firebaseUid: "user-123", email: "user123@example.com", username: "user123", name: "User 123", role: "student" },
    { firebaseUid: "other-user-456", email: "other456@example.com", username: "other456", name: "Other User 456", role: "student" },
    { firebaseUid: "other-user", email: "other@example.com", username: "otheruser", name: "Other User", role: "student" },
    { firebaseUid: "admin-789", email: "admin789@example.com", username: "admin789", name: "Admin 789", role: "admin" },
    { firebaseUid: "user-1", email: "user1@example.com", username: "user1", name: "User 1", role: "student" },
    { firebaseUid: "user-2", email: "user2@example.com", username: "user2", name: "User 2", role: "student" },
    { firebaseUid: "admin", email: "admin@example.com", username: "admin", name: "Admin", role: "admin" },
    { firebaseUid: "admin-456", email: "admin456@example.com", username: "admin456", name: "Admin 456", role: "admin" }
  ]);

  jest.clearAllMocks();
});

describe("POST /api/activity/message", () => {
  it("should create message when user is group member", async () => {
    const userUid = "user-123";
    const adminUid = "admin-456";

    // Create group with user as member
    const User = (await import("../models/User")).User;
    const user = await User.findOne({ firebaseUid: userUid });
    if (!user) throw new Error(`User ${userUid} not found`);
    const group = await (Group as any).create({
      name: "Test Group",
      type: "single",
      members: [user._id],
      createdBy: new mongoose.Types.ObjectId(),
    });

    mockVerifyIdToken.mockResolvedValue({
      uid: userUid,
      email: "user@example.com",
    });

    const response = await request(app)
      .post("/api/activity/message")
      .set("Authorization", "Bearer valid-token")
      .send({
        activityId: "activity-123",
        groupId: group._id.toString(),
        text: "Hello world",
      });

    expect(response.status).toBe(200);
    expect(response.body.success).toBe(true);
    expect(response.body.message).toBeDefined();
    expect(response.body.message.groupId).toBe(group._id.toString());
    expect(response.body.message.text).toBe("Hello world");
  });

  it("should reject message when user is not group member", async () => {
    const userUid = "user-123";
    const otherUserUid = "other-user-456";
    const adminUid = "admin-789";

    // Create group with other user as member
    const User = (await import("../models/User")).User;
    const otherUser = await User.findOne({ firebaseUid: otherUserUid });
    if (!otherUser) throw new Error(`User ${otherUserUid} not found`);
    const group = await (Group as any).create({
      name: "Test Group",
      type: "single",
      members: [otherUser._id],
      createdBy: new mongoose.Types.ObjectId(),
    });

    mockVerifyIdToken.mockResolvedValue({
      uid: userUid,
      email: "user@example.com",
    });

    const response = await request(app)
      .post("/api/activity/message")
      .set("Authorization", "Bearer valid-token")
      .send({
        activityId: "activity-123",
        groupId: group._id.toString(),
        text: "Hello world",
      });

    expect(response.status).toBe(403);
    expect(response.body.success).toBe(false);
    expect(response.body.error).toContain("not a member");
  });

  it("should require groupId field", async () => {
    mockVerifyIdToken.mockResolvedValue({
      uid: "user-123",
      email: "user@example.com",
    });

    const response = await request(app)
      .post("/api/activity/message")
      .set("Authorization", "Bearer valid-token")
      .send({
        activityId: "activity-123",
        text: "Hello world",
      });

    expect(response.status).toBe(400);
    expect(response.body.success).toBe(false);
  });
});

describe("POST /api/activity/file", () => {
  it("should create file when user is group member", async () => {
    const userUid = "user-123";
    const adminUid = "admin-456";

    const User = (await import("../models/User")).User;
    const user = await User.findOne({ firebaseUid: userUid });
    if (!user) throw new Error(`User ${userUid} not found`);
    const group = await (Group as any).create({
      name: "Test Group",
      type: "single",
      members: [user._id],
      createdBy: new mongoose.Types.ObjectId(),
    });

    mockVerifyIdToken.mockResolvedValue({
      uid: userUid,
      email: "user@example.com",
    });

    const response = await request(app)
      .post("/api/activity/file")
      .set("Authorization", "Bearer valid-token")
      .send({
        activityId: "activity-123",
        groupId: group._id.toString(),
        filename: "document.pdf",
        url: "https://example.com/doc.pdf",
        uploadedByUid: userUid,
      });

    expect(response.status).toBe(200);
    expect(response.body.success).toBe(true);
    expect(response.body.file).toBeDefined();
    expect(response.body.file.groupId).toBe(group._id.toString());
  });

  it("should reject file when user is not group member", async () => {
    const userUid = "user-123";
    const otherUserUid = "other-user-456";
    const adminUid = "admin-789";

    const User = (await import("../models/User")).User;
    const otherUser = await User.findOne({ firebaseUid: otherUserUid });
    if (!otherUser) throw new Error(`User ${otherUserUid} not found`);
    const group = await (Group as any).create({
      name: "Test Group",
      type: "single",
      members: [otherUser._id],
      createdBy: new mongoose.Types.ObjectId(),
    });

    mockVerifyIdToken.mockResolvedValue({
      uid: userUid,
      email: "user@example.com",
    });

    const response = await request(app)
      .post("/api/activity/file")
      .set("Authorization", "Bearer valid-token")
      .send({
        activityId: "activity-123",
        groupId: group._id.toString(),
        filename: "document.pdf",
        url: "https://example.com/doc.pdf",
        uploadedByUid: userUid,
      });

    expect(response.status).toBe(403);
    expect(response.body.success).toBe(false);
  });
});

describe("GET /api/activity/message", () => {
  it("should return only messages from user's groups", async () => {
    const user1Uid = "user-1";
    const user2Uid = "user-2";
    const adminUid = "admin";

    // Create groups
    const { User } = await import("../models/User");
    const user1 = await User.findOne({ firebaseUid: user1Uid });
    const user2 = await User.findOne({ firebaseUid: user2Uid });
    if (!user1 || !user2) throw new Error("Users not found");

    const group1 = await (Group as any).create({
      name: "Group 1",
      type: "single",
      members: [user1._id],
      createdBy: new mongoose.Types.ObjectId(),
    });

    const group2 = await (Group as any).create({
      name: "Group 2",
      type: "single",
      members: [user2._id],
      createdBy: new mongoose.Types.ObjectId(),
    });

    // Create messages in both groups
    await Message.create({
      activityId: "activity-1",
      groupId: group1._id.toString(),
      text: "Message in group 1",
      senderUid: user1Uid,
    });

    await Message.create({
      activityId: "activity-2",
      groupId: group2._id.toString(),
      text: "Message in group 2",
      senderUid: user2Uid,
    });

    mockVerifyIdToken.mockResolvedValue({
      uid: user1Uid,
      email: "user1@example.com",
    });

    const response = await request(app)
      .get("/api/activity/message")
      .set("Authorization", "Bearer valid-token");

    expect(response.status).toBe(200);
    expect(response.body.success).toBe(true);
    expect(response.body.messages).toHaveLength(1);
    expect(response.body.messages[0].groupId).toBe(group1._id.toString());
  });

  it("should filter by specific groupId if user is member", async () => {
    const userUid = "user-123";
    const adminUid = "admin-456";

    const { User } = await import("../models/User");
    const user = await User.findOne({ firebaseUid: userUid });
    if (!user) throw new Error(`User ${userUid} not found`);

    const group1 = await (Group as any).create({
      name: "Group 1",
      type: "single",
      members: [user._id],
      createdBy: new mongoose.Types.ObjectId(),
    });

    const group2 = await (Group as any).create({
      name: "Group 2",
      type: "single",
      members: [user._id],
      createdBy: new mongoose.Types.ObjectId(),
    });

    await Message.create({
      activityId: "activity-1",
      groupId: group1._id.toString(),
      text: "Message 1",
      senderUid: userUid,
    });

    await Message.create({
      activityId: "activity-2",
      groupId: group2._id.toString(),
      text: "Message 2",
      senderUid: userUid,
    });

    mockVerifyIdToken.mockResolvedValue({
      uid: userUid,
      email: "user@example.com",
    });

    const response = await request(app)
      .get(`/api/activity/message?groupId=${group1._id.toString()}`)
      .set("Authorization", "Bearer valid-token");

    expect(response.status).toBe(200);
    expect(response.body.messages).toHaveLength(1);
    expect(response.body.messages[0].groupId).toBe(group1._id.toString());
  });

  it("should reject query for non-member group", async () => {
    const userUid = "user-123";
    const otherUserUid = "other-user";
    const adminUid = "admin-456";

    const { User } = await import("../models/User");
    const otherUser = await User.findOne({ firebaseUid: otherUserUid });
    if (!otherUser) throw new Error(`User ${otherUserUid} not found`);

    const group = await (Group as any).create({
      name: "Other Group",
      type: "single",
      members: [otherUser._id],
      createdBy: new mongoose.Types.ObjectId(),
    });

    mockVerifyIdToken.mockResolvedValue({
      uid: userUid,
      email: "user@example.com",
    });

    const response = await request(app)
      .get(`/api/activity/message?groupId=${group._id.toString()}`)
      .set("Authorization", "Bearer valid-token");

    expect(response.status).toBe(403);
    expect(response.body.success).toBe(false);
  });
});

describe("GET /api/activity/file", () => {
  it("should return only files from user's groups", async () => {
    const user1Uid = "user-1";
    const user2Uid = "user-2";
    const adminUid = "admin";

    const { User } = await import("../models/User");
    const user1 = await User.findOne({ firebaseUid: user1Uid });
    const user2 = await User.findOne({ firebaseUid: user2Uid });
    if (!user1 || !user2) throw new Error("Users not found");

    const group1 = await (Group as any).create({
      name: "Group 1",
      type: "single",
      members: [user1._id],
      createdBy: new mongoose.Types.ObjectId(),
    });

    const group2 = await (Group as any).create({
      name: "Group 2",
      type: "single",
      members: [user2._id],
      createdBy: new mongoose.Types.ObjectId(),
    });

    await ActivityFile.create({
      activityId: "activity-1",
      groupId: group1._id.toString(),
      filename: "file1.pdf",
      url: "https://example.com/file1.pdf",
      uploadedByUid: user1Uid,
    });

    await ActivityFile.create({
      activityId: "activity-2",
      groupId: group2._id.toString(),
      filename: "file2.pdf",
      url: "https://example.com/file2.pdf",
      uploadedByUid: user2Uid,
    });

    mockVerifyIdToken.mockResolvedValue({
      uid: user1Uid,
      email: "user1@example.com",
    });

    const response = await request(app)
      .get("/api/activity/file")
      .set("Authorization", "Bearer valid-token");

    expect(response.status).toBe(200);
    expect(response.body.success).toBe(true);
    expect(response.body.files).toHaveLength(1);
    expect(response.body.files[0].groupId).toBe(group1._id.toString());
  });

  it("should support pagination", async () => {
    const userUid = "user-123";
    const adminUid = "admin-456";

    const { User } = await import("../models/User");
    const user = await User.findOne({ firebaseUid: userUid });
    if (!user) throw new Error(`User ${userUid} not found`);

    const group = await (Group as any).create({
      name: "Test Group",
      type: "single",
      members: [user._id],
      createdBy: new mongoose.Types.ObjectId(),
    });

    // Create 5 files
    for (let i = 0; i < 5; i++) {
      await ActivityFile.create({
        activityId: `activity-${i}`,
        groupId: group._id.toString(),
        filename: `file${i}.pdf`,
        url: `https://example.com/file${i}.pdf`,
        uploadedByUid: userUid,
      });
    }

    mockVerifyIdToken.mockResolvedValue({
      uid: userUid,
      email: "user@example.com",
    });

    const response = await request(app)
      .get("/api/activity/file?limit=2&skip=0")
      .set("Authorization", "Bearer valid-token");

    expect(response.status).toBe(200);
    expect(response.body.files).toHaveLength(2);
    expect(response.body.pagination.total).toBe(5);
    expect(response.body.pagination.hasMore).toBe(true);
  });
});
