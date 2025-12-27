import mongoose from "mongoose";
import dotenv from "dotenv";
import { User } from "../models/User";

dotenv.config();

/**
 * Migration script to consolidate old UserModel and StudentModel data
 * into the new unified User model
 */

interface OldUserDoc {
  _id: any;
  name: string;
  email: string;
  avatar?: string;
  role?: string;
  createdAt?: Date;
  updatedAt?: Date;
}

interface OldStudentDoc {
  _id: any;
  email: string;
  name: string;
  avatar?: string | null;
  registeredAt?: Date;
  lastActivityAt?: Date;
  status?: string;
  createdAt?: Date;
  updatedAt?: Date;
}

async function migrateUsers() {
  try {
    // Connect to MongoDB
    const mongoUri = process.env.MONGO_URI;
    if (!mongoUri) {
      throw new Error("MONGO_URI not found in environment variables");
    }

    await mongoose.connect(mongoUri);
    console.log("✅ Connected to MongoDB");

    // Get old collections
    const db = mongoose.connection.db;
    const collections = await db.listCollections().toArray();
    const collectionNames = collections.map((c) => c.name);

    console.log("\n📋 Found collections:", collectionNames.join(", "));

    let migratedCount = 0;
    let skippedCount = 0;
    let errorCount = 0;

    // Migrate from old 'students' collection
    if (collectionNames.includes("students")) {
      console.log("\n🔄 Migrating from 'students' collection...");
      const studentsCollection = db.collection<OldStudentDoc>("students");
      const students = await studentsCollection.find({}).toArray();

      console.log(`   Found ${students.length} student records`);

      for (const student of students) {
        try {
          // Check if user already exists in new model
          const existing = await User.findOne({ email: student.email });

          if (existing) {
            console.log(`   ⏭️  Skipping ${student.email} (already exists)`);
            skippedCount++;
            continue;
          }

          // Generate firebaseUid placeholder (will be updated on first login)
          const firebaseUid = `migrated-${student._id.toString()}`;

          // Generate username from email
          const username = student.email.split("@")[0];

          // Create new user record
          await User.create({
            firebaseUid,
            username,
            name: student.name,
            email: student.email,
            avatar: student.avatar || null,
            role: "student",
            loginTimes: [],
            registeredAt:
              student.registeredAt || student.createdAt || new Date(),
            lastActivityAt: student.lastActivityAt || new Date(),
            status: (student.status as any) || "active",
            profile: {},
          });

          console.log(`   ✅ Migrated ${student.email}`);
          migratedCount++;
        } catch (err: any) {
          console.error(`   ❌ Error migrating ${student.email}:`, err.message);
          errorCount++;
        }
      }
    }

    // Migrate from old 'users' collection (if different from students)
    if (collectionNames.includes("users")) {
      console.log("\n🔄 Checking 'users' collection...");
      const usersCollection = db.collection<OldUserDoc>("users");
      const oldUsers = await usersCollection.find({}).toArray();

      console.log(`   Found ${oldUsers.length} user records`);

      for (const oldUser of oldUsers) {
        try {
          // Check if user already exists in new model
          const existing = await User.findOne({ email: oldUser.email });

          if (existing) {
            // Update role if it's admin
            if (oldUser.role === "admin" && existing.role !== "admin") {
              await User.updateOne(
                { email: oldUser.email },
                { $set: { role: "admin" } }
              );
              console.log(`   🔄 Updated ${oldUser.email} role to admin`);
            } else {
              console.log(`   ⏭️  Skipping ${oldUser.email} (already exists)`);
            }
            skippedCount++;
            continue;
          }

          // Generate firebaseUid placeholder
          const firebaseUid = `migrated-${oldUser._id.toString()}`;

          // Generate username from email
          const username = oldUser.email.split("@")[0];

          // Create new user record
          await User.create({
            firebaseUid,
            username,
            name: oldUser.name,
            email: oldUser.email,
            avatar: oldUser.avatar || null,
            role: (oldUser.role as any) || "student",
            loginTimes: [],
            registeredAt: oldUser.createdAt || new Date(),
            lastActivityAt: new Date(),
            status: "active",
            profile: {},
          });

          console.log(`   ✅ Migrated ${oldUser.email}`);
          migratedCount++;
        } catch (err: any) {
          console.error(`   ❌ Error migrating ${oldUser.email}:`, err.message);
          errorCount++;
        }
      }
    }

    // Summary
    console.log("\n" + "=".repeat(50));
    console.log("📊 Migration Summary:");
    console.log(`   ✅ Migrated: ${migratedCount}`);
    console.log(`   ⏭️  Skipped: ${skippedCount}`);
    console.log(`   ❌ Errors: ${errorCount}`);
    console.log("=".repeat(50));

    if (migratedCount > 0) {
      console.log("\n⚠️  IMPORTANT NOTES:");
      console.log("   1. Migrated users have placeholder firebaseUid values");
      console.log(
        "   2. These will be updated when users log in with Firebase Auth"
      );
      console.log("   3. Old collections (students, users) are NOT deleted");
      console.log("   4. You can safely delete them after verifying migration");
      console.log("\n   To delete old collections:");
      console.log("   > db.students.drop()");
      console.log("   > db.users.drop()  (if it's the old model)");
    }

    console.log("\n✅ Migration completed successfully!");
  } catch (err) {
    console.error("❌ Migration failed:", err);
    process.exit(1);
  } finally {
    await mongoose.disconnect();
    console.log("\n✅ Disconnected from MongoDB");
    process.exit(0);
  }
}

// Run migration
migrateUsers();
