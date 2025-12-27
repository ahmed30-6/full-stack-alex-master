import { Router, Request, Response } from "express";
import admin from "firebase-admin";
import { Content } from "../models/Content";
import { User } from "../models/User";

const router = Router();

console.log("📦 Content routes registered");

/**
 * Middleware to verify Firebase ID token
 * Extracts user identity from JWT and attaches to request
 */
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

/**
 * GET /api/content/:moduleId
 * 
 * Returns lesson content for the specified module, automatically filtered
 * by the authenticated user's learning path.
 * 
 * Security:
 * - User identity derived from Firebase JWT token
 * - Learning level determined from User.learningPath in MongoDB
 * - Frontend CANNOT control or override learning level
 * 
 * Business Rules:
 * - User must exist in MongoDB
 * - If user.learningPath is missing, defaults to "beginner"
 * - Content filtered by: moduleId, level, isActive=true
 * - Content ordered by: order ASC
 * - Only LESSON content returned
 * 
 * Response:
 * - 200: Success with lessons array (empty if no content)
 * - 400: Invalid moduleId
 * - 401: Authentication failed
 * - 404: User not found in database
 */
router.get("/:moduleId", verifyAuth, async (req: Request, res: Response) => {
    try {
        const { moduleId } = req.params;
        const decodedUser = (req as any).user;
        const email = decodedUser.email;

        // Validate moduleId
        const moduleIdNum = parseInt(moduleId, 10);
        if (isNaN(moduleIdNum) || moduleIdNum < 1) {
            return res.status(400).json({
                error: "Invalid moduleId",
                message: "moduleId must be a positive number",
            });
        }

        if (!email) {
            return res.status(401).json({ error: "User email not found in token" });
        }

        // Fetch user from MongoDB to get learningPath
        const user = await User.findOne({ email }).select("learningPath").lean();

        if (!user) {
            return res.status(404).json({
                error: "User not found",
                message: "User must be registered in the system",
            });
        }

        // Determine user's learning level
        // CRITICAL: Backend is the ONLY source of truth for learning level
        // Frontend CANNOT control this value
        const userLevel = user.learningPath || "beginner";

        // Fetch content filtered by moduleId, level, and active status
        const lessons = await Content.find({
            moduleId: moduleIdNum,
            level: userLevel,
            isActive: true,
            type: "lesson", // Only return lesson content
        })
            .sort({ order: 1 }) // Order ascending
            .select("title body order") // Only return necessary fields
            .lean();

        // Return success response
        // Note: Empty array is valid (module may not have content yet)
        res.json({
            moduleId: moduleIdNum,
            level: userLevel,
            lessons: lessons.map((lesson) => ({
                title: lesson.title,
                body: lesson.body,
                order: lesson.order,
            })),
        });
    } catch (err) {
        console.error("Error in GET /api/content/:moduleId:", err);
        res.status(500).json({ error: "Internal server error" });
    }
});

export default router;
