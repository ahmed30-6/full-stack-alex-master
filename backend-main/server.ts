import express, { Request, Response } from "express";
import mongoose from "mongoose";
import cors from "cors";
import dotenv from "dotenv";
import admin from "firebase-admin";
import path from "path";
import { getFirestore, Timestamp } from "firebase-admin/firestore";
import { createServer } from "http";

// Note: small no-op change to force nodemon to restart when .env is updated

// تحميل المتغيرات من ملف .env
dotenv.config();

const app = express();

// Initialize Firestore
let db: FirebaseFirestore.Firestore | null = null;

// ✅ CORS configured for Railway + Socket.IO compatibility
app.use(
  cors({
    origin: true,
    credentials: true,
  })
);

// دعم قراءة JSON من البوادي
app.use(express.json());

// Import routes
import syncRoutes from "./routes/sync";
import groupRoutes from "./routes/groups";
import examRoutes from "./routes/exams";

// ✅ الاتصال بقاعدة بيانات MongoDB
console.log(
  "MongoDB URI:",
  process.env.MONGO_URI ? "*** exists ***" : "*** missing ***"
);

if (!process.env.MONGO_URI) {
  console.error("❌ MONGO_URI environment variable is not set!");
  process.exit(1);
}

mongoose
  .connect(process.env.MONGO_URI as string)
  .then(() => {
    console.log("✅ MongoDB connected successfully");
    console.log("   Database:", mongoose.connection.name);
    console.log("   Host:", mongoose.connection.host);
  })
  .catch((err) => {
    console.error("❌ MongoDB connection error:", err);
    console.error("   Please check your MONGO_URI environment variable");
    process.exit(1);
  });

// Monitor MongoDB connection state
mongoose.connection.on("connected", () => {
  console.log("🔗 MongoDB connection established");
});

mongoose.connection.on("disconnected", () => {
  console.warn("⚠️  MongoDB connection lost");
});

mongoose.connection.on("error", (err) => {
  console.error("❌ MongoDB connection error:", err);
});

// ✅ Route للتأكد من أن السيرفر شغال
app.get("/api/health", (req: Request, res: Response) => {
  res.json({
    status: "OK",
    message: "Server is running!",
    database:
      mongoose.connection.readyState === 1 ? "Connected" : "Disconnected",
  });
});

// Initialize Firebase Admin SDK
try {
  // Option 1: Use environment variables (recommended for production)
  if (
    process.env.FIREBASE_PROJECT_ID &&
    process.env.FIREBASE_PRIVATE_KEY &&
    process.env.FIREBASE_CLIENT_EMAIL
  ) {
    admin.initializeApp({
      credential: admin.credential.cert({
        projectId: process.env.FIREBASE_PROJECT_ID,
        privateKey: process.env.FIREBASE_PRIVATE_KEY.replace(/\\n/g, "\n"),
        clientEmail: process.env.FIREBASE_CLIENT_EMAIL,
      }),
    });
    console.log("✅ Firebase Admin initialized from environment variables.");
  }
  // Option 2: Use service account file (development only)
  else {
    const serviceAccountPath = path.join(
      __dirname,
      "firebase-service-account.json"
    );
    // eslint-disable-next-line @typescript-eslint/no-var-requires
    const serviceAccount = require(serviceAccountPath);
    admin.initializeApp({
      credential: admin.credential.cert(serviceAccount as admin.ServiceAccount),
    });
    console.log("✅ Firebase Admin initialized from service account file.");
  }

  db = getFirestore();
} catch (err) {
  console.warn(
    "⚠️  Firebase Admin SDK not initialized. Some endpoints may be restricted."
  );
  console.warn(
    "   Please configure Firebase credentials via environment variables or service account file."
  );
  console.warn("   See README.md for setup instructions.");
}

// Register routes
app.use("/api/sync", syncRoutes);
import activityRoutes from "./routes/activity";
app.use("/api/activity", activityRoutes);
app.use("/api/groups", groupRoutes);
app.use("/api/exams", examRoutes);
import contentRoutes from "./routes/content";
app.use("/api/content", contentRoutes);


// ✅ مثال على Endpoint بدون حماية
app.post("/api/addData", async (req: Request, res: Response) => {
  try {
    const { name, email } = req.body;

    res.json({
      message: "✅ Data stored successfully",
      data: {
        name,
        email,
        timestamp: new Date().toISOString(),
      },
    });
  } catch (error) {
    console.error("Error in /api/addData:", error);
    res.status(500).json({ error: "Internal server error" });
  }
});

// Import models
import { Schema, model } from "mongoose";
import { User } from "./models/User";
import {
  validate,
  validateQuery,
  validateParams,
} from "./middleware/validation";
import { normalizeUserInput } from "./middleware/normalize";
import {
  createUserSchema,
  getUsersQuerySchema,
  profileSchema,
  loginEventSchema,
  appDataSchema,
  appDataParamsSchema,
  submissionSchema,
} from "./validators/schemas";

interface LoginEventDoc {
  name: string;
  email: string;
  userAgent?: string;
  ip?: string;
  timestamp: Date;
}

const LoginEventSchema = new Schema<LoginEventDoc>({
  name: { type: String, required: true },
  email: { type: String, required: true },
  userAgent: { type: String },
  ip: { type: String },
  timestamp: { type: Date, default: Date.now },
});

const LoginEvent = model<LoginEventDoc>("LoginEvent", LoginEventSchema);

// Endpoint to record a login event
// Endpoint to record a login event. Requires a valid Firebase ID token in the Authorization header.
app.post(
  "/api/loginEvent",
  normalizeUserInput,
  validate(loginEventSchema),
  async (req: Request, res: Response) => {
    try {
      const authHeader = req.headers.authorization || "";
      const token = authHeader.startsWith("Bearer ")
        ? authHeader.split(" ")[1]
        : null;

      if (!token || !admin.apps.length) {
        return res.status(401).json({ error: "Authentication required" });
      }

      let decoded: admin.auth.DecodedIdToken;
      try {
        decoded = await admin.auth().verifyIdToken(token);
      } catch (err) {
        return res.status(401).json({ error: "Invalid auth token" });
      }

      const email = decoded.email || req.body.email;
      let userAgent = req.body.userAgent || req.headers["user-agent"] || "";
      let ip = req.ip || req.headers["x-forwarded-for"] || "";
      if (Array.isArray(ip)) ip = ip[0];
      if (typeof ip !== "string") ip = String(ip);

      if (!email) return res.status(400).json({ error: "email required" });

      // MongoDB User collection is the ONLY source of truth for user names
      const user = await User.findOne({ email });

      if (!user) {
        console.warn("LoginEvent: user not found in MongoDB for email:", email);
      }

      const resolvedName =
        user?.username ||
        user?.name ||
        "مستخدم";

      const doc = await LoginEvent.create({
        name: resolvedName,
        email,
        userAgent,
        ip,
        timestamp: new Date(),
      });
      res.json({ message: "Login event recorded", data: doc });
    } catch (err) {
      console.error("Error in /api/loginEvent:", err);
      res.status(500).json({ error: "Internal server error" });
    }
  }
);

// Endpoint to fetch recent login events (admin)
// Only admin can fetch login events. Requires Firebase ID token and matching admin email.
app.get("/api/loginEvents", async (req: Request, res: Response) => {
  try {
    const authHeader = req.headers.authorization || "";
    const token = authHeader.startsWith("Bearer ")
      ? authHeader.split(" ")[1]
      : null;

    if (!token || !admin.apps.length) {
      return res.status(401).json({ error: "Authentication required" });
    }

    let decoded: admin.auth.DecodedIdToken;
    try {
      decoded = await admin.auth().verifyIdToken(token);
    } catch (err) {
      return res.status(401).json({ error: "Invalid auth token" });
    }

    // Allow only the configured admin email to read events
    const adminEmail = process.env.ADMIN_EMAIL || "";
    if (!adminEmail || decoded.email !== adminEmail) {
      return res.status(403).json({ error: "Forbidden" });
    }

    const events = await LoginEvent.find({})
      .sort({ timestamp: -1 })
      .limit(100)
      .lean();
    res.json({ events });
  } catch (err) {
    console.error("Error in /api/loginEvents:", err);
    res.status(500).json({ error: "Internal server error" });
  }
});

// POST /api/admin/exam - Update exam data (admin only)
app.post("/api/admin/exam", async (req: Request, res: Response) => {
  try {
    const authHeader = req.headers.authorization || "";
    const token = authHeader.startsWith("Bearer ")
      ? authHeader.split(" ")[1]
      : null;

    if (!token || !admin.apps.length) {
      return res.status(401).json({ error: "Authentication required" });
    }

    let decoded: admin.auth.DecodedIdToken;
    try {
      decoded = await admin.auth().verifyIdToken(token);
    } catch (err) {
      return res.status(401).json({ error: "Invalid auth token" });
    }

    // Only admin can update exams
    const adminEmail = process.env.ADMIN_EMAIL || "";
    if (!adminEmail || decoded.email !== adminEmail) {
      return res
        .status(403)
        .json({ error: "Forbidden: Admin access required" });
    }

    const examData = req.body;

    // Emit real-time event to all students
    const { RealtimeService } = await import("./services");
    RealtimeService.emitExamUpdated(examData);

    res.json({
      success: true,
      message: "Exam updated and broadcast to all students",
      exam: examData,
    });
  } catch (err) {
    console.error("Error in /api/admin/exam:", err);
    res.status(500).json({ error: "Internal server error" });
  }
});

// POST /api/admin/news - Update news data (admin only)
app.post("/api/admin/news", async (req: Request, res: Response) => {
  try {
    const authHeader = req.headers.authorization || "";
    const token = authHeader.startsWith("Bearer ")
      ? authHeader.split(" ")[1]
      : null;

    if (!token || !admin.apps.length) {
      return res.status(401).json({ error: "Authentication required" });
    }

    let decoded: admin.auth.DecodedIdToken;
    try {
      decoded = await admin.auth().verifyIdToken(token);
    } catch (err) {
      return res.status(401).json({ error: "Invalid auth token" });
    }

    // Only admin can update news
    const adminEmail = process.env.ADMIN_EMAIL || "";
    if (!adminEmail || decoded.email !== adminEmail) {
      return res
        .status(403)
        .json({ error: "Forbidden: Admin access required" });
    }

    const newsData = req.body;

    // Emit real-time event to all students
    const { RealtimeService } = await import("./services");
    RealtimeService.emitNewsUpdated(newsData);

    res.json({
      success: true,
      message: "News updated and broadcast to all students",
      news: newsData,
    });
  } catch (err) {
    console.error("Error in /api/admin/news:", err);
    res.status(500).json({ error: "Internal server error" });
  }
});

// ✅ تشغيل السيرفر

const PORT = Number(process.env.PORT) || 5001;

// Create HTTP server for Socket.io
const httpServer = createServer(app);

// Initialize Socket.io
import { RealtimeService } from "./services";
// Socket.IO temporarily disabled for safe shutdown
// RealtimeService.initialize(httpServer);

httpServer.listen(PORT, "0.0.0.0", () => {
  console.log("🚀 Backend server booted");
  console.log("🚀 Server running on 0.0.0.0:" + PORT);
});

// Create or update a user (authenticated)
app.post(
  "/api/users",
  normalizeUserInput,
  validate(createUserSchema),
  async (req: Request, res: Response) => {
    try {
      const authHeader = req.headers.authorization || "";
      const token = authHeader.startsWith("Bearer ")
        ? authHeader.split(" ")[1]
        : null;

      if (!token || !admin.apps.length) {
        return res.status(401).json({ error: "Authentication required" });
      }

      let decoded: admin.auth.DecodedIdToken;
      try {
        decoded = await admin.auth().verifyIdToken(token);
      } catch (err) {
        return res.status(401).json({ error: "Invalid auth token" });
      }

      const { name, email, avatar, updateName } = req.body;
      const emailToUse = decoded.email || email;
      const firebaseUid = decoded.uid;

      if (!emailToUse) return res.status(400).json({ error: "email required" });

      // Prevent users from creating/updating other users unless admin
      const adminEmail = process.env.ADMIN_EMAIL || "";
      if (decoded.email !== emailToUse && decoded.email !== adminEmail) {
        return res
          .status(403)
          .json({ error: "Forbidden to create/update other users" });
      }

      // Check if user already exists
      let existingUser = await User.findOne({
        $or: [{ email: emailToUse }, { firebaseUid }],
      }).lean();
      let isNewUser = !existingUser;

      // Determine final name
      let finalName = "";
      if (isNewUser) {
        // New user: Use provided name, fallback to Firebase name
        finalName = name || decoded.name || "";
      } else {
        // Existing user: Preserve existing name unless explicitly updating
        const existingName = existingUser?.name;
        if (updateName === true) {
          // Explicit update requested: Use new name, fallback to existing
          finalName = name || existingName || decoded.name || "";
        } else {
          // No update requested: PRESERVE existing name, ignore request name
          // Only use decoded.name if existing name is missing (data recovery)
          finalName = existingName || decoded.name || "";
        }
      }

      // Generate username from email if not provided
      const username = emailToUse.split("@")[0];

      // 🔒 CRITICAL: Determine role from .env ONLY (backend is single source of truth)
      const isAdmin = emailToUse === adminEmail;
      const userRole = isAdmin ? "admin" : "student";

      // Upsert user with unified model
      const now = new Date();
      const user = await User.findOneAndUpdate(
        { firebaseUid },
        {
          $set: {
            name: finalName,
            username,
            email: emailToUse,
            avatar: avatar || null,
            lastActivityAt: now,
            status: "active",
            role: userRole, // ✅ Role determined from .env on EVERY upsert
          },
          $setOnInsert: {
            firebaseUid,
            loginTimes: [],
            registeredAt: now,
            profile: {},
          },
        },
        { upsert: true, new: true, setDefaultsOnInsert: true }
      ).lean();

      console.log(`✅ User ${emailToUse} saved with name "${finalName}"`);

      res.json({ user });
    } catch (err) {
      console.error("Error in /api/users POST:", err);
      res.status(500).json({ error: "Internal server error" });
    }
  }
);

// GET users (admin-only)
app.get(
  "/api/users",
  validateQuery(getUsersQuerySchema),
  async (req: Request, res: Response) => {
    try {
      const authHeader = req.headers.authorization || "";
      const token = authHeader.startsWith("Bearer ")
        ? authHeader.split(" ")[1]
        : null;

      if (!token || !admin.apps.length) {
        return res.status(401).json({ error: "Authentication required" });
      }

      let decoded: admin.auth.DecodedIdToken;
      try {
        decoded = await admin.auth().verifyIdToken(token);
      } catch (err) {
        return res.status(401).json({ error: "Invalid auth token" });
      }

      const adminEmail = process.env.ADMIN_EMAIL || "";
      if (!adminEmail || decoded.email !== adminEmail) {
        return res.status(403).json({ error: "Forbidden" });
      }

      // Query parameters for filtering
      const { role, status, limit = 1000, skip = 0 } = req.query;

      // Build query
      const query: any = {};
      if (role) query.role = role;
      if (status) query.status = status;

      // Return users from unified User model
      try {
        const users = await User.find(query)
          .sort({ registeredAt: -1 })
          .limit(Number(limit))
          .skip(Number(skip))
          .select("-loginTimes") // Exclude loginTimes array for performance
          .lean();

        const total = await User.countDocuments(query);

        return res.json({
          users,
          pagination: {
            total,
            limit: Number(limit),
            skip: Number(skip),
            hasMore: Number(skip) + users.length < total,
          },
        });
      } catch (err) {
        console.warn("Failed to read users from MongoDB:", err);
        return res.status(500).json({ error: "Failed to read users" });
      }
    } catch (err) {
      console.error("Error in /api/users GET:", err);
      res.status(500).json({ error: "Internal server error" });
    }
  }
);

// ============ App Data Storage (save all user data to MongoDB) ============

// App Data schema - stores all app state per user
interface AppDataDoc {
  email: string;
  moduleScores?: any;
  completedLessons?: any;
  finalQuizPassed?: boolean;
  unlockedModules?: number[];
  currentActivityId?: number | null;
  currentModuleId?: number | null;
  moduleLessonIndex?: number;
  modulePageIndex?: number;
  learningPathTopic?: string | null;
  groups?: any[];
  discussions?: any[];
  newsItems?: any[];
  updatedAt?: Date;
}

const AppDataSchema = new Schema<AppDataDoc>(
  {
    email: { type: String, required: true, unique: true },
    moduleScores: { type: Schema.Types.Mixed, default: {} },
    completedLessons: { type: Schema.Types.Mixed, default: {} },
    finalQuizPassed: { type: Boolean, default: false },
    unlockedModules: { type: [Number], default: [1] },
    currentActivityId: { type: Number, default: null },
    currentModuleId: { type: Number, default: null },
    moduleLessonIndex: { type: Number, default: 0 },
    modulePageIndex: { type: Number, default: 0 },
    learningPathTopic: { type: String, default: null },
  },
  { timestamps: true }
);

const AppDataModel = model<AppDataDoc>("AppData", AppDataSchema);

// FIX PROBLEM 3: Admin Dashboard Route
// GET /api/appdata/all (Admin only)
app.get("/api/appdata/all", async (req: Request, res: Response) => {
  try {
    const authHeader = req.headers.authorization || "";
    const token = authHeader.startsWith("Bearer ")
      ? authHeader.split(" ")[1]
      : null;

    if (!token || !admin.apps.length) {
      return res.status(401).json({ error: "Authentication required" });
    }

    let decoded;
    try {
      decoded = await admin.auth().verifyIdToken(token);
    } catch (err) {
      return res.status(401).json({ error: "Invalid auth token" });
    }

    // Admin check
    const adminEmail = process.env.ADMIN_EMAIL || "";
    if (!adminEmail || decoded.email !== adminEmail) {
      return res.status(403).json({ error: "Forbidden: Admin access required" });
    }

    // Return all app data
    const appdata = await AppDataModel.find({}).lean();

    // Normalize if needed, but simple return is sufficient for dashboard
    res.json({ appdata });
  } catch (err) {
    console.error("Error in GET /api/appdata/all:", err);
    res.status(500).json({ error: "Internal server error" });
  }
});

// Save app data for user (authenticated)
app.post(
  "/api/appdata",
  validate(appDataSchema),
  async (req: Request, res: Response) => {
    try {
      const authHeader = req.headers.authorization || "";
      const token = authHeader.startsWith("Bearer ")
        ? authHeader.split(" ")[1]
        : null;

      if (!token || !admin.apps.length) {
        return res.status(401).json({ error: "Authentication required" });
      }

      let decoded: admin.auth.DecodedIdToken;
      try {
        decoded = await admin.auth().verifyIdToken(token);
      } catch (err) {
        return res.status(401).json({ error: "Invalid auth token" });
      }

      const email = decoded.email;
      if (!email) return res.status(400).json({ error: "email required" });

      const {
        moduleScores,
        completedLessons,
        finalQuizPassed,
        unlockedModules,
        currentActivityId,
        currentModuleId,
        moduleLessonIndex,
        modulePageIndex,
        learningPathTopic,
      } = req.body;

      // START FIX PROBLEM 2: Validate numeric scores
      if (moduleScores) {
        for (const key in moduleScores) {
          const scoreData = moduleScores[key];
          if (scoreData && typeof scoreData === "object") {
            if (scoreData.preTestScore !== undefined && scoreData.preTestScore !== null && typeof scoreData.preTestScore !== "number") {
              return res.status(400).json({ error: "Invalid score data: preTestScore must be a number" });
            }
            if (scoreData.postTestScore !== undefined && scoreData.postTestScore !== null && typeof scoreData.postTestScore !== "number") {
              return res.status(400).json({ error: "Invalid score data: postTestScore must be a number" });
            }
          }
        }
      }
      // END FIX PROBLEM 2

      // Get current learning path state for validation
      let currentPath: any = null;
      try {
        currentPath = await AppDataModel.findOne({ email }).lean();
        if (!currentPath) {
          // Initialize default state for new users
          currentPath = {
            email,
            moduleScores: {},
            completedLessons: {},
            finalQuizPassed: false,
            unlockedModules: [1],
            currentActivityId: null,
            currentModuleId: null,
            moduleLessonIndex: 0,
            modulePageIndex: 0,
            learningPathTopic: null,
            groups: [],
            discussions: [],
            newsItems: [],
          };
        }
      } catch (err) {
        console.warn("Failed to read current appdata:", err);
        return res.status(500).json({ error: "Failed to read current state" });
      }

      // Validate learning path updates
      const { LearningPathService } = await import("./services");
      const updates = {
        moduleScores,
        completedLessons,
        finalQuizPassed,
        unlockedModules,
        currentActivityId,
        currentModuleId,
        moduleLessonIndex,
        modulePageIndex,
        learningPathTopic,
      };

      const validationResult = LearningPathService.validateUpdate(
        currentPath,
        updates
      );

      if (!validationResult.valid) {
        return res.status(400).json({
          success: false,
          error: "Learning path validation failed",
          details: validationResult.errors,
        });
      }

      // Persist app state in MongoDB 'appdata' collection (AppDataModel)
      try {
        const now = new Date();
        const payload = {
          moduleScores: moduleScores || {},
          completedLessons: completedLessons || {},
          finalQuizPassed: finalQuizPassed || false,
          unlockedModules: unlockedModules || [1],
          currentActivityId: currentActivityId || null,
          currentModuleId: currentModuleId || null,
          moduleLessonIndex: moduleLessonIndex || 0,
          modulePageIndex: modulePageIndex || 0,
          learningPathTopic: learningPathTopic || null,
          updatedAt: now,
        };

        await AppDataModel.findOneAndUpdate(
          { email },
          { $set: payload, $setOnInsert: { email } },
          { upsert: true, new: true, setDefaultsOnInsert: true }
        );
      } catch (err) {
        console.warn("Failed to write appdata to MongoDB:", err);
        return res.status(500).json({ error: "Failed to write appdata" });
      }

      // Optionally record activity to MongoDB
      if (finalQuizPassed || currentActivityId) {
        try {
          const activityDesc = finalQuizPassed
            ? "اكمل الاختبار النهائي"
            : `أكمل النشاط ${currentActivityId}`;
          // Simple activity model via Mongoose collection
          const ActivitySchema = new Schema(
            {
              userEmail: String,
              userName: String,
              action: String,
              description: String,
              timestamp: Date,
              moduleId: Number,
              score: Schema.Types.Mixed,
            },
            { timestamps: true }
          );
          const ActivityModel = model("Activity", ActivitySchema);
          await ActivityModel.create({
            userEmail: email,
            userName: decoded.name || "",
            action: finalQuizPassed
              ? "final_quiz_completed"
              : "activity_completed",
            description: activityDesc,
            timestamp: new Date(),
            moduleId: currentModuleId,
            score: moduleScores?.[currentModuleId]?.postTestScore || null,
          });
        } catch (err) {
          console.warn("Failed to record activity to MongoDB:", err);
        }
      }

      // Persist groups to MongoDB 'groups' collection
      // FIX PROBLEM 5: Remove conflicting group persistence. 
      // Group logic MUST proceed through key `/api/groups` endpoints only.
      // if (groups && Array.isArray(groups)) { ... } -> DISABLED
      /* 
      if (groups && Array.isArray(groups)) {
        try {
          // ... logic removed to prevent conflicts ...
        } catch (err) {
          console.warn("Failed to write groups to MongoDB:", err);
        }
      }
      */

      // Return the saved app data from MongoDB
      try {
        const saved = await AppDataModel.findOne({ email }).lean();
        res.json({ appData: saved || null });
      } catch (err) {
        console.warn("Failed to read saved appdata from MongoDB:", err);
        return res.status(500).json({ error: "Failed to read appdata" });
      }
    } catch (err) {
      console.error("Error in /api/appdata POST:", err);
      res.status(500).json({ error: "Internal server error" });
    }
  }
);

// Get app data for user (authenticated)
app.get("/api/appdata", async (req: Request, res: Response) => {
  try {
    const authHeader = req.headers.authorization || "";
    const token = authHeader.startsWith("Bearer ")
      ? authHeader.split(" ")[1]
      : null;

    if (!token || !admin.apps.length) {
      return res.status(401).json({ error: "Authentication required" });
    }

    let decoded: admin.auth.DecodedIdToken;
    try {
      decoded = await admin.auth().verifyIdToken(token);
    } catch (err) {
      return res.status(401).json({ error: "Invalid auth token" });
    }

    const email = decoded.email;
    if (!email) return res.status(400).json({ error: "email required" });

    // Read app data from MongoDB
    try {
      const appData = await AppDataModel.findOne({ email }).lean();
      return res.json({ appData: appData || null });
    } catch (err) {
      console.warn("Failed to read appdata from MongoDB:", err);
      return res.status(500).json({ error: "Failed to read appdata" });
    }
  } catch (err) {
    console.error("Error in /api/appdata GET:", err);
    res.status(500).json({ error: "Internal server error" });
  }
});

// GET app data for specific user (admin only)
app.get(
  "/api/appdata/:uid",
  validateParams(appDataParamsSchema),
  async (req: Request, res: Response) => {
    try {
      const authHeader = req.headers.authorization || "";
      const token = authHeader.startsWith("Bearer ")
        ? authHeader.split(" ")[1]
        : null;

      if (!token || !admin.apps.length) {
        return res.status(401).json({ error: "Authentication required" });
      }

      let decoded: admin.auth.DecodedIdToken;
      try {
        decoded = await admin.auth().verifyIdToken(token);
      } catch (err) {
        return res.status(401).json({ error: "Invalid auth token" });
      }

      // Only admin can view other users' app data
      const adminEmail = process.env.ADMIN_EMAIL || "";
      if (!adminEmail || decoded.email !== adminEmail) {
        return res
          .status(403)
          .json({ error: "Forbidden: Admin access required" });
      }

      const { uid } = req.params;

      // Find user by firebaseUid
      const user = await User.findOne({ firebaseUid: uid }).lean();
      if (!user) {
        return res.status(404).json({ error: "User not found" });
      }

      // Get app data for this user
      const appData = await AppDataModel.findOne({ email: user.email }).lean();

      res.json({
        success: true,
        user: {
          firebaseUid: user.firebaseUid,
          username: user.username,
          name: user.name,
          email: user.email,
          role: user.role,
        },
        appData: appData || null,
      });
    } catch (err) {
      console.error("Error in /api/appdata/:uid GET:", err);
      res.status(500).json({ error: "Internal server error" });
    }
  }
);

// GET all app data (admin only) - for admin dashboard
app.get("/api/appdata/all", async (req: Request, res: Response) => {
  try {
    const authHeader = req.headers.authorization || "";
    const token = authHeader.startsWith("Bearer ")
      ? authHeader.split(" ")[1]
      : null;

    if (!token || !admin.apps.length) {
      return res.status(401).json({ error: "Authentication required" });
    }

    let decoded: admin.auth.DecodedIdToken;
    try {
      decoded = await admin.auth().verifyIdToken(token);
    } catch (err) {
      return res.status(401).json({ error: "Invalid auth token" });
    }

    // Only admin can view all users' app data
    const adminEmail = process.env.ADMIN_EMAIL || "";
    if (!adminEmail || decoded.email !== adminEmail) {
      return res
        .status(403)
        .json({ error: "Forbidden: Admin access required" });
    }

    // Fetch all app data with pagination support
    const limit = parseInt(req.query.limit as string) || 1000;
    const skip = parseInt(req.query.skip as string) || 0;

    try {
      // Get all appdata documents with essential fields only
      const allAppData = await AppDataModel.find({})
        .select(
          "email moduleScores learningPathTopic unlockedModules currentModuleId finalQuizPassed groups"
        )
        .sort({ email: 1 })
        .limit(limit)
        .skip(skip)
        .lean();

      const total = await AppDataModel.countDocuments({});

      res.json({
        success: true,
        appdata: allAppData,
        pagination: {
          total,
          limit,
          skip,
          hasMore: skip + allAppData.length < total,
        },
      });
    } catch (err) {
      console.warn("Failed to read all appdata from MongoDB:", err);
      return res.status(500).json({ error: "Failed to read all appdata" });
    }
  } catch (err) {
    console.error("Error in /api/appdata/all GET:", err);
    res.status(500).json({ error: "Internal server error" });
  }
});

// GET user profile (authenticated)
app.post(
  "/api/profile",
  normalizeUserInput,
  validate(profileSchema),
  async (req: Request, res: Response) => {
    try {
      const authHeader = req.headers.authorization || "";
      const token = authHeader.startsWith("Bearer ")
        ? authHeader.split(" ")[1]
        : null;

      if (!token || !admin.apps.length) {
        return res.status(401).json({ error: "Authentication required" });
      }

      let decoded: admin.auth.DecodedIdToken;
      try {
        decoded = await admin.auth().verifyIdToken(token);
      } catch (err) {
        return res.status(401).json({ error: "Invalid auth token" });
      }

      const { email, firebaseUid } = req.body;
      const queryIdentifier = firebaseUid || email;

      if (!queryIdentifier)
        return res.status(400).json({ error: "email or firebaseUid required" });

      // Prevent users from viewing other users' profiles unless admin
      const adminEmail = process.env.ADMIN_EMAIL || "";
      const isAdmin = decoded.email === adminEmail;
      const isOwnProfile =
        decoded.email === email || decoded.uid === firebaseUid;

      if (!isOwnProfile && !isAdmin) {
        return res
          .status(403)
          .json({ error: "Forbidden to view other profiles" });
      }

      // Get user profile from unified User model
      try {
        const query = firebaseUid ? { firebaseUid } : { email };
        const user = await User.findOne(query).lean();

        if (user) {
          console.log(
            `✅ Retrieved profile for ${email || firebaseUid}: name = "${user.name
            }"`
          );

          // Also fetch AppData to include moduleScores, learningPath, and groups
          let appData = null;
          try {
            appData = await AppDataModel.findOne({ email: user.email })
              .select(
                "moduleScores learningPathTopic unlockedModules currentModuleId finalQuizPassed groups"
              )
              .lean();
          } catch (appDataErr) {
            console.warn(
              `⚠️ Failed to fetch appData for ${user.email}:`,
              appDataErr
            );
            // Continue without appData - don't fail the whole request
          }

          // Fetch user's groups from Group collection
          let userGroups: any[] = [];
          try {
            const { Group } = await import("./models");
            userGroups = await Group.find({
              members: user._id as any,
            })
              .select("_id name type level members createdAt")
              .lean();
          } catch (groupErr) {
            console.warn(
              `⚠️ Failed to fetch groups for ${user.firebaseUid}:`,
              groupErr
            );
            // Continue without groups - don't fail the whole request
          }

          // Combine user data with appData and groups
          const enrichedUser = {
            ...user,
            moduleScores: appData?.moduleScores || {},
            learningPathTopic: appData?.learningPathTopic || null,
            unlockedModules: appData?.unlockedModules || [1],
            currentModuleId: appData?.currentModuleId || null,
            finalQuizPassed: appData?.finalQuizPassed || false,
            groups: userGroups.map((g) => ({
              id: g._id.toString(),
              name: g.name,
              type: g.type,
              level: g.level,
              memberCount: g.members?.length || 0,
              createdAt: g.createdAt,
            })),
          };

          // Calculate startModuleId based on learningPath (backend is single source of truth)
          let startModuleId = 1; // Default to Module 1
          if (user.learningPath === "intermediate") {
            startModuleId = 2;
          } else if (user.learningPath === "advanced") {
            startModuleId = 3;
          }
          // beginner or null/undefined defaults to 1

          return res.json({
            user: {
              ...enrichedUser,
              startModuleId, // Add startModuleId to response
            }
          });
        } else {
          console.log(`ℹ️ Profile not found for ${email || firebaseUid}`);
          return res.json({ user: null });
        }
      } catch (err) {
        console.warn("Failed to retrieve profile from MongoDB:", err);
        return res.status(500).json({ error: "Failed to retrieve profile" });
      }
    } catch (err) {
      console.error("Error in /api/profile POST:", err);
      res.status(500).json({ error: "Internal server error" });
    }
  }
);

// POST /api/submissions - Handle activity file submissions
app.post(
  "/api/submissions",
  validate(submissionSchema),
  async (req: Request, res: Response) => {
    try {
      const authHeader = req.headers.authorization || "";
      const token = authHeader.startsWith("Bearer ")
        ? authHeader.split(" ")[1]
        : null;

      if (!token || !admin.apps.length) {
        return res.status(401).json({ error: "Authentication required" });
      }

      let decoded: admin.auth.DecodedIdToken;
      try {
        decoded = await admin.auth().verifyIdToken(token);
      } catch (err) {
        return res.status(401).json({ error: "Invalid auth token" });
      }

      const { name, type, data, moduleId, activityId } = req.body;

      // For now, we'll store the base64 data directly
      // In production, you'd want to upload to cloud storage (Firebase Storage, S3, etc.)
      // and store the URL instead

      // Generate a simple file ID
      const fileId = `file_${Date.now()}_${Math.random()
        .toString(36)
        .substr(2, 9)}`;

      // Store file metadata in ActivityFile collection if activityId is provided
      if (activityId) {
        const { ActivityFile } = await import("./models");

        // For base64 data, we'll store it as a data URL
        const dataUrl = data.startsWith("data:")
          ? data
          : `data:${type};base64,${data.split(",").pop()}`;

        await ActivityFile.create({
          activityId: activityId.toString(),
          groupId: "submission", // Default group for submissions
          filename: name,
          url: dataUrl,
          uploadedByUid: decoded.uid,
        });
      }

      res.json({
        success: true,
        message: "File uploaded successfully",
        fileId: fileId,
        url: data, // Return the data URL for immediate use
      });
    } catch (err) {
      console.error("Error in /api/submissions POST:", err);
      res.status(500).json({ error: "Internal server error" });
    }
  }
);

// GET /api/submissions - Get user submissions
app.get("/api/submissions", async (req: Request, res: Response) => {
  try {
    const authHeader = req.headers.authorization || "";
    const token = authHeader.startsWith("Bearer ")
      ? authHeader.split(" ")[1]
      : null;

    if (!token || !admin.apps.length) {
      return res.status(401).json({ error: "Authentication required" });
    }

    let decoded: admin.auth.DecodedIdToken;
    try {
      decoded = await admin.auth().verifyIdToken(token);
    } catch (err) {
      return res.status(401).json({ error: "Invalid auth token" });
    }

    const adminEmail = process.env.ADMIN_EMAIL || "";
    const isAdmin = decoded.email === adminEmail;

    const { ActivityFile } = await import("./models");
    const { User } = await import("./models/User");

    let query: any = {};

    // If admin requests specific user's submissions via userId query param
    const { userId } = req.query;
    if (isAdmin && userId) {
      // Admin can query by userId (firebaseUid)
      const targetUser = await User.findOne({ firebaseUid: userId }).lean();
      if (targetUser) {
        query.uploadedByUid = userId;
      } else {
        // User not found, return empty
        return res.json({ success: true, submissions: [] });
      }
    } else if (!isAdmin) {
      // If NOT admin, force filter by user UID
      query.uploadedByUid = decoded.uid;
    }
    // If admin and no userId specified, return all submissions

    const submissions = await ActivityFile.find(query)
      .sort({ createdAt: -1 })
      .lean();

    res.json({
      success: true,
      submissions,
    });
  } catch (err) {
    console.error("Error in /api/submissions GET:", err);
    res.status(500).json({ error: "Internal server error" });
  }
});
