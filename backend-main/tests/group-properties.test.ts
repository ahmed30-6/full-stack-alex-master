/**
 * Group Model Property-Based Tests
 *
 * These tests verify correctness properties for group management:
 * - Property 1: Group creation stores complete data
 * - Property 2: Single-type groups enforce exactly one member
 */

import * as fc from "fast-check";
import { Group, IGroup } from "../models/Group";
import mongoose from "mongoose";
import { MongoMemoryServer } from "mongodb-memory-server";

let mongoServer: MongoMemoryServer;

// MongoDB Memory Server setup for isolated testing
beforeAll(async () => {
  // Create in-memory MongoDB instance
  mongoServer = await MongoMemoryServer.create();
  const mongoUri = mongoServer.getUri();
  await mongoose.connect(mongoUri);
}, 30000);

afterAll(async () => {
  // Clean up and disconnect
  await mongoose.connection.dropDatabase();
  await mongoose.connection.close();
  await mongoServer.stop();
}, 30000);

beforeEach(async () => {
  // Clear groups collection before each test
  await Group.deleteMany({});
});

describe("Group Model Property-Based Tests", () => {
  /**
   * Feature: backend-tasks-6-10, Property 1: Group creation stores complete data
   * Validates: Requirements 1.1
   *
   * For any valid group data (name, type, members) provided by an administrator,
   * creating a group should result in a stored group with a unique identifier,
   * the provided name, type, and members array.
   */
  describe("Property 1: Group creation stores complete data", () => {
    it("should store all provided group data correctly", async () => {
      await fc.assert(
        fc.asyncProperty(
          fc.record({
            name: fc.string({ minLength: 1, maxLength: 100 }),
            type: fc.constantFrom("single" as const, "multi" as const),
            members: fc.array(fc.string({ minLength: 1, maxLength: 50 }), {
              minLength: 1,
              maxLength: 5,
            }),
            level: fc.option(fc.integer({ min: 1, max: 10 }), {
              nil: undefined,
            }),
            createdBy: fc.string({ minLength: 1, maxLength: 50 }),
          }),
          async (groupData) => {
            // Adjust members array based on type
            const members =
              groupData.type === "single"
                ? [groupData.members[0]]
                : groupData.members;

            // Create group
            const group = new Group({
              ...groupData,
              members,
            });

            const savedGroup = await group.save();

            // Verify all data is stored correctly
            expect(savedGroup._id).toBeDefined();
            expect(savedGroup.name).toBe(groupData.name);
            expect(savedGroup.type).toBe(groupData.type);
            expect(savedGroup.members).toEqual(members);
            expect(savedGroup.createdBy).toBe(groupData.createdBy);

            if (groupData.level !== undefined) {
              expect(savedGroup.level).toBe(groupData.level);
            }

            // Verify timestamps are created
            expect(savedGroup.createdAt).toBeDefined();
            expect(savedGroup.updatedAt).toBeDefined();

            // Verify we can retrieve it
            const retrieved = await Group.findById(savedGroup._id);
            expect(retrieved).toBeDefined();
            expect(retrieved?.name).toBe(groupData.name);
            expect(retrieved?.type).toBe(groupData.type);
            expect(retrieved?.members).toEqual(members);
          }
        ),
        { numRuns: 100 }
      );
    });
  });

  /**
   * Feature: backend-tasks-6-10, Property 2: Single-type groups enforce exactly one member
   * Validates: Requirements 1.2, 1.3, 1.4
   *
   * For any group creation request with type "single", the request should be accepted
   * if and only if the members array contains exactly one element. Requests with zero
   * members or more than one member should be rejected with a validation error.
   */
  describe("Property 2: Single-type groups enforce exactly one member", () => {
    it("should accept single-type groups with exactly one member", async () => {
      await fc.assert(
        fc.asyncProperty(
          fc.record({
            name: fc.string({ minLength: 1, maxLength: 100 }),
            member: fc.string({ minLength: 1, maxLength: 50 }),
            level: fc.option(fc.integer({ min: 1, max: 10 }), {
              nil: undefined,
            }),
            createdBy: fc.string({ minLength: 1, maxLength: 50 }),
          }),
          async (groupData) => {
            const group = new Group({
              name: groupData.name,
              type: "single",
              members: [groupData.member],
              level: groupData.level,
              createdBy: groupData.createdBy,
            });

            // Should save successfully
            const savedGroup = await group.save();
            expect(savedGroup._id).toBeDefined();
            expect(savedGroup.members).toHaveLength(1);
            expect(savedGroup.members[0]).toBe(groupData.member);
          }
        ),
        { numRuns: 100 }
      );
    });

    it("should reject single-type groups with zero members", async () => {
      await fc.assert(
        fc.asyncProperty(
          fc.record({
            name: fc.string({ minLength: 1, maxLength: 100 }),
            createdBy: fc.string({ minLength: 1, maxLength: 50 }),
          }),
          async (groupData) => {
            const group = new Group({
              name: groupData.name,
              type: "single",
              members: [],
              createdBy: groupData.createdBy,
            });

            // Should fail validation
            await expect(group.save()).rejects.toThrow();
          }
        ),
        { numRuns: 100 }
      );
    });

    it("should reject single-type groups with more than one member", async () => {
      await fc.assert(
        fc.asyncProperty(
          fc.record({
            name: fc.string({ minLength: 1, maxLength: 100 }),
            members: fc.array(fc.string({ minLength: 1, maxLength: 50 }), {
              minLength: 2,
              maxLength: 5,
            }),
            createdBy: fc.string({ minLength: 1, maxLength: 50 }),
          }),
          async (groupData) => {
            const group = new Group({
              name: groupData.name,
              type: "single",
              members: groupData.members,
              createdBy: groupData.createdBy,
            });

            // Should fail validation
            await expect(group.save()).rejects.toThrow();
          }
        ),
        { numRuns: 100 }
      );
    });

    it("should accept multi-type groups with multiple members", async () => {
      await fc.assert(
        fc.asyncProperty(
          fc.record({
            name: fc.string({ minLength: 1, maxLength: 100 }),
            members: fc.array(fc.string({ minLength: 1, maxLength: 50 }), {
              minLength: 1,
              maxLength: 5,
            }),
            createdBy: fc.string({ minLength: 1, maxLength: 50 }),
          }),
          async (groupData) => {
            const group = new Group({
              name: groupData.name,
              type: "multi",
              members: groupData.members,
              createdBy: groupData.createdBy,
            });

            // Should save successfully
            const savedGroup = await group.save();
            expect(savedGroup._id).toBeDefined();
            expect(savedGroup.members).toEqual(groupData.members);
          }
        ),
        { numRuns: 100 }
      );
    });
  });

  /**
   * Feature: backend-tasks-6-10, Property 3: Group retrieval returns all groups
   * Validates: Requirements 1.5
   *
   * For any set of created groups, querying all groups should return a list
   * containing all created groups with their complete data (id, name, type, members, metadata).
   */
  describe("Property 3: Group retrieval returns all groups", () => {
    it("should return all created groups with complete data", async () => {
      await fc.assert(
        fc.asyncProperty(
          fc.array(
            fc.record({
              name: fc.string({ minLength: 1, maxLength: 100 }),
              type: fc.constantFrom("single" as const, "multi" as const),
              members: fc.array(fc.string({ minLength: 1, maxLength: 50 }), {
                minLength: 1,
                maxLength: 5,
              }),
              level: fc.option(fc.integer({ min: 1, max: 10 }), {
                nil: undefined,
              }),
              createdBy: fc.string({ minLength: 1, maxLength: 50 }),
            }),
            { minLength: 1, maxLength: 10 }
          ),
          async (groupsData) => {
            // Clear database for this iteration
            await Group.deleteMany({});

            // Create all groups
            const createdGroups = [];
            for (const groupData of groupsData) {
              const members =
                groupData.type === "single"
                  ? [groupData.members[0]]
                  : groupData.members;

              const group = await Group.create({
                ...groupData,
                members,
              });
              createdGroups.push(group);
            }

            // Retrieve all groups
            const retrieved = await Group.find({}).lean();

            // Verify count matches
            expect(retrieved.length).toBe(createdGroups.length);

            // Verify each created group is in the retrieved list
            for (const created of createdGroups) {
              const found = retrieved.find(
                (g) => g._id.toString() === created._id.toString()
              );

              expect(found).toBeDefined();
              expect(found?.name).toBe(created.name);
              expect(found?.type).toBe(created.type);
              expect(found?.members).toEqual(created.members);
              expect(found?.createdBy).toBe(created.createdBy);

              if (created.level !== undefined) {
                expect(found?.level).toBe(created.level);
              }

              // Verify metadata exists
              expect(found?.createdAt).toBeDefined();
              expect(found?.updatedAt).toBeDefined();
            }
          }
        ),
        { numRuns: 100 }
      );
    });

    it("should filter groups by type correctly", async () => {
      await fc.assert(
        fc.asyncProperty(
          fc.record({
            singleGroups: fc.array(
              fc.record({
                name: fc.string({ minLength: 1, maxLength: 100 }),
                member: fc.string({ minLength: 1, maxLength: 50 }),
                createdBy: fc.string({ minLength: 1, maxLength: 50 }),
              }),
              { minLength: 1, maxLength: 5 }
            ),
            multiGroups: fc.array(
              fc.record({
                name: fc.string({ minLength: 1, maxLength: 100 }),
                members: fc.array(fc.string({ minLength: 1, maxLength: 50 }), {
                  minLength: 2,
                  maxLength: 5,
                }),
                createdBy: fc.string({ minLength: 1, maxLength: 50 }),
              }),
              { minLength: 1, maxLength: 5 }
            ),
          }),
          async (data) => {
            // Clear database for this iteration
            await Group.deleteMany({});

            // Create single-type groups
            for (const groupData of data.singleGroups) {
              await Group.create({
                name: groupData.name,
                type: "single",
                members: [groupData.member],
                createdBy: groupData.createdBy,
              });
            }

            // Create multi-type groups
            for (const groupData of data.multiGroups) {
              await Group.create({
                name: groupData.name,
                type: "multi",
                members: groupData.members,
                createdBy: groupData.createdBy,
              });
            }

            // Query single-type groups
            const singleGroups = await Group.find({ type: "single" }).lean();
            expect(singleGroups.length).toBe(data.singleGroups.length);
            singleGroups.forEach((group) => {
              expect(group.type).toBe("single");
              expect(group.members).toHaveLength(1);
            });

            // Query multi-type groups
            const multiGroups = await Group.find({ type: "multi" }).lean();
            expect(multiGroups.length).toBe(data.multiGroups.length);
            multiGroups.forEach((group) => {
              expect(group.type).toBe("multi");
              expect(group.members.length).toBeGreaterThan(1);
            });
          }
        ),
        { numRuns: 50 }
      );
    });
  });
});
