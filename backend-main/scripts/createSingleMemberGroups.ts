/**
 * Migration Script: Create Single-Member Groups for Existing Users
 *
 * This script creates single-member groups for all existing users who don't
 * already have a group. Each student gets their own group for individual work.
 *
 * Usage:
 *   ts-node scripts/createSingleMemberGroups.ts
 *
 * Options:
 *   --dry-run           Show what would be created without making changes
 *   --admin-uid=<uid>   Specify admin UID for createdBy field (required in live mode)
 *   --level=<number>    Specify default level for groups (default: 1)
 */

import mongoose from "mongoose";
import dotenv from "dotenv";
import { User, Group } from "../models";

dotenv.config();

const DRY_RUN = process.argv.includes("--dry-run");
const ADMIN_UID =
  process.argv.find((arg) => arg.startsWith("--admin-uid="))?.split("=")[1] ||
  "";
const DEFAULT_LEVEL = parseInt(
  process.argv.find((arg) => arg.startsWith("--level="))?.split("=")[1] || "1",
  10
);

async function getUsersWithoutGroups() {
  console.log("\n👥 Finding users without groups...");

  // Get all users
  const allUsers = await User.find({ role: "student" }).lean();
  console.log(`Found ${allUsers.length} total students`);

  // Get all existing groups
  const existingGroups = await Group.find().lean();
  const usersWithGroups = new Set<string>();

  // Track which users already have groups
  existingGroups.forEach((group) => {
    group.members.forEach((memberId) => {
      // memberId is now ObjectId, convert to string for Set consistency if needed or keep as is
      usersWithGroups.add(memberId.toString());
    });
  });

  // Filter users without groups
  const usersWithoutGroups = allUsers.filter(
    (user) => !usersWithGroups.has(user._id.toString())
  );

  console.log(`Found ${usersWithoutGroups.length} students without groups`);

  return usersWithoutGroups;
}

async function createGroupsForUsers(users: any[]) {
  console.log("\n🏗️  Creating single-member groups...");

  if (users.length === 0) {
    console.log("✅ No groups need to be created");
    return { created: 0, skipped: 0 };
  }

  if (DRY_RUN) {
    console.log(`[DRY RUN] Would create ${users.length} groups:`);
    users.forEach((user, index) => {
      console.log(
        `  ${index + 1}. Group for ${user.username} (${user.firebaseUid})`
      );
    });
    return { created: 0, skipped: users.length };
  }

  if (!ADMIN_UID) {
    throw new Error(
      "Admin UID is required in live mode. Use --admin-uid=<uid>"
    );
  }

  let created = 0;
  const errors: string[] = [];

  for (const user of users) {
    try {
      const groupName = `${user.username || user.name || "Student"}'s Group`;

      await (Group as any).create({
        name: groupName,
        type: "single",
        members: [user._id],
        level: DEFAULT_LEVEL,
        createdBy: ADMIN_UID,
      });

      created++;
      console.log(
        `✅ Created group for ${user.username} (${user.firebaseUid})`
      );
    } catch (error: any) {
      errors.push(
        `Failed to create group for ${user.username}: ${error.message}`
      );
      console.error(`❌ Error creating group for ${user.username}:`, error);
    }
  }

  if (errors.length > 0) {
    console.log(`\n⚠️  ${errors.length} errors occurred:`);
    errors.forEach((err) => console.log(`  - ${err}`));
  }

  return { created, skipped: 0 };
}

async function verifyGroups() {
  console.log("\n🔍 Verifying groups...");

  const students = await User.find({ role: "student" }).lean();
  const groups = await Group.find().lean();

  const usersWithGroups = new Set<string>();
  groups.forEach((group) => {
    group.members.forEach((memberId) => {
      usersWithGroups.add(memberId.toString());
    });
  });

  const studentsWithoutGroups = students.filter(
    (student) => !usersWithGroups.has(student._id.toString())
  );

  if (studentsWithoutGroups.length === 0) {
    console.log("✅ Verification passed: All students have groups");
    return true;
  } else {
    console.log(
      `⚠️  Verification failed: ${studentsWithoutGroups.length} students still without groups`
    );
    studentsWithoutGroups.forEach((student) => {
      console.log(`  - ${student.username} (${student.firebaseUid})`);
    });
    return false;
  }
}

async function displayGroupStats() {
  console.log("\n📊 Group Statistics:");

  const totalGroups = await Group.countDocuments();
  const singleGroups = await Group.countDocuments({ type: "single" });
  const multiGroups = await Group.countDocuments({ type: "multi" });

  console.log(`Total groups: ${totalGroups}`);
  console.log(`Single-member groups: ${singleGroups}`);
  console.log(`Multi-member groups: ${multiGroups}`);

  const totalStudents = await User.countDocuments({ role: "student" });
  const groups = await Group.find().lean();
  const studentsInGroups = new Set<string>();
  groups.forEach((group) => {
    group.members.forEach((memberId) => studentsInGroups.add(memberId.toString()));
  });

  console.log(`Total students: ${totalStudents}`);
  console.log(`Students in groups: ${studentsInGroups.size}`);
  console.log(
    `Students without groups: ${totalStudents - studentsInGroups.size}`
  );
}

async function main() {
  console.log("🚀 Starting Single-Member Group Creation");
  console.log(`Mode: ${DRY_RUN ? "DRY RUN" : "LIVE"}`);
  console.log(`Admin UID: ${ADMIN_UID || "(not set)"}`);
  console.log(`Default Level: ${DEFAULT_LEVEL}`);

  try {
    // Connect to MongoDB
    const mongoUri = process.env.MONGO_URI;
    if (!mongoUri) {
      throw new Error("MONGO_URI not found in environment variables");
    }

    console.log("\n📡 Connecting to MongoDB...");
    await mongoose.connect(mongoUri);
    console.log("✅ Connected to MongoDB");

    // Get users without groups
    const usersWithoutGroups = await getUsersWithoutGroups();

    // Create groups
    const results = await createGroupsForUsers(usersWithoutGroups);

    // Verify (only in live mode)
    if (!DRY_RUN) {
      await verifyGroups();
    }

    // Display statistics
    await displayGroupStats();

    // Summary
    console.log("\n📊 Migration Summary:");
    console.log(`Groups created: ${results.created}`);
    console.log(`Users processed: ${usersWithoutGroups.length}`);

    if (DRY_RUN) {
      console.log(
        "\n💡 This was a dry run. Run without --dry-run to apply changes."
      );
      console.log("💡 Don't forget to specify --admin-uid=<uid> in live mode.");
    } else {
      console.log("\n✅ Migration completed successfully!");
    }
  } catch (error) {
    console.error("\n❌ Migration failed:", error);
    process.exit(1);
  } finally {
    await mongoose.disconnect();
    console.log("\n📡 Disconnected from MongoDB");
  }
}

// Run migration
main();
