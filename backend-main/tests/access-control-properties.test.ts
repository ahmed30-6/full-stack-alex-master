/**
 * Access Control Property-Based Tests
 *
 * These tests verify correctness properties for group-based access control:
 * - Property 5: Group-based access control for messages and files
 */

import * as fc from "fast-check";
import { Group, Message, ActivityFile } from "../models";
import mongoose from "mongoose";
import { MongoMemoryServer } from "mongodb-memory-server";
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
  await Message.deleteMany({});
  await ActivityFile.deleteMany({});
});

describe("Access Control Property-Based Tests", () => {
  /**
   * Feature: backend-tasks-6-10, Property 5: Group-based access control for messages and files
   * Validates: Requirements 2.2, 2.4
   *
   * For any student querying messages or files, the results should only include items
   * where the student is a member of the associated group. Items from groups where the
   * student is not a member should never be returned.
   */
  describe("Property 5: Group-based access control for messages and files", () => {
    it("should only return messages from groups where user is a member", async () => {
      await fc.assert(
        fc.asyncProperty(
          fc.record({
            user1Uid: fc.string({ minLength: 1, maxLength: 50 }),
            user2Uid: fc.string({ minLength: 1, maxLength: 50 }),
            adminUid: fc.string({ minLength: 1, maxLength: 50 }),
            messagesInUser1Group: fc.array(
              fc.record({
                activityId: fc.string({ minLength: 1, maxLength: 50 }),
                text: fc.string({ minLength: 1, maxLength: 500 }),
              }),
              { minLength: 1, maxLength: 3 }
            ),
            messagesInUser2Group: fc.array(
              fc.record({
                activityId: fc.string({ minLength: 1, maxLength: 50 }),
                text: fc.string({ minLength: 1, maxLength: 500 }),
              }),
              { minLength: 1, maxLength: 3 }
            ),
          }),
          async (data) => {
            // Clear database
            await Group.deleteMany({});
            await Message.deleteMany({});

            // Create group for user1
            const group1 = await Group.create({
              name: "User 1 Group",
              type: "single",
              members: [data.user1Uid],
              createdBy: data.adminUid,
            });

            // Create group for user2
            const group2 = await Group.create({
              name: "User 2 Group",
              type: "single",
              members: [data.user2Uid],
              createdBy: data.adminUid,
            });

            // Create messages in user1's group
            for (const msgData of data.messagesInUser1Group) {
              await Message.create({
                activityId: msgData.activityId,
                groupId: group1._id.toString(),
                text: msgData.text,
                senderUid: data.user1Uid,
              });
            }

            // Create messages in user2's group
            for (const msgData of data.messagesInUser2Group) {
              await Message.create({
                activityId: msgData.activityId,
                groupId: group2._id.toString(),
                text: msgData.text,
                senderUid: data.user2Uid,
              });
            }

            // User1 queries messages - should only see their group's messages
            const user1GroupIds = await GroupService.getUserGroups(
              data.user1Uid
            );
            const user1Messages = await Message.find({
              groupId: { $in: user1GroupIds },
            }).lean();

            expect(user1Messages.length).toBe(data.messagesInUser1Group.length);
            user1Messages.forEach((msg) => {
              expect(msg.groupId).toBe(group1._id.toString());
              expect(msg.senderUid).toBe(data.user1Uid);
            });

            // User2 queries messages - should only see their group's messages
            const user2GroupIds = await GroupService.getUserGroups(
              data.user2Uid
            );
            const user2Messages = await Message.find({
              groupId: { $in: user2GroupIds },
            }).lean();

            expect(user2Messages.length).toBe(data.messagesInUser2Group.length);
            user2Messages.forEach((msg) => {
              expect(msg.groupId).toBe(group2._id.toString());
              expect(msg.senderUid).toBe(data.user2Uid);
            });

            // Verify no cross-group access
            const user1CannotSeeUser2Messages = user1Messages.every(
              (msg) => msg.groupId !== group2._id.toString()
            );
            const user2CannotSeeUser1Messages = user2Messages.every(
              (msg) => msg.groupId !== group1._id.toString()
            );

            expect(user1CannotSeeUser2Messages).toBe(true);
            expect(user2CannotSeeUser1Messages).toBe(true);
          }
        ),
        { numRuns: 100 }
      );
    });

    it("should only return files from groups where user is a member", async () => {
      await fc.assert(
        fc.asyncProperty(
          fc.record({
            user1Uid: fc.string({ minLength: 1, maxLength: 50 }),
            user2Uid: fc.string({ minLength: 1, maxLength: 50 }),
            adminUid: fc.string({ minLength: 1, maxLength: 50 }),
            filesInUser1Group: fc.array(
              fc.record({
                activityId: fc.string({ minLength: 1, maxLength: 50 }),
                filename: fc.string({ minLength: 1, maxLength: 100 }),
                url: fc.webUrl(),
              }),
              { minLength: 1, maxLength: 3 }
            ),
            filesInUser2Group: fc.array(
              fc.record({
                activityId: fc.string({ minLength: 1, maxLength: 50 }),
                filename: fc.string({ minLength: 1, maxLength: 100 }),
                url: fc.webUrl(),
              }),
              { minLength: 1, maxLength: 3 }
            ),
          }),
          async (data) => {
            // Clear database
            await Group.deleteMany({});
            await ActivityFile.deleteMany({});

            // Create group for user1
            const group1 = await Group.create({
              name: "User 1 Group",
              type: "single",
              members: [data.user1Uid],
              createdBy: data.adminUid,
            });

            // Create group for user2
            const group2 = await Group.create({
              name: "User 2 Group",
              type: "single",
              members: [data.user2Uid],
              createdBy: data.adminUid,
            });

            // Create files in user1's group
            for (const fileData of data.filesInUser1Group) {
              await ActivityFile.create({
                activityId: fileData.activityId,
                groupId: group1._id.toString(),
                filename: fileData.filename,
                url: fileData.url,
                uploadedByUid: data.user1Uid,
              });
            }

            // Create files in user2's group
            for (const fileData of data.filesInUser2Group) {
              await ActivityFile.create({
                activityId: fileData.activityId,
                groupId: group2._id.toString(),
                filename: fileData.filename,
                url: fileData.url,
                uploadedByUid: data.user2Uid,
              });
            }

            // User1 queries files - should only see their group's files
            const user1GroupIds = await GroupService.getUserGroups(
              data.user1Uid
            );
            const user1Files = await ActivityFile.find({
              groupId: { $in: user1GroupIds },
            }).lean();

            expect(user1Files.length).toBe(data.filesInUser1Group.length);
            user1Files.forEach((file) => {
              expect(file.groupId).toBe(group1._id.toString());
              expect(file.uploadedByUid).toBe(data.user1Uid);
            });

            // User2 queries files - should only see their group's files
            const user2GroupIds = await GroupService.getUserGroups(
              data.user2Uid
            );
            const user2Files = await ActivityFile.find({
              groupId: { $in: user2GroupIds },
            }).lean();

            expect(user2Files.length).toBe(data.filesInUser2Group.length);
            user2Files.forEach((file) => {
              expect(file.groupId).toBe(group2._id.toString());
              expect(file.uploadedByUid).toBe(data.user2Uid);
            });

            // Verify no cross-group access
            const user1CannotSeeUser2Files = user1Files.every(
              (file) => file.groupId !== group2._id.toString()
            );
            const user2CannotSeeUser1Files = user2Files.every(
              (file) => file.groupId !== group1._id.toString()
            );

            expect(user1CannotSeeUser2Files).toBe(true);
            expect(user2CannotSeeUser1Files).toBe(true);
          }
        ),
        { numRuns: 100 }
      );
    });

    it("should prevent access to messages from non-member groups", async () => {
      await fc.assert(
        fc.asyncProperty(
          fc.record({
            memberUid: fc.string({ minLength: 1, maxLength: 50 }),
            nonMemberUid: fc.string({ minLength: 1, maxLength: 50 }),
            adminUid: fc.string({ minLength: 1, maxLength: 50 }),
            messageCount: fc.integer({ min: 1, max: 5 }),
          }),
          async (data) => {
            // Clear database
            await Group.deleteMany({});
            await Message.deleteMany({});

            // Create group with only memberUid
            const group = await Group.create({
              name: "Private Group",
              type: "single",
              members: [data.memberUid],
              createdBy: data.adminUid,
            });

            // Create messages in the group
            for (let i = 0; i < data.messageCount; i++) {
              await Message.create({
                activityId: `activity-${i}`,
                groupId: group._id.toString(),
                text: `Message ${i}`,
                senderUid: data.memberUid,
              });
            }

            // Non-member tries to query messages
            const nonMemberGroupIds = await GroupService.getUserGroups(
              data.nonMemberUid
            );
            const nonMemberMessages = await Message.find({
              groupId: { $in: nonMemberGroupIds },
            }).lean();

            // Non-member should see no messages
            expect(nonMemberMessages.length).toBe(0);

            // Member should see all messages
            const memberGroupIds = await GroupService.getUserGroups(
              data.memberUid
            );
            const memberMessages = await Message.find({
              groupId: { $in: memberGroupIds },
            }).lean();

            expect(memberMessages.length).toBe(data.messageCount);
          }
        ),
        { numRuns: 100 }
      );
    });

    it("should prevent access to files from non-member groups", async () => {
      await fc.assert(
        fc.asyncProperty(
          fc.record({
            memberUid: fc.string({ minLength: 1, maxLength: 50 }),
            nonMemberUid: fc.string({ minLength: 1, maxLength: 50 }),
            adminUid: fc.string({ minLength: 1, maxLength: 50 }),
            fileCount: fc.integer({ min: 1, max: 5 }),
          }),
          async (data) => {
            // Clear database
            await Group.deleteMany({});
            await ActivityFile.deleteMany({});

            // Create group with only memberUid
            const group = await Group.create({
              name: "Private Group",
              type: "single",
              members: [data.memberUid],
              createdBy: data.adminUid,
            });

            // Create files in the group
            for (let i = 0; i < data.fileCount; i++) {
              await ActivityFile.create({
                activityId: `activity-${i}`,
                groupId: group._id.toString(),
                filename: `file-${i}.pdf`,
                url: `https://example.com/file-${i}.pdf`,
                uploadedByUid: data.memberUid,
              });
            }

            // Non-member tries to query files
            const nonMemberGroupIds = await GroupService.getUserGroups(
              data.nonMemberUid
            );
            const nonMemberFiles = await ActivityFile.find({
              groupId: { $in: nonMemberGroupIds },
            }).lean();

            // Non-member should see no files
            expect(nonMemberFiles.length).toBe(0);

            // Member should see all files
            const memberGroupIds = await GroupService.getUserGroups(
              data.memberUid
            );
            const memberFiles = await ActivityFile.find({
              groupId: { $in: memberGroupIds },
            }).lean();

            expect(memberFiles.length).toBe(data.fileCount);
          }
        ),
        { numRuns: 100 }
      );
    });
  });
});
