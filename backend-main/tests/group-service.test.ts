/**
 * GroupService Unit Tests
 *
 * These tests verify the functionality of GroupService methods:
 * - getUserGroups(userUid)
 * - validateGroupMembership(userUid, groupId)
 * - getGroupsByMember(memberUid)
 * - isMemberOfAnyGroup(userUid, groupIds)
 * - filterUserGroups(userUid, groupIds)
 * - validateGroupsExist(groupIds)
 * - getMembershipCount(userUid)
 */

import mongoose from "mongoose";
import { MongoMemoryServer } from "mongodb-memory-server";
import { Group } from "../models";
import { GroupService } from "../services";

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
  await Group.deleteMany({});
});

describe("GroupService", () => {
  describe("getUserGroups", () => {
    it("should return group IDs for a user who is a member", async () => {
      const userObjectId = new mongoose.Types.ObjectId();
      const adminObjectId = new mongoose.Types.ObjectId();

      // Create groups with user as member
      const group1 = await (Group as any).create({
        name: "Group 1",
        type: "single",
        members: [userObjectId],
        level: "beginner",
        createdBy: adminObjectId,
      });

      const group2 = await (Group as any).create({
        name: "Group 2",
        type: "single",
        members: [userObjectId],
        level: "beginner",
        createdBy: adminObjectId,
      });

      // Create group without user
      await (Group as any).create({
        name: "Group 3",
        type: "single",
        members: [new mongoose.Types.ObjectId()],
        level: "beginner",
        createdBy: adminObjectId,
      });

      const groupIds = await GroupService.getUserGroups(userObjectId);

      expect(groupIds).toHaveLength(2);
      expect(groupIds).toContain(group1._id.toString());
      expect(groupIds).toContain(group2._id.toString());
    });

    it("should return empty array for user with no groups", async () => {
      const groupIds = await GroupService.getUserGroups(new mongoose.Types.ObjectId());
      expect(groupIds).toEqual([]);
    });

    it("should return all groups for user in multiple groups", async () => {
      const userObjectId = new mongoose.Types.ObjectId();
      const adminObjectId = new mongoose.Types.ObjectId();

      // Create 5 groups with user as member
      const createdGroups = [];
      for (let i = 0; i < 5; i++) {
        const group = await (Group as any).create({
          name: `Group ${i + 1}`,
          type: "single",
          members: [userObjectId],
          level: "beginner",
          createdBy: adminObjectId,
        });
        createdGroups.push(group);
      }

      const groupIds = await GroupService.getUserGroups(userObjectId);

      expect(groupIds).toHaveLength(5);
      createdGroups.forEach((group) => {
        expect(groupIds).toContain(group._id.toString());
      });
    });
  });

  describe("validateGroupMembership", () => {
    it("should return true when user is a member of the group", async () => {
      const userObjectId = new mongoose.Types.ObjectId();
      const adminObjectId = new mongoose.Types.ObjectId();

      const group = await (Group as any).create({
        name: "Test Group",
        type: "single",
        members: [userObjectId],
        level: "beginner",
        createdBy: adminObjectId,
      });

      const isValid = await GroupService.validateGroupMembership(
        userObjectId,
        group._id.toString()
      );

      expect(isValid).toBe(true);
    });

    it("should return false when user is not a member of the group", async () => {
      const adminObjectId = new mongoose.Types.ObjectId();

      const group = await (Group as any).create({
        name: "Test Group",
        type: "single",
        members: [new mongoose.Types.ObjectId()],
        level: "beginner",
        createdBy: adminObjectId,
      });

      const isValid = await GroupService.validateGroupMembership(
        new mongoose.Types.ObjectId(),
        group._id.toString()
      );

      expect(isValid).toBe(false);
    });

    it("should return false when group does not exist", async () => {
      const fakeGroupId = new mongoose.Types.ObjectId().toString();
      const isValid = await GroupService.validateGroupMembership(
        new mongoose.Types.ObjectId(),
        fakeGroupId
      );

      expect(isValid).toBe(false);
    });

    it("should work with multi-member groups", async () => {
      const user1 = new mongoose.Types.ObjectId();
      const user2 = new mongoose.Types.ObjectId();
      const user3 = new mongoose.Types.ObjectId();
      const adminObjectId = new mongoose.Types.ObjectId();

      const group = await (Group as any).create({
        name: "Multi Group",
        type: "multi",
        members: [user1, user2],
        level: "intermediate",
        createdBy: adminObjectId,
      });

      expect(
        await GroupService.validateGroupMembership(user1, group._id.toString())
      ).toBe(true);
      expect(
        await GroupService.validateGroupMembership(user2, group._id.toString())
      ).toBe(true);
      expect(
        await GroupService.validateGroupMembership(user3, group._id.toString())
      ).toBe(false);
    });
  });

  describe("getGroupsByMember", () => {
    it("should return full group objects for a member", async () => {
      const userObjectId = new mongoose.Types.ObjectId();
      const adminObjectId = new mongoose.Types.ObjectId();

      const group1 = await (Group as any).create({
        name: "Group 1",
        type: "single",
        members: [userObjectId],
        level: "beginner",
        createdBy: adminObjectId,
      });

      const group2 = await (Group as any).create({
        name: "Group 2",
        type: "single",
        members: [userObjectId],
        level: "intermediate",
        createdBy: adminObjectId,
      });

      const groups = await GroupService.getGroupsByMember(userObjectId);

      expect(groups).toHaveLength(2);
      expect(groups[0].name).toBeDefined();
      expect((groups[0] as any).type).toBeDefined();
      expect(groups[0].members).toBeDefined();

      const groupIds = groups.map((g) => g._id.toString());
      expect(groupIds).toContain(group1._id.toString());
      expect(groupIds).toContain(group2._id.toString());
    });

    it("should return empty array for non-member", async () => {
      const groups = await GroupService.getGroupsByMember(new mongoose.Types.ObjectId());
      expect(groups).toEqual([]);
    });

    it("should include all group fields", async () => {
      const userObjectId = new mongoose.Types.ObjectId();
      const adminObjectId = new mongoose.Types.ObjectId();

      await (Group as any).create({
        name: "Test Group",
        type: "single",
        members: [userObjectId],
        level: "advanced",
        createdBy: adminObjectId,
      });

      const groups = await GroupService.getGroupsByMember(userObjectId);

      expect(groups).toHaveLength(1);
      expect(groups[0].name).toBe("Test Group");
      expect((groups[0] as any).type).toBe("single");
      expect(groups[0].members[0].toString()).toEqual(userObjectId.toString());
      expect(groups[0].level).toBe("advanced");
      expect(groups[0].createdBy.toString()).toBe(adminObjectId.toString());
      expect(groups[0].createdAt).toBeDefined();
      expect(groups[0].updatedAt).toBeDefined();
    });
  });

  describe("isMemberOfAnyGroup", () => {
    it("should return true when user is member of at least one group", async () => {
      const userObjectId = new mongoose.Types.ObjectId();
      const adminObjectId = new mongoose.Types.ObjectId();

      const group1 = await (Group as any).create({
        name: "Group 1",
        type: "single",
        members: [userObjectId],
        level: "beginner",
        createdBy: adminObjectId,
      });

      const group2 = await (Group as any).create({
        name: "Group 2",
        type: "single",
        members: [new mongoose.Types.ObjectId()],
        level: "beginner",
        createdBy: adminObjectId,
      });

      const isMember = await GroupService.isMemberOfAnyGroup(userObjectId, [
        group1._id.toString(),
        group2._id.toString(),
      ]);

      expect(isMember).toBe(true);
    });

    it("should return false when user is not member of any group", async () => {
      const adminObjectId = new mongoose.Types.ObjectId();

      const group1 = await (Group as any).create({
        name: "Group 1",
        type: "single",
        members: [new mongoose.Types.ObjectId()],
        level: "beginner",
        createdBy: adminObjectId,
      });

      const group2 = await (Group as any).create({
        name: "Group 2",
        type: "single",
        members: [new mongoose.Types.ObjectId()],
        level: "beginner",
        createdBy: adminObjectId,
      });

      const isMember = await GroupService.isMemberOfAnyGroup(new mongoose.Types.ObjectId(), [
        group1._id.toString(),
        group2._id.toString(),
      ]);

      expect(isMember).toBe(false);
    });

    it("should return false for empty group list", async () => {
      const isMember = await GroupService.isMemberOfAnyGroup(new mongoose.Types.ObjectId(), []);
      expect(isMember).toBe(false);
    });
  });

  describe("filterUserGroups", () => {
    it("should return only groups where user is a member", async () => {
      const userObjectId = new mongoose.Types.ObjectId();
      const adminObjectId = new mongoose.Types.ObjectId();

      const group1 = await (Group as any).create({
        name: "Group 1",
        type: "single",
        members: [userObjectId],
        level: "beginner",
        createdBy: adminObjectId,
      });

      const group2 = await (Group as any).create({
        name: "Group 2",
        type: "single",
        members: [new mongoose.Types.ObjectId()],
        level: "beginner",
        createdBy: adminObjectId,
      });

      const group3 = await (Group as any).create({
        name: "Group 3",
        type: "single",
        members: [userObjectId],
        level: "intermediate",
        createdBy: adminObjectId,
      });

      const filteredIds = await GroupService.filterUserGroups(userObjectId, [
        group1._id.toString(),
        group2._id.toString(),
        group3._id.toString(),
      ]);

      expect(filteredIds).toHaveLength(2);
      expect(filteredIds).toContain(group1._id.toString());
      expect(filteredIds).toContain(group3._id.toString());
      expect(filteredIds).not.toContain(group2._id.toString());
    });

    it("should return empty array when user is not member of any provided groups", async () => {
      const adminObjectId = new mongoose.Types.ObjectId();

      const group1 = await (Group as any).create({
        name: "Group 1",
        type: "single",
        members: [new mongoose.Types.ObjectId()],
        level: "beginner",
        createdBy: adminObjectId,
      });

      const filteredIds = await GroupService.filterUserGroups(new mongoose.Types.ObjectId(), [
        group1._id.toString(),
      ]);

      expect(filteredIds).toEqual([]);
    });

    it("should return empty array for empty input", async () => {
      const filteredIds = await GroupService.filterUserGroups(new mongoose.Types.ObjectId(), []);
      expect(filteredIds).toEqual([]);
    });
  });

  describe("validateGroupsExist", () => {
    it("should return true when all groups exist", async () => {
      const adminObjectId = new mongoose.Types.ObjectId();

      const group1 = await (Group as any).create({
        name: "Group 1",
        type: "single",
        members: [new mongoose.Types.ObjectId()],
        level: "beginner",
        createdBy: adminObjectId,
      });

      const group2 = await (Group as any).create({
        name: "Group 2",
        type: "single",
        members: [new mongoose.Types.ObjectId()],
        level: "beginner",
        createdBy: adminObjectId,
      });

      const exist = await GroupService.validateGroupsExist([
        group1._id.toString(),
        group2._id.toString(),
      ]);

      expect(exist).toBe(true);
    });

    it("should return false when some groups do not exist", async () => {
      const adminObjectId = new mongoose.Types.ObjectId();

      const group1 = await (Group as any).create({
        name: "Group 1",
        type: "single",
        members: [new mongoose.Types.ObjectId()],
        level: "beginner",
        createdBy: adminObjectId,
      });

      const fakeGroupId = new mongoose.Types.ObjectId().toString();

      const exist = await GroupService.validateGroupsExist([
        group1._id.toString(),
        fakeGroupId,
      ]);

      expect(exist).toBe(false);
    });

    it("should return true for empty array", async () => {
      const exist = await GroupService.validateGroupsExist([]);
      expect(exist).toBe(true);
    });
  });

  describe("getMembershipCount", () => {
    it("should return correct count of groups user is member of", async () => {
      const userObjectId = new mongoose.Types.ObjectId();
      const adminObjectId = new mongoose.Types.ObjectId();

      // Create 3 groups with user as member
      for (let i = 0; i < 3; i++) {
        await (Group as any).create({
          name: `Group ${i + 1}`,
          type: "single",
          members: [userObjectId],
          level: "beginner",
          createdBy: adminObjectId,
        });
      }

      // Create 2 groups without user
      for (let i = 0; i < 2; i++) {
        await (Group as any).create({
          name: `Other Group ${i + 1}`,
          type: "single",
          members: [new mongoose.Types.ObjectId()],
          level: "beginner",
          createdBy: adminObjectId,
        });
      }

      const count = await GroupService.getMembershipCount(userObjectId);
      expect(count).toBe(3);
    });

    it("should return 0 for user with no groups", async () => {
      const count = await GroupService.getMembershipCount(new mongoose.Types.ObjectId());
      expect(count).toBe(0);
    });

    it("should count multi-member groups correctly", async () => {
      const userObjectId = new mongoose.Types.ObjectId();
      const adminObjectId = new mongoose.Types.ObjectId();

      await (Group as any).create({
        name: "Multi Group",
        type: "multi",
        members: [userObjectId, new mongoose.Types.ObjectId(), new mongoose.Types.ObjectId()],
        level: "intermediate",
        createdBy: adminObjectId,
      });

      const count = await GroupService.getMembershipCount(userObjectId);
      expect(count).toBe(1);
    });
  });
});
