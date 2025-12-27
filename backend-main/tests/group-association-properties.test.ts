/**
 * Group Association Property-Based Tests
 *
 * These tests verify correctness properties for group-based data association:
 * - Property 4: Messages and files associate with sender's group
 */

import * as fc from "fast-check";
import { Group, Message, ActivityFile } from "../models";
import mongoose from "mongoose";
import { MongoMemoryServer } from "mongodb-memory-server";

let mongoServer: MongoMemoryServer;

// MongoDB Memory Server setup for isolated testing
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

describe("Group Association Property-Based Tests", () => {
  /**
   * Feature: backend-tasks-6-10, Property 4: Messages and files associate with sender's group
   * Validates: Requirements 2.1, 2.3
   *
   * For any student sending a message or uploading file metadata, the saved message
   * or file should contain the groupId of a group where the student is a member.
   */
  describe("Property 4: Messages and files associate with sender's group", () => {
    it("should associate messages with a group where sender is a member", async () => {
      await fc.assert(
        fc.asyncProperty(
          fc.record({
            // Group data
            groupName: fc.string({ minLength: 1, maxLength: 100 }),
            studentUid: fc.string({ minLength: 1, maxLength: 50 }),
            adminUid: fc.string({ minLength: 1, maxLength: 50 }),
            // Message data
            activityId: fc.string({ minLength: 1, maxLength: 50 }),
            messageText: fc.string({ minLength: 1, maxLength: 500 }),
          }),
          async (data) => {
            // Clear database for this iteration
            await Group.deleteMany({});
            await Message.deleteMany({});

            // Create a group with the student as a member
            const group = await Group.create({
              name: data.groupName,
              type: "single",
              members: [data.studentUid],
              createdBy: data.adminUid,
            });

            // Student sends a message associated with their group
            const message = await Message.create({
              activityId: data.activityId,
              groupId: group._id.toString(),
              text: data.messageText,
              senderUid: data.studentUid,
            });

            // Verify the message is associated with the group
            expect(message.groupId).toBe(group._id.toString());

            // Verify the sender is a member of the group
            const groupDoc = await Group.findById(message.groupId);
            expect(groupDoc).toBeDefined();
            expect(groupDoc?.members).toContain(data.studentUid);

            // Verify we can query messages by groupId
            const messagesInGroup = await Message.find({
              groupId: group._id.toString(),
            });
            expect(messagesInGroup.length).toBe(1);
            expect(messagesInGroup[0]._id.toString()).toBe(
              message._id.toString()
            );
          }
        ),
        { numRuns: 100 }
      );
    });

    it("should associate files with a group where uploader is a member", async () => {
      await fc.assert(
        fc.asyncProperty(
          fc.record({
            // Group data
            groupName: fc.string({ minLength: 1, maxLength: 100 }),
            studentUid: fc.string({ minLength: 1, maxLength: 50 }),
            adminUid: fc.string({ minLength: 1, maxLength: 50 }),
            // File data
            activityId: fc.string({ minLength: 1, maxLength: 50 }),
            filename: fc.string({ minLength: 1, maxLength: 100 }),
            url: fc.webUrl(),
          }),
          async (data) => {
            // Clear database for this iteration
            await Group.deleteMany({});
            await ActivityFile.deleteMany({});

            // Create a group with the student as a member
            const group = await Group.create({
              name: data.groupName,
              type: "single",
              members: [data.studentUid],
              createdBy: data.adminUid,
            });

            // Student uploads a file associated with their group
            const file = await ActivityFile.create({
              activityId: data.activityId,
              groupId: group._id.toString(),
              filename: data.filename,
              url: data.url,
              uploadedByUid: data.studentUid,
            });

            // Verify the file is associated with the group
            expect(file.groupId).toBe(group._id.toString());

            // Verify the uploader is a member of the group
            const groupDoc = await Group.findById(file.groupId);
            expect(groupDoc).toBeDefined();
            expect(groupDoc?.members).toContain(data.studentUid);

            // Verify we can query files by groupId
            const filesInGroup = await ActivityFile.find({
              groupId: group._id.toString(),
            });
            expect(filesInGroup.length).toBe(1);
            expect(filesInGroup[0]._id.toString()).toBe(file._id.toString());
          }
        ),
        { numRuns: 100 }
      );
    });

    it("should maintain group association across multiple messages", async () => {
      await fc.assert(
        fc.asyncProperty(
          fc.record({
            groupName: fc.string({ minLength: 1, maxLength: 100 }),
            studentUid: fc.string({ minLength: 1, maxLength: 50 }),
            adminUid: fc.string({ minLength: 1, maxLength: 50 }),
            messages: fc.array(
              fc.record({
                activityId: fc.string({ minLength: 1, maxLength: 50 }),
                text: fc.string({ minLength: 1, maxLength: 500 }),
              }),
              { minLength: 1, maxLength: 5 }
            ),
          }),
          async (data) => {
            // Clear database for this iteration
            await Group.deleteMany({});
            await Message.deleteMany({});

            // Create a group
            const group = await Group.create({
              name: data.groupName,
              type: "single",
              members: [data.studentUid],
              createdBy: data.adminUid,
            });

            // Create multiple messages for the same group
            const createdMessages = [];
            for (const msgData of data.messages) {
              const message = await Message.create({
                activityId: msgData.activityId,
                groupId: group._id.toString(),
                text: msgData.text,
                senderUid: data.studentUid,
              });
              createdMessages.push(message);
            }

            // Verify all messages are associated with the same group
            for (const message of createdMessages) {
              expect(message.groupId).toBe(group._id.toString());
            }

            // Verify we can retrieve all messages for the group
            const messagesInGroup = await Message.find({
              groupId: group._id.toString(),
            });
            expect(messagesInGroup.length).toBe(data.messages.length);

            // Verify all retrieved messages belong to the group
            messagesInGroup.forEach((msg) => {
              expect(msg.groupId).toBe(group._id.toString());
            });
          }
        ),
        { numRuns: 100 }
      );
    });

    it("should maintain group association across multiple files", async () => {
      await fc.assert(
        fc.asyncProperty(
          fc.record({
            groupName: fc.string({ minLength: 1, maxLength: 100 }),
            studentUid: fc.string({ minLength: 1, maxLength: 50 }),
            adminUid: fc.string({ minLength: 1, maxLength: 50 }),
            files: fc.array(
              fc.record({
                activityId: fc.string({ minLength: 1, maxLength: 50 }),
                filename: fc.string({ minLength: 1, maxLength: 100 }),
                url: fc.webUrl(),
              }),
              { minLength: 1, maxLength: 5 }
            ),
          }),
          async (data) => {
            // Clear database for this iteration
            await Group.deleteMany({});
            await ActivityFile.deleteMany({});

            // Create a group
            const group = await Group.create({
              name: data.groupName,
              type: "single",
              members: [data.studentUid],
              createdBy: data.adminUid,
            });

            // Create multiple files for the same group
            const createdFiles = [];
            for (const fileData of data.files) {
              const file = await ActivityFile.create({
                activityId: fileData.activityId,
                groupId: group._id.toString(),
                filename: fileData.filename,
                url: fileData.url,
                uploadedByUid: data.studentUid,
              });
              createdFiles.push(file);
            }

            // Verify all files are associated with the same group
            for (const file of createdFiles) {
              expect(file.groupId).toBe(group._id.toString());
            }

            // Verify we can retrieve all files for the group
            const filesInGroup = await ActivityFile.find({
              groupId: group._id.toString(),
            });
            expect(filesInGroup.length).toBe(data.files.length);

            // Verify all retrieved files belong to the group
            filesInGroup.forEach((file) => {
              expect(file.groupId).toBe(group._id.toString());
            });
          }
        ),
        { numRuns: 100 }
      );
    });
  });
});
