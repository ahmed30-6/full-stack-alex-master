import { Router, Request, Response } from "express";
import admin from "firebase-admin";
import { User, Score, ActivityFile, Message } from "../models";
import {
  validate,
  validateQuery,
  validateParams,
} from "../middleware/validation";
import { normalizeUserInput } from "../middleware/normalize";
import {
  syncUserSchema,
  syncLoginTimeSchema,
  scoresSchema,
  scoresQuerySchema,
  activityFileSchema,
  activityFileQuerySchema,
  activityMessageSchema,
  activityMessageQuerySchema,
  loginTimesParamsSchema,
} from "../validators/schemas";

const router = Router();

// Middleware to verify Firebase ID token
async function verifyAuth(req: Request, res: Response, next: Function) {
  try {
    const authHeader = req.headers.authorization || "";
    const token = authHeader.startsWith("Bearer ")
      ? authHeader.split(" ")[1]
      : null;

    if (!token || !admin.apps.length) {
      return res.status(401).json({ error: "Authentication required" });
    }

    const decoded = await admin.auth().verifyIdToken(token);
    (req as any).user = decoded;
    next();
  } catch (err) {
    return res.status(401).json({ error: "Invalid auth token" });
  }
}

// POST /api/sync/user - Upsert user
router.post(
  "/user",
  verifyAuth,
  normalizeUserInput,
  validate(syncUserSchema),
  async (req: Request, res: Response) => {
    try {
      const { firebaseUid, username, email, profile, role } = req.body;

      if (!firebaseUid || !username || !email) {
        return res
          .status(400)
          .json({ error: "firebaseUid, username, and email are required" });
      }

      const normalizedUsername = username.trim().toLowerCase();

      // Only set user fields on creation, never overwrite existing data
      // This prevents name/username from being overwritten during login sync
      const user = await User.findOneAndUpdate(
        { firebaseUid },
        {
          $setOnInsert: {
            username: normalizedUsername,
            email,
            profile: profile || {},
            role: role || "student",
            loginTimes: [],
          },
        },
        { upsert: true, new: true, setDefaultsOnInsert: true }
      );

      res.json({ success: true, user });
    } catch (err: any) {
      console.error("Error in /api/sync/user:", err);
      res
        .status(500)
        .json({ error: "Internal server error", details: err.message });
    }
  }
);

// POST /api/sync/login-time - Record login timestamp
router.post(
  "/login-time",
  verifyAuth,
  validate(syncLoginTimeSchema),
  async (req: Request, res: Response) => {
    try {
      const { firebaseUid } = req.body;

      if (!firebaseUid) {
        return res.status(400).json({ error: "firebaseUid is required" });
      }

      const user = await User.findOneAndUpdate(
        { firebaseUid },
        { $push: { loginTimes: new Date() } },
        { new: true }
      );

      if (!user) {
        return res.status(404).json({ error: "User not found" });
      }

      res.json({ success: true, user });
    } catch (err: any) {
      console.error("Error in /api/sync/login-time:", err);
      res
        .status(500)
        .json({ error: "Internal server error", details: err.message });
    }
  }
);

// POST /api/scores - Save score
router.post(
  "/scores",
  verifyAuth,
  validate(scoresSchema),
  async (req: Request, res: Response) => {
    try {
      const { studentUid, examId, score, maxScore, groupId, meta } = req.body;

      if (
        !studentUid ||
        !examId ||
        score === undefined ||
        maxScore === undefined
      ) {
        return res.status(400).json({
          error: "studentUid, examId, score, and maxScore are required",
        });
      }

      // Create score document
      const scoreDoc = await Score.create({
        studentUid,
        examId,
        score,
        maxScore,
        groupId,
        meta,
      });

      // Update AppDataModel if this is a module score
      // Extract moduleId from examId if it follows pattern like "module-1-exam"
      const moduleMatch = examId.match(/module[_-]?(\d+)/i);
      if (moduleMatch) {
        const moduleId = moduleMatch[1];

        // Find user by firebaseUid to get email
        const user = await User.findOne({ firebaseUid: studentUid }).lean();
        if (user) {
          // Import AppDataModel (defined in server.ts, need to export it)
          // For now, we'll use mongoose.model to access it
          const mongoose = require("mongoose");
          const AppDataModel = mongoose.model("AppData");

          // Update module scores in AppDataModel
          await AppDataModel.findOneAndUpdate(
            { email: user.email },
            {
              $set: {
                [`moduleScores.${moduleId}`]: {
                  score,
                  maxScore,
                  percentage: Math.round((score / maxScore) * 100),
                  examId,
                  completedAt: new Date(),
                },
              },
            },
            { upsert: true }
          );
        }
      }

      res.json({ success: true, score: scoreDoc });
    } catch (err: any) {
      console.error("Error in /api/scores:", err);
      res
        .status(500)
        .json({ error: "Internal server error", details: err.message });
    }
  }
);

// GET /api/scores - Query scores with filters
router.get(
  "/scores",
  verifyAuth,
  validateQuery(scoresQuerySchema),
  async (req: Request, res: Response) => {
    try {
      const { studentUid, examId, groupId, limit = 100, skip = 0 } = req.query;
      const decoded = (req as any).user;

      // Build query
      const query: any = {};
      if (studentUid) query.studentUid = studentUid;
      if (examId) query.examId = examId;
      if (groupId) query.groupId = groupId;

      // Check permissions: users can only see their own scores unless admin
      const adminEmail = process.env.ADMIN_EMAIL || "";
      const isAdmin = decoded.email === adminEmail;

      if (!isAdmin && studentUid && studentUid !== decoded.uid) {
        return res.status(403).json({
          success: false,
          error: "Forbidden: Cannot view other users' scores",
        });
      }

      // If not admin and no studentUid specified, default to current user
      if (!isAdmin && !studentUid) {
        query.studentUid = decoded.uid;
      }

      // Query scores
      const scores = await Score.find(query)
        .sort({ createdAt: -1 })
        .limit(Number(limit))
        .skip(Number(skip))
        .lean();

      const total = await Score.countDocuments(query);

      res.json({
        success: true,
        scores,
        pagination: {
          total,
          limit: Number(limit),
          skip: Number(skip),
          hasMore: Number(skip) + scores.length < total,
        },
      });
    } catch (err: any) {
      console.error("Error in GET /api/scores:", err);
      res
        .status(500)
        .json({ error: "Internal server error", details: err.message });
    }
  }
);

// Activity-related routes have been moved to routes/activity.ts
// to avoid route shadowing and ensure a single authoritative source.

// GET /api/login-times/:uid - Get login times for a user (admin only)
router.get(
  "/login-times/:uid",
  verifyAuth,
  validateParams(loginTimesParamsSchema),
  async (req: Request, res: Response) => {
    try {
      const { uid } = req.params;
      const decoded = (req as any).user;

      // Only admin can view login times
      const adminEmail = process.env.ADMIN_EMAIL || "";
      if (!adminEmail || decoded.email !== adminEmail) {
        return res.status(403).json({
          success: false,
          error: "Forbidden: Admin access required",
        });
      }

      // Find user by firebaseUid
      const user = await User.findOne({ firebaseUid: uid }).lean();

      if (!user) {
        return res.status(404).json({
          success: false,
          error: "User not found",
        });
      }

      // Return user info and login times (sorted chronologically)
      const loginTimes = user.loginTimes || [];

      res.json({
        success: true,
        user: {
          firebaseUid: user.firebaseUid,
          username: user.username,
          name: user.name,
          email: user.email,
          role: user.role,
        },
        loginTimes: loginTimes.sort(
          (a, b) => new Date(a).getTime() - new Date(b).getTime()
        ),
      });
    } catch (err: any) {
      console.error("Error in GET /api/login-times/:uid:", err);
      res.status(500).json({
        success: false,
        error: "Internal server error",
        details: err.message,
      });
    }
  }
);

export default router;
