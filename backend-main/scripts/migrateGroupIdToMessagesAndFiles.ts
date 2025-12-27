/**
 * Migration Script: Add groupId to existing Messages and ActivityFiles
 *
 * This script migrates existing messages and files to include groupId field.
 * It assigns a default groupId to all existing records that don't have one.
 *
 * Usage:
 *   ts-node scripts/migrateGroupIdToMessagesAndFiles.ts
 *
 * Options:
 *   --dry-run    Show what would be migrated without making changes
 *   --default-group-id=<id>  Specify default group ID (default: "default-group")
 */

import mongoose from "mongoose";
import dotenv from "dotenv";
import { Message, ActivityFile } from "../models";

dotenv.config();

const DEFAULT_GROUP_ID = process.argv.includes("--default-group-id")
  ? process.argv
      .find((arg) => arg.startsWith("--default-group-id="))
      ?.split("=")[1] || "default-group"
  : "default-group";

const DRY_RUN = process.argv.includes("--dry-run");

async function migrateMessages() {
  console.log("\n📧 Migrating Messages...");

  // Find messages without groupId
  const messagesWithoutGroupId = await Message.find({
    $or: [{ groupId: { $exists: false } }, { groupId: null }, { groupId: "" }],
  });

  console.log(
    `Found ${messagesWithoutGroupId.length} messages without groupId`
  );

  if (messagesWithoutGroupId.length === 0) {
    console.log("✅ No messages need migration");
    return { migrated: 0, skipped: 0 };
  }

  if (DRY_RUN) {
    console.log(
      `[DRY RUN] Would update ${messagesWithoutGroupId.length} messages with groupId: ${DEFAULT_GROUP_ID}`
    );
    return { migrated: 0, skipped: messagesWithoutGroupId.length };
  }

  // Update messages with default groupId
  const result = await Message.updateMany(
    {
      $or: [
        { groupId: { $exists: false } },
        { groupId: null },
        { groupId: "" },
      ],
    },
    { $set: { groupId: DEFAULT_GROUP_ID } }
  );

  console.log(`✅ Updated ${result.modifiedCount} messages`);

  return { migrated: result.modifiedCount, skipped: 0 };
}

async function migrateActivityFiles() {
  console.log("\n📁 Migrating Activity Files...");

  // Find files without groupId
  const filesWithoutGroupId = await ActivityFile.find({
    $or: [{ groupId: { $exists: false } }, { groupId: null }, { groupId: "" }],
  });

  console.log(
    `Found ${filesWithoutGroupId.length} activity files without groupId`
  );

  if (filesWithoutGroupId.length === 0) {
    console.log("✅ No activity files need migration");
    return { migrated: 0, skipped: 0 };
  }

  if (DRY_RUN) {
    console.log(
      `[DRY RUN] Would update ${filesWithoutGroupId.length} files with groupId: ${DEFAULT_GROUP_ID}`
    );
    return { migrated: 0, skipped: filesWithoutGroupId.length };
  }

  // Update files with default groupId
  const result = await ActivityFile.updateMany(
    {
      $or: [
        { groupId: { $exists: false } },
        { groupId: null },
        { groupId: "" },
      ],
    },
    { $set: { groupId: DEFAULT_GROUP_ID } }
  );

  console.log(`✅ Updated ${result.modifiedCount} activity files`);

  return { migrated: result.modifiedCount, skipped: 0 };
}

async function verifyMigration() {
  console.log("\n🔍 Verifying Migration...");

  const messagesWithoutGroupId = await Message.countDocuments({
    $or: [{ groupId: { $exists: false } }, { groupId: null }, { groupId: "" }],
  });

  const filesWithoutGroupId = await ActivityFile.countDocuments({
    $or: [{ groupId: { $exists: false } }, { groupId: null }, { groupId: "" }],
  });

  if (messagesWithoutGroupId === 0 && filesWithoutGroupId === 0) {
    console.log("✅ Verification passed: All records have groupId");
    return true;
  } else {
    console.log(
      `⚠️  Verification failed: ${messagesWithoutGroupId} messages and ${filesWithoutGroupId} files still missing groupId`
    );
    return false;
  }
}

async function main() {
  console.log("🚀 Starting GroupId Migration");
  console.log(`Mode: ${DRY_RUN ? "DRY RUN" : "LIVE"}`);
  console.log(`Default Group ID: ${DEFAULT_GROUP_ID}`);

  try {
    // Connect to MongoDB
    const mongoUri = process.env.MONGO_URI;
    if (!mongoUri) {
      throw new Error("MONGO_URI not found in environment variables");
    }

    console.log("\n📡 Connecting to MongoDB...");
    await mongoose.connect(mongoUri);
    console.log("✅ Connected to MongoDB");

    // Run migrations
    const messageResults = await migrateMessages();
    const fileResults = await migrateActivityFiles();

    // Verify migration (only in live mode)
    if (!DRY_RUN) {
      await verifyMigration();
    }

    // Summary
    console.log("\n📊 Migration Summary:");
    console.log(`Messages migrated: ${messageResults.migrated}`);
    console.log(`Activity files migrated: ${fileResults.migrated}`);
    console.log(
      `Total records migrated: ${
        messageResults.migrated + fileResults.migrated
      }`
    );

    if (DRY_RUN) {
      console.log(
        "\n💡 This was a dry run. Run without --dry-run to apply changes."
      );
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
