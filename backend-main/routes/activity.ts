import express, { Request, Response } from "express";
import admin from "firebase-admin";
import { User, Group, ActivityFile, Message, ActivityMessage } from "../models";
import { RealtimeService, GroupService } from "../services";
import {
    validate,
    validateQuery
} from "../middleware/validation";
import {
    activityFileSchema,
    activityFileQuerySchema,
    activityMessageSchema,
    activityMessageQuerySchema,
} from "../validators/schemas";

const router = express.Router();

// Middleware to verify Firebase token
const verifyToken = async (req: Request, res: Response, next: Function) => {
    const authHeader = req.headers.authorization || "";
    const token = authHeader.startsWith("Bearer ") ? authHeader.split(" ")[1] : null;

    if (!token) {
        return res.status(401).json({ error: "Authentication required" });
    }

    try {
        const decoded = await admin.auth().verifyIdToken(token);
        (req as any).user = decoded;
        next();
    } catch (err) {
        return res.status(401).json({ error: "Invalid auth token" });
    }
};

// POST /api/activity/:activityId/message
router.post("/:activityId/message", verifyToken, async (req: Request, res: Response) => {
    try {
        const { activityId } = req.params;
        const { text } = req.body;
        const decodedUser = (req as any).user;
        const email = decodedUser.email;

        if (!email) {
            return res.status(400).json({ error: "User email not found in token" });
        }

        if (!text || !text.trim()) {
            return res.status(400).json({ error: "Message text is required" });
        }

        // Find user in MongoDB
        const user = await User.findOne({ email });
        if (!user) {
            return res.status(404).json({ error: "User not found" });
        }

        // Find user's group (or allow admin to post to any group)
        const adminEmail = process.env.ADMIN_EMAIL || "";
        const isAdmin = email === adminEmail;

        let group;
        if (isAdmin) {
            // Admin can post to any group - find any group for this activity
            // In a real scenario, admin might specify groupId in request
            // For now, we'll find the first group the admin is a member of
            group = await Group.findOne({ members: user._id as any });
            if (!group) {
                // If admin not in any group, they can't post (need to join first)
                return res.status(403).json({ error: "Admin must join a group first" });
            }
        } else {
            // Student must be in exactly one group
            group = await Group.findOne({ members: user._id as any });
            if (!group) {
                return res.status(403).json({ error: "User is not in a group" });
            }
        }

        // Create ActivityMessage
        const message = await ActivityMessage.create({
            activityId: Number(activityId),
            groupId: group._id,
            userId: user._id,
            text: text.trim()
        });

        res.json({
            success: true,
            message: "Message saved",
            data: message
        });

    } catch (err) {
        console.error(`Error in /api/activity/${req.params.activityId}/message:`, err);
        res.status(500).json({ error: "Internal server error" });
    }
});

// GET /api/activity/:activityId/messages
router.get("/:activityId/messages", verifyToken, async (req: Request, res: Response) => {
    try {
        const { activityId } = req.params;
        const decodedUser = (req as any).user;
        const email = decodedUser.email;

        if (!email) {
            return res.status(400).json({ error: "User email not found in token" });
        }

        // Find user
        const user = await User.findOne({ email });
        if (!user) {
            return res.status(404).json({ error: "User not found" });
        }

        // Find user's group (or allow admin to view any group)
        const adminEmail = process.env.ADMIN_EMAIL || "";
        const isAdmin = email === adminEmail;

        let group;
        if (isAdmin) {
            // Admin can view messages from any group
            // For now, find the first group the admin is a member of
            group = await Group.findOne({ members: user._id as any });
            if (!group) {
                return res.status(403).json({ error: "Admin must join a group first" });
            }
        } else {
            // Student must be in exactly one group
            group = await Group.findOne({ members: user._id as any });
            if (!group) {
                return res.status(403).json({ error: "User is not in a group" });
            }
        }

        // Fetch messages for this activity AND this group
        const messages = await ActivityMessage.find({
            activityId: Number(activityId),
            groupId: group._id
        })
            .sort({ createdAt: 1 }) // Oldest first
            .populate("userId", "name avatar")
            .lean();

        // Normalize _id -> id
        const normalizedMessages = messages.map((msg: any) => ({
            ...msg,
            id: msg._id,
            _id: undefined,
            user: msg.userId // Rename populated field if needed, or keep as userId. Frontend usually checks userId. 
            // Requirement says "Populate userId". Let's keep it as userId but ensure it's an object.
        }));

        res.json({ messages: normalizedMessages });

    } catch (err) {
        console.error(`Error in GET /api/activity/${req.params.activityId}/messages:`, err);
        res.status(500).json({ error: "Internal server error" });
    }
});

// POST /api/activity/file - Save activity file metadata (Moved from sync.ts)
router.post(
    "/file",
    verifyToken,
    validate(activityFileSchema),
    async (req: Request, res: Response) => {
        try {
            const { activityId, groupId, filename, url, uploadedByUid } = req.body;
            const decoded = (req as any).user;

            // Validate user is member of the group
            const user = await User.findOne({ firebaseUid: decoded.uid }).select("_id").lean();
            if (!user) {
                return res.status(404).json({ success: false, error: "User not found" });
            }

            // Check if admin (admins can upload to any group they're a member of)
            const adminEmail = process.env.ADMIN_EMAIL || "";
            const isAdmin = decoded.email === adminEmail;

            const isValid = isAdmin || await GroupService.validateGroupMembership(
                user._id as any,
                groupId
            );

            if (!isValid) {
                return res.status(403).json({
                    success: false,
                    error: "Forbidden: You are not a member of this group",
                });
            }

            const file = await ActivityFile.create({
                activityId,
                groupId,
                filename,
                url,
                uploadedByUid,
            });

            res.json({ success: true, file });
        } catch (err: any) {
            console.error("Error in /api/activity/file POST:", err);
            res
                .status(500)
                .json({ error: "Internal server error", details: err.message });
        }
    }
);

// GET /api/activity/file - Query files with group filtering (Moved from sync.ts)
router.get(
    "/file",
    verifyToken,
    validateQuery(activityFileQuerySchema),
    async (req: Request, res: Response) => {
        try {
            const {
                activityId,
                groupId,
                uploadedByUid,
                limit = 100,
                skip = 0,
            } = req.query;
            const decoded = (req as any).user;

            // Check if admin
            const adminEmail = process.env.ADMIN_EMAIL || "";
            const isAdmin = decoded.email === adminEmail;

            // Get user's groups
            const user = await User.findOne({ firebaseUid: decoded.uid }).select("_id").lean();

            if (!user) {
                return res.status(404).json({ success: false, error: "User not found" });
            }

            const userGroupIds = await GroupService.getUserGroups(user._id as any);

            // Build query
            const query: any = {};

            // If not admin, restrict to user's groups
            if (!isAdmin) {
                query.groupId = { $in: userGroupIds };
            }

            // Apply additional filters if provided
            if (activityId) query.activityId = activityId;
            if (uploadedByUid) query.uploadedByUid = uploadedByUid;
            if (groupId) {
                // If specific groupId requested, verify user is member (unless admin)
                if (!isAdmin && !userGroupIds.includes(groupId as string)) {
                    return res.status(403).json({
                        success: false,
                        error: "Forbidden: You are not a member of this group",
                    });
                }
                query.groupId = groupId;
            }

            // Query files
            const files = await ActivityFile.find(query)
                .sort({ createdAt: -1 })
                .limit(Number(limit))
                .skip(Number(skip))
                .lean();

            const total = await ActivityFile.countDocuments(query);

            res.json({
                success: true,
                files,
                pagination: {
                    total,
                    limit: Number(limit),
                    skip: Number(skip),
                    hasMore: Number(skip) + files.length < total,
                },
            });
        } catch (err: any) {
            console.error("Error in GET /api/activity/file:", err);
            res
                .status(500)
                .json({ error: "Internal server error", details: err.message });
        }
    }
);

// POST /api/activity/message - Save message and emit socket event (Moved from sync.ts)
router.post(
    "/message",
    verifyToken,
    validate(activityMessageSchema),
    async (req: Request, res: Response) => {
        try {
            const { activityId, groupId, text } = req.body;
            const decoded = (req as any).user;

            // Validate user is member of the group
            const user = await User.findOne({ firebaseUid: decoded.uid }).select("_id").lean();

            if (!user) {
                return res.status(404).json({ success: false, error: "User not found" });
            }

            // Check if admin (admins can post to any group they're a member of)
            const adminEmail = process.env.ADMIN_EMAIL || "";
            const isAdmin = decoded.email === adminEmail;

            const isValid = isAdmin || await GroupService.validateGroupMembership(
                user._id as any,
                groupId
            );

            if (!isValid) {
                return res.status(403).json({
                    success: false,
                    error: "Forbidden: You are not a member of this group",
                });
            }

            const message = await Message.create({
                activityId,
                groupId,
                text,
                senderUid: decoded.uid,
            });

            // Emit real-time event to group members
            RealtimeService.emitMessageNew(groupId, {
                _id: message._id.toString(),
                activityId: message.activityId,
                groupId: message.groupId,
                text: message.text,
                senderUid: message.senderUid,
                createdAt: (message as any).createdAt.toISOString(),
            });

            res.json({
                success: true,
                message,
            });
        } catch (err: any) {
            console.error("Error in /api/activity/message POST:", err);
            res
                .status(500)
                .json({ error: "Internal server error", details: err.message });
        }
    }
);

// GET /api/activity/message - Query messages with group filtering (Moved from sync.ts)
router.get(
    "/message",
    verifyToken,
    validateQuery(activityMessageQuerySchema),
    async (req: Request, res: Response) => {
        try {
            const { activityId, groupId, limit = 100, skip = 0 } = req.query;
            const decoded = (req as any).user;

            // Get user's groups
            const user = await User.findOne({ firebaseUid: decoded.uid }).select("_id").lean();

            if (!user) {
                return res.status(404).json({ success: false, error: "User not found" });
            }

            const userGroupIds = await GroupService.getUserGroups(user._id as any);

            // Build query - only return messages from user's groups
            const query: any = {
                groupId: { $in: userGroupIds },
            };

            // Apply additional filters if provided
            if (activityId) query.activityId = activityId;
            if (groupId) {
                // If specific groupId requested, verify user is member
                if (!userGroupIds.includes(groupId as string)) {
                    return res.status(403).json({
                        success: false,
                        error: "Forbidden: You are not a member of this group",
                    });
                }
                query.groupId = groupId;
            }

            // Query messages
            const messages = await Message.find(query)
                .sort({ createdAt: -1 })
                .limit(Number(limit))
                .skip(Number(skip))
                .lean();

            const total = await Message.countDocuments(query);

            res.json({
                success: true,
                messages,
                pagination: {
                    total,
                    limit: Number(limit),
                    skip: Number(skip),
                    hasMore: Number(skip) + messages.length < total,
                },
            });
        } catch (err: any) {
            console.error("Error in GET /api/activity/message:", err);
            res
                .status(500)
                .json({ error: "Internal server error", details: err.message });
        }
    }
);

export default router;
