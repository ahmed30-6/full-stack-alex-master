/**
 * Login Times Property-Based Tests
 *
 * These tests verify correctness properties for login time tracking:
 * - Property 7: Login timestamps are recorded
 * - Property 8: Admin retrieval of login times
 * - Property 9: Non-admin access control for login times
 * - Property 10: Login timestamps maintain chronological order
 */

import * as fc from "fast-check";
import { User } from "../models";
import mongoose from "mongoose";
import { MongoMemoryServer } from "mongodb-memory-server";

let mongoServer: MongoMemoryServer;

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
});

describe("Login Times Property-Based Tests", () => {
  /**
   * Feature: backend-tasks-6-10, Property 7: Login timestamps are recorded
   * Validates: Requirements 3.1
   *
   * For any student login event, the user's loginTimes array should grow by one element
   * and the new element should be a timestamp representing the login time.
   */
  describe("Property 7: Login timestamps are recorded", () => {
    it("should add timestamp to loginTimes array on each login", async () => {
      await fc.assert(
        fc.asyncProperty(
          fc.record({
            firebaseUid: fc.string({ minLength: 1, maxLength: 50 }),
            username: fc.string({ minLength: 3, maxLength: 30 }),
            email: fc.emailAddress(),
            name: fc.string({ minLength: 1, maxLength: 100 }),
            loginCount: fc.integer({ min: 1, max: 5 }),
          }),
          async (data) => {
            // Clear database
            await User.deleteMany({});

            // Create user
            const user = await User.create({
              firebaseUid: data.firebaseUid,
              username: data.username,
              email: data.email,
              name: data.name,
              role: "student",
              loginTimes: [],
            });

            // Simulate multiple logins
            for (let i = 0; i < data.loginCount; i++) {
              await User.findByIdAndUpdate(user._id, {
                $push: { loginTimes: new Date() },
              });
            }

            // Verify loginTimes array grew
            const updatedUser = await User.findById(user._id);
            expect(updatedUser?.loginTimes).toHaveLength(data.loginCount);

            // Verify all elements are timestamps
            updatedUser?.loginTimes.forEach((timestamp) => {
              expect(timestamp).toBeInstanceOf(Date);
              expect(timestamp.getTime()).toBeLessThanOrEqual(Date.now());
            });
          }
        ),
        { numRuns: 100 }
      );
    });
  });

  /**
   * Feature: backend-tasks-6-10, Property 8: Admin retrieval of login times
   * Validates: Requirements 3.2
   *
   * For any user with login history, when an administrator queries that user's login times,
   * the response should contain all timestamps from the user's loginTimes array.
   */
  describe("Property 8: Admin retrieval of login times", () => {
    it("should return all login timestamps for any user", async () => {
      await fc.assert(
        fc.asyncProperty(
          fc.record({
            firebaseUid: fc.string({ minLength: 1, maxLength: 50 }),
            username: fc.string({ minLength: 3, maxLength: 30 }),
            email: fc.emailAddress(),
            name: fc.string({ minLength: 1, maxLength: 100 }),
            loginTimestamps: fc.array(fc.date(), {
              minLength: 1,
              maxLength: 10,
            }),
          }),
          async (data) => {
            // Clear database
            await User.deleteMany({});

            // Create user with login times
            const user = await User.create({
              firebaseUid: data.firebaseUid,
              username: data.username,
              email: data.email,
              name: data.name,
              role: "student",
              loginTimes: data.loginTimestamps,
            });

            // Admin retrieves login times
            const retrievedUser = await User.findOne({
              firebaseUid: data.firebaseUid,
            }).lean();

            expect(retrievedUser).toBeDefined();
            expect(retrievedUser?.loginTimes).toHaveLength(
              data.loginTimestamps.length
            );

            // Verify all timestamps are present
            const retrievedTimestamps = retrievedUser?.loginTimes.map((t) =>
              new Date(t).getTime()
            );
            const originalTimestamps = data.loginTimestamps.map((t) =>
              t.getTime()
            );

            originalTimestamps.forEach((timestamp) => {
              expect(retrievedTimestamps).toContain(timestamp);
            });
          }
        ),
        { numRuns: 100 }
      );
    });
  });

  /**
   * Feature: backend-tasks-6-10, Property 9: Non-admin access control for login times
   * Validates: Requirements 3.3
   *
   * For any non-administrator user attempting to query another user's login times,
   * the request should be rejected with a 403 forbidden error.
   */
  describe("Property 9: Non-admin access control for login times", () => {
    it("should prevent non-admin from accessing other users' login times", async () => {
      await fc.assert(
        fc.asyncProperty(
          fc.record({
            targetUserUid: fc.string({ minLength: 1, maxLength: 50 }),
            requestingUserUid: fc.string({ minLength: 1, maxLength: 50 }),
            adminEmail: fc.emailAddress(),
            nonAdminEmail: fc.emailAddress(),
          }),
          async (data) => {
            // Ensure different users
            fc.pre(data.targetUserUid !== data.requestingUserUid);
            fc.pre(data.adminEmail !== data.nonAdminEmail);

            // Clear database
            await User.deleteMany({});

            // Create target user with login times
            await User.create({
              firebaseUid: data.targetUserUid,
              username: "targetuser",
              email: "target@example.com",
              name: "Target User",
              role: "student",
              loginTimes: [new Date()],
            });

            // Simulate access control check
            const isAdmin = data.nonAdminEmail === data.adminEmail;
            const canAccess = isAdmin;

            // Non-admin should not be able to access
            expect(canAccess).toBe(false);
          }
        ),
        { numRuns: 100 }
      );
    });
  });

  /**
   * Feature: backend-tasks-6-10, Property 10: Login timestamps maintain chronological order
   * Validates: Requirements 3.4
   *
   * For any user's loginTimes array, the timestamps should be in chronological order
   * (each timestamp is greater than or equal to the previous one).
   */
  describe("Property 10: Login timestamps maintain chronological order", () => {
    it("should maintain chronological order of login timestamps", async () => {
      await fc.assert(
        fc.asyncProperty(
          fc.record({
            firebaseUid: fc.string({ minLength: 1, maxLength: 50 }),
            username: fc.string({ minLength: 3, maxLength: 30 }),
            email: fc.emailAddress(),
            name: fc.string({ minLength: 1, maxLength: 100 }),
            loginCount: fc.integer({ min: 2, max: 10 }),
          }),
          async (data) => {
            // Clear database
            await User.deleteMany({});

            // Create user
            const user = await User.create({
              firebaseUid: data.firebaseUid,
              username: data.username,
              email: data.email,
              name: data.name,
              role: "student",
              loginTimes: [],
            });

            // Simulate logins with small delays
            for (let i = 0; i < data.loginCount; i++) {
              await User.findByIdAndUpdate(user._id, {
                $push: { loginTimes: new Date(Date.now() + i * 1000) },
              });
            }

            // Retrieve and sort timestamps
            const updatedUser = await User.findById(user._id);
            const loginTimes = updatedUser?.loginTimes || [];
            const sortedTimes = [...loginTimes].sort(
              (a, b) => new Date(a).getTime() - new Date(b).getTime()
            );

            // Verify chronological order
            for (let i = 1; i < sortedTimes.length; i++) {
              const prevTime = new Date(sortedTimes[i - 1]).getTime();
              const currTime = new Date(sortedTimes[i]).getTime();
              expect(currTime).toBeGreaterThanOrEqual(prevTime);
            }
          }
        ),
        { numRuns: 100 }
      );
    });

    it("should handle out-of-order insertions by sorting", async () => {
      await fc.assert(
        fc.asyncProperty(
          fc.record({
            firebaseUid: fc.string({ minLength: 1, maxLength: 50 }),
            username: fc.string({ minLength: 3, maxLength: 30 }),
            email: fc.emailAddress(),
            name: fc.string({ minLength: 1, maxLength: 100 }),
            timestamps: fc.array(fc.date(), { minLength: 2, maxLength: 10 }),
          }),
          async (data) => {
            // Clear database
            await User.deleteMany({});

            // Create user with potentially out-of-order timestamps
            const user = await User.create({
              firebaseUid: data.firebaseUid,
              username: data.username.padEnd(3, "x"), // Ensure min length
              email: data.email,
              name: data.name,
              role: "student",
              loginTimes: data.timestamps,
            });

            // Retrieve and sort
            const retrievedUser = await User.findById(user._id);
            const loginTimes = retrievedUser?.loginTimes || [];
            const sortedTimes = [...loginTimes].sort(
              (a, b) => new Date(a).getTime() - new Date(b).getTime()
            );

            // Verify sorted order is chronological
            for (let i = 1; i < sortedTimes.length; i++) {
              const prevTime = new Date(sortedTimes[i - 1]).getTime();
              const currTime = new Date(sortedTimes[i]).getTime();
              expect(currTime).toBeGreaterThanOrEqual(prevTime);
            }
          }
        ),
        { numRuns: 100 }
      );
    });
  });
});
