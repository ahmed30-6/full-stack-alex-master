import { Router, Request, Response } from "express";
import admin from "firebase-admin";
import mongoose from "mongoose";
import { Group } from "../models";
import { validate, validateQuery } from "../middleware/validation";
import { createGroupSchema, getGroupsQuerySchema } from "../validators/schemas";

const router = Router();

console.log("📦 Group routes registered");

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

// Middleware to verify admin access
function requireAdmin(req: Request, res: Response, next: Function) {
  const decoded = (req as any).user;
  const adminEmail = process.env.ADMIN_EMAIL || "";

  if (!adminEmail || decoded.email !== adminEmail) {
    return res.status(403).json({
      success: false,
      error: "Forbidden: Admin access required",
    });
  }

  next();
}

/**
 * POST /api/groups
 * Create a new group (admin only)
 */
router.post(
  "/",
  verifyAuth,
  requireAdmin,
  validate(createGroupSchema),
  async (req: Request, res: Response) => {
    try {
      const { level, type, description } = req.body;
      const decoded = (req as any).user;

      // Import models
      const { User } = await import("../models/User");

      // Resolve Admin user to get MongoDB _id
      const adminUser = await User.findOne({ firebaseUid: decoded.uid }).select("_id");
      if (!adminUser) {
        return res.status(404).json({ success: false, error: "Admin user not found in MongoDB" });
      }

      // TASK 1: Generate group name server-side using MongoDB count
      const count = await Group.countDocuments();
      const name = `المجموعة ${count + 1}`;

      // Create group directly without members
      const groupType = type || "single";
      const group = new Group({
        name,
        type: groupType,
        level: level || "beginner",
        description: description || "",
        members: [], // Creation is always empty now
        createdBy: adminUser._id,
      });

      await group.save();

      // Emit real-time event
      const { RealtimeService } = await import("../services");
      RealtimeService.emitGroupUpdated(group._id.toString(), group);

      res.status(201).json({
        success: true,
        group: {
          id: group._id.toString(),
          name: group.name,
          level: group.level,
          type: group.type,
          members: [],
          createdBy: group.createdBy.toString(),
          createdAt: group.createdAt,
          updatedAt: group.updatedAt
        }
      });
    } catch (err: any) {
      console.error("Error in POST /api/groups:", err);
      res.status(500).json({
        success: false,
        error: err.message || "Internal server error",
      });
    }
  }
);

/**
 * GET /api/groups/my
 * Retrieve current user's group
 */
router.get("/my", verifyAuth, async (req: Request, res: Response) => {
  try {
    const decoded = (req as any).user;

    const { User } = await import("../models/User");
    const user = await User.findOne({ firebaseUid: decoded.uid }).select("_id");

    if (!user) {
      return res.json({ success: true, group: null });
    }

    // Find the ONE group the user belongs to
    const group = await Group.findOne({ members: user._id as any })
      .populate("members", "firebaseUid name email avatar")
      .lean();

    if (!group) {
      return res.json({ success: true, group: null });
    }

    const transformedGroup = {
      ...group,
      id: group._id.toString(),
      members: group.members.map((m: any) => ({
        ...m,
        id: m._id ? m._id.toString() : m.id,
      })),
      memberCount: group.members?.length || 0,
    };

    res.json({
      success: true,
      group: transformedGroup,
    });
  } catch (err: any) {
    console.error("Error in GET /api/groups/my:", err);
    res.status(500).json({
      success: false,
      error: "Internal server error",
      details: err.message,
    });
  }
});

/**
 * GET /api/groups
 * Retrieve all groups (admin only)
 */
router.get(
  "/",
  verifyAuth,
  requireAdmin,
  validateQuery(getGroupsQuerySchema),
  async (req: Request, res: Response) => {
    try {
      const { level, type, limit = 100, skip = 0 } = req.query;

      const query: any = {};
      if (level) query.level = level;
      if (type) query.type = type;

      const groups = await Group.find(query)
        .sort({ createdAt: -1 })
        .limit(Number(limit))
        .skip(Number(skip))
        .populate("members", "firebaseUid name email avatar")
        .lean();

      const total = await Group.countDocuments(query);

      const transformedGroups = groups.map((g: any) => ({
        ...g,
        id: g._id.toString(),
        members: g.members.map((m: any) => ({
          ...m,
          id: m._id ? m._id.toString() : m.id,
        })),
      }));

      res.json({
        success: true,
        groups: transformedGroups,
        pagination: {
          total,
          limit: Number(limit),
          skip: Number(skip),
          hasMore: Number(skip) + groups.length < total,
        },
      });
    } catch (err: any) {
      console.error("Error in GET /api/groups:", err);
      res.status(500).json({
        success: false,
        error: "Internal server error",
        details: err.message,
      });
    }
  }
);

/**
 * GET /api/groups/:groupId
 * Retrieve a specific group by ID
 */
router.get("/:groupId", verifyAuth, async (req: Request, res: Response) => {
  try {
    const { groupId } = req.params;

    if (!mongoose.Types.ObjectId.isValid(groupId)) {
      return res.status(400).json({ success: false, error: "Invalid group ID format" });
    }

    const group = await Group.findById(groupId)
      .populate("members", "firebaseUid name email avatar")
      .lean();

    if (!group) {
      return res.status(404).json({ success: false, error: "Group not found" });
    }

    const transformedGroup = {
      ...group,
      id: group._id.toString(),
      members: group.members.map((m: any) => ({
        ...m,
        id: m._id ? m._id.toString() : m.id,
      })),
      memberCount: group.members?.length || 0,
    };

    res.json({
      success: true,
      group: transformedGroup,
    });
  } catch (err: any) {
    console.error(`Error in GET /api/groups/${req.params.groupId}:`, err);
    res.status(500).json({
      success: false,
      error: "Internal server error",
      details: err.message,
    });
  }
});

/**
 * POST /api/groups/:groupId/members
 * Assign a user to a group (admin only, or self-join)
 */
router.post(
  "/:groupId/members",
  verifyAuth,
  async (req: Request, res: Response) => {
    try {
      const { groupId } = req.params;
      const { userId } = req.body;
      const decoded = (req as any).user;
      const adminEmail = process.env.ADMIN_EMAIL || "";

      if (!userId) {
        return res.status(400).json({ success: false, error: "userId is required" });
      }

      // TASK 2: Validate userId is a valid MongoDB ObjectId
      if (!mongoose.Types.ObjectId.isValid(userId)) {
        return res.status(400).json({
          success: false,
          error: "Invalid userId"
        });
      }

      // Import models
      const { User } = await import("../models/User");

      // Determine if requester is admin
      const isAdmin = decoded.email === adminEmail;

      // If not admin, verify user is assigning themselves
      if (!isAdmin) {
        const user = await User.findById(userId).select("firebaseUid").lean();
        if (!user || user.firebaseUid !== decoded.uid) {
          return res.status(403).json({
            success: false,
            error: "Forbidden: You can only assign yourself to a group",
          });
        }
      }

      const { GroupService } = await import("../services/GroupService");
      await GroupService.assignUserToGroup(userId, groupId, undefined, isAdmin);

      // Fetch updated group for response and realtime
      const updatedGroup = await Group.findById(groupId)
        .populate("members", "firebaseUid name email avatar");

      // Emit real-time event
      const { RealtimeService } = await import("../services");
      RealtimeService.emitGroupUpdated(groupId, updatedGroup);

      res.json({
        success: true,
        group: {
          id: updatedGroup!._id.toString(),
          name: updatedGroup!.name,
          level: updatedGroup!.level,
          type: updatedGroup!.type,
          createdBy: updatedGroup!.createdBy.toString(),
          createdAt: updatedGroup!.createdAt,
          updatedAt: updatedGroup!.updatedAt,
          members: ((updatedGroup as any).members as any).map((m: any) => ({
            id: m._id.toString(),
            firebaseUid: m.firebaseUid,
            name: m.name,
            email: m.email,
            avatar: m.avatar
          }))
        }
      });
    } catch (err: any) {
      console.error("Error in POST /api/groups/:groupId/members:", err);
      res.status(400).json({ success: false, error: err.message });
    }
  }
);

/**
 * POST /api/groups/:groupId/join
 * Student self-join endpoint (token-based, no userId in body)
 * TASK 1: New secure endpoint for students
 */
router.post(
  "/:groupId/join",
  verifyAuth,
  async (req: Request, res: Response) => {
    try {
      const { groupId } = req.params;
      const decoded = (req as any).user;

      // Validate groupId format
      if (!mongoose.Types.ObjectId.isValid(groupId)) {
        return res.status(400).json({
          success: false,
          error: "Invalid groupId"
        });
      }

      // Import models
      const { User } = await import("../models/User");

      // Get userId from authenticated token
      const user = await User.findOne({ firebaseUid: decoded.uid }).select("_id");
      if (!user) {
        return res.status(404).json({
          success: false,
          error: "User not found in database"
        });
      }

      const userId = user._id.toString();

      // Check if group exists
      const group = await Group.findById(groupId);
      if (!group) {
        return res.status(404).json({
          success: false,
          error: "Group not found"
        });
      }

      // Prevent duplicate joins
      const isMember = group.members.some(
        (memberId) => memberId.toString() === userId
      );
      if (isMember) {
        return res.status(400).json({
          success: false,
          error: "Already joined this group"
        });
      }

      // Check if user is admin
      const adminEmail = process.env.ADMIN_EMAIL || "";
      const isAdmin = decoded.email === adminEmail;

      // Use GroupService to handle join logic
      const { GroupService } = await import("../services/GroupService");
      await GroupService.assignUserToGroup(userId, groupId, undefined, isAdmin);

      // Fetch updated group
      const updatedGroup = await Group.findById(groupId)
        .populate("members", "firebaseUid name email avatar");

      // Emit real-time event
      const { RealtimeService } = await import("../services");
      RealtimeService.emitGroupUpdated(groupId, updatedGroup);

      res.json({
        success: true,
        message: "Joined successfully",
        group: {
          id: updatedGroup!._id.toString(),
          name: updatedGroup!.name,
          level: updatedGroup!.level,
          type: updatedGroup!.type,
          createdBy: updatedGroup!.createdBy.toString(),
          createdAt: updatedGroup!.createdAt,
          updatedAt: updatedGroup!.updatedAt,
          members: ((updatedGroup as any).members as any).map((m: any) => ({
            id: m._id.toString(),
            firebaseUid: m.firebaseUid,
            name: m.name,
            email: m.email,
            avatar: m.avatar
          }))
        }
      });
    } catch (err: any) {
      console.error("Error in POST /api/groups/:groupId/join:", err);
      res.status(400).json({
        success: false,
        error: err.message || "Failed to join group"
      });
    }
  }
);

/**
 * DELETE /api/groups/:groupId/members/:userId
 * Remove a user from a group (admin only)
 */
router.delete(
  "/:groupId/members/:userId",
  verifyAuth,
  requireAdmin,
  async (req: Request, res: Response) => {
    try {
      const { groupId, userId } = req.params;

      const { GroupService } = await import("../services/GroupService");
      await GroupService.removeUserFromGroup(userId, groupId);

      // Fetch updated group
      const updatedGroup = await Group.findById(groupId)
        .populate("members", "firebaseUid name email avatar");

      // Emit real-time event
      const { RealtimeService } = await import("../services");
      RealtimeService.emitGroupUpdated(groupId, updatedGroup);

      // Also emit a silent group:updated if group was deleted (not implemented here)
      // but the frontend should handle empty members list if we don't delete group.

      res.json({ success: true });
    } catch (err: any) {
      console.error("Error in DELETE /api/groups/:groupId/members/:userId:", err);
      res.status(400).json({ success: false, error: err.message });
    }
  }
);

export default router;
