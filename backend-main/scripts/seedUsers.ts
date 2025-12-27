import mongoose from "mongoose";
import dotenv from "dotenv";
import admin from "firebase-admin";
import path from "path";
import { User } from "../models/User";

dotenv.config();

async function seedUsers() {
  try {
    // Connect to MongoDB
    const mongoUri = process.env.MONGO_URI;
    if (!mongoUri) {
      throw new Error("MONGO_URI not found in environment variables");
    }

    await mongoose.connect(mongoUri);
    console.log("✅ Connected to MongoDB");

    // Initialize Firebase Admin SDK if available
    let firebaseInitialized = false;
    try {
      if (!admin.apps.length) {
        // Option 1: Use environment variables
        if (
          process.env.FIREBASE_PROJECT_ID &&
          process.env.FIREBASE_PRIVATE_KEY &&
          process.env.FIREBASE_CLIENT_EMAIL
        ) {
          admin.initializeApp({
            credential: admin.credential.cert({
              projectId: process.env.FIREBASE_PROJECT_ID,
              privateKey: process.env.FIREBASE_PRIVATE_KEY.replace(
                /\\n/g,
                "\n"
              ),
              clientEmail: process.env.FIREBASE_CLIENT_EMAIL,
            }),
          });
          console.log(
            "✅ Firebase Admin SDK initialized from environment variables"
          );
        }
        // Option 2: Use service account file
        else {
          const serviceAccountPath = path.join(
            __dirname,
            "..",
            "firebase-service-account.json"
          );
          const serviceAccount = require(serviceAccountPath);
          admin.initializeApp({
            credential: admin.credential.cert(
              serviceAccount as admin.ServiceAccount
            ),
          });
          console.log(
            "✅ Firebase Admin SDK initialized from service account file"
          );
        }
      }
      firebaseInitialized = true;
    } catch (err) {
      console.warn(
        "⚠️  Firebase Admin SDK not initialized. Will only seed MongoDB."
      );
      console.warn("   Configure Firebase credentials to seed Firebase Auth.");
    }

    // Define seed users
    const seedData = [
      {
        firebaseUid: "seed-admin-uid",
        username: "admin",
        email: "admin@example.com",
        role: "admin" as const,
        profile: { displayName: "Admin User" },
      },
      {
        firebaseUid: "seed-user-uid",
        username: "student",
        email: "student@example.com",
        role: "student" as const,
        profile: { displayName: "Student User" },
      },
    ];

    // Upsert users in MongoDB
    for (const userData of seedData) {
      const user = await User.findOneAndUpdate(
        { firebaseUid: userData.firebaseUid },
        {
          $set: {
            username: userData.username,
            email: userData.email,
            role: userData.role,
            profile: userData.profile,
          },
          $setOnInsert: { loginTimes: [] },
        },
        { upsert: true, new: true, setDefaultsOnInsert: true }
      );
      console.log(
        `✅ MongoDB: Upserted user ${userData.email} (${userData.role})`
      );
    }

    // Optionally create users in Firebase Auth (only if they don't exist)
    if (firebaseInitialized) {
      for (const userData of seedData) {
        try {
          // Check if user exists
          await admin.auth().getUser(userData.firebaseUid);
          console.log(`ℹ️  Firebase: User ${userData.email} already exists`);
        } catch (err: any) {
          if (err.code === "auth/user-not-found") {
            // Create user in Firebase
            try {
              await admin.auth().createUser({
                uid: userData.firebaseUid,
                email: userData.email,
                password: "Password123!", // Default password - should be changed
                displayName: userData.profile.displayName,
              });
              console.log(`✅ Firebase: Created user ${userData.email}`);
            } catch (createErr: any) {
              console.error(
                `❌ Firebase: Failed to create user ${userData.email}:`,
                createErr.message
              );
            }
          } else {
            console.error(
              `❌ Firebase: Error checking user ${userData.email}:`,
              err.message
            );
          }
        }
      }
    }

    console.log("\n✅ Seed completed successfully!");
    console.log("\nSeeded users:");
    console.log("- admin@example.com (role: admin, uid: seed-admin-uid)");
    console.log("- student@example.com (role: student, uid: seed-user-uid)");
    if (firebaseInitialized) {
      console.log("\nDefault password for Firebase users: Password123!");
    }
  } catch (err) {
    console.error("❌ Seed failed:", err);
    process.exit(1);
  } finally {
    await mongoose.disconnect();
    console.log("\n✅ Disconnected from MongoDB");
    process.exit(0);
  }
}

seedUsers();
