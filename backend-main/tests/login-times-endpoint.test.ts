/**
 * Login Times Endpoint Unit Tests
 *
 * These tests verify the functionality of:
 * - GET /api/login-times/:uid (admin-only)
 */

import request from "supertest";
import express from "express";
import mongoose from "mongoose";
import { MongoMemoryServer } from "mongodb-memory-server";
import admin from "firebase-admin";
import { User } from "../models";
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
  await User.deleteMany({});
  jest.clearAllMocks();
  process.env.ADMIN_EMAIL = "admin@example.com";
});

describe("GET /api/login-times/:uid", () => {
  it("should return login times when admin requests", async () => {
    const userUid = "user-123";
    const loginTimes = [
      new Date("2024-01-01T10:00:00Z"),
      new Date("2024-01-02T11:00:00Z"),
      new Date("2024-01-03T12:00:00Z"),
    ];

    // Create user with login times
    await User.create({
      firebaseUid: userUid,
      username: "testuser",
      email: "user@example.com",
      name: "Test User",
      role: "student",
      loginTimes,
    });

    mockVerifyIdToken.mockResolvedValue({
      uid: "admin-uid",
      email: "admin@example.com",
    });

    const response = await request(app)
      .get(`/api/login-times/${userUid}`)
      .set("Authorization", "Bearer admin-token");

    expect(response.status).toBe(200);
    expect(response.body.success).toBe(true);
    expect(response.body.user).toBeDefined();
    expect(response.body.user.firebaseUid).toBe(userUid);
    expect(response.body.loginTimes).toHaveLength(3);
  });

  it("should return login times in chronological order", async () => {
    const userUid = "user-123";
    const loginTimes = [
      new Date("2024-01-03T12:00:00Z"),
      new Date("2024-01-01T10:00:00Z"),
      new Date("2024-01-02T11:00:00Z"),
    ];

    await User.create({
      firebaseUid: userUid,
      username: "testuser",
      email: "user@example.com",
      name: "Test User",
      role: "student",
      loginTimes,
    });

    mockVerifyIdToken.mockResolvedValue({
      uid: "admin-uid",
      email: "admin@example.com",
    });

    const response = await request(app)
      .get(`/api/login-times/${userUid}`)
      .set("Authorization", "Bearer admin-token");

    expect(response.status).toBe(200);
    const returnedTimes = response.body.loginTimes.map((t: string) =>
      new Date(t).getTime()
    );

    // Verify chronological order
    for (let i = 1; i < returnedTimes.length; i++) {
      expect(returnedTimes[i]).toBeGreaterThanOrEqual(returnedTimes[i - 1]);
    }
  });

  it("should reject non-admin user", async () => {
    const userUid = "user-123";

    await User.create({
      firebaseUid: userUid,
      username: "testuser",
      email: "user@example.com",
      name: "Test User",
      role: "student",
      loginTimes: [new Date()],
    });

    mockVerifyIdToken.mockResolvedValue({
      uid: "student-uid",
      email: "student@example.com",
    });

    const response = await request(app)
      .get(`/api/login-times/${userUid}`)
      .set("Authorization", "Bearer student-token");

    expect(response.status).toBe(403);
    expect(response.body.success).toBe(false);
    expect(response.body.error).toContain("Admin access required");
  });

  it("should return 404 for non-existent user", async () => {
    mockVerifyIdToken.mockResolvedValue({
      uid: "admin-uid",
      email: "admin@example.com",
    });

    const response = await request(app)
      .get("/api/login-times/non-existent-uid")
      .set("Authorization", "Bearer admin-token");

    expect(response.status).toBe(404);
    expect(response.body.success).toBe(false);
    expect(response.body.error).toContain("User not found");
  });

  it("should handle empty loginTimes array", async () => {
    const userUid = "user-123";

    await User.create({
      firebaseUid: userUid,
      username: "testuser",
      email: "user@example.com",
      name: "Test User",
      role: "student",
      loginTimes: [],
    });

    mockVerifyIdToken.mockResolvedValue({
      uid: "admin-uid",
      email: "admin@example.com",
    });

    const response = await request(app)
      .get(`/api/login-times/${userUid}`)
      .set("Authorization", "Bearer admin-token");

    expect(response.status).toBe(200);
    expect(response.body.success).toBe(true);
    expect(response.body.loginTimes).toEqual([]);
  });

  it("should require authentication", async () => {
    const response = await request(app).get("/api/login-times/user-123");

    expect(response.status).toBe(401);
    expect(response.body.error).toContain("Authentication required");
  });

  it("should include user info in response", async () => {
    const userUid = "user-123";

    await User.create({
      firebaseUid: userUid,
      username: "testuser",
      email: "user@example.com",
      name: "Test User",
      role: "student",
      loginTimes: [new Date()],
    });

    mockVerifyIdToken.mockResolvedValue({
      uid: "admin-uid",
      email: "admin@example.com",
    });

    const response = await request(app)
      .get(`/api/login-times/${userUid}`)
      .set("Authorization", "Bearer admin-token");

    expect(response.status).toBe(200);
    expect(response.body.user).toEqual({
      firebaseUid: userUid,
      username: "testuser",
      name: "Test User",
      email: "user@example.com",
      role: "student",
    });
  });
});
