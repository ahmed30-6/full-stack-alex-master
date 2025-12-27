import express, { Request, Response } from "express";
import admin from "firebase-admin";
import { User } from "../models/User";
import { ExamResult } from "../models/ExamResult";

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

// POST /api/exams/submit
router.post("/submit", verifyToken, async (req: Request, res: Response) => {
    try {
        const { examId, examType, score, total } = req.body;
        const decodedUser = (req as any).user;
        const email = decodedUser.email;

        if (!email) {
            return res.status(400).json({ error: "User email not found in token" });
        }

        // Validate inputs are numbers
        if (typeof score !== 'number' || typeof total !== 'number') {
            return res.status(400).json({
                error: "Invalid input: 'score' and 'total' must be numbers",
                received: { score, total }
            });
        }

        // Find user in MongoDB
        const user = await User.findOne({ email });
        if (!user) {
            return res.status(404).json({ error: "User not found" });
        }

        let learningPath: "beginner" | "intermediate" | "advanced" | null = null;

        // Logic for Learning Path calculation (only for "pre" exam)
        if (examType === "pre") {
            try {
                // Ensure total is not zero to avoid division by zero (though 0/0 is NaN coverage above handles it?)
                // Actually NaN is resolved by typeof check (NaN is number), so check !isNaN
                if (isNaN(score) || isNaN(total) || total === 0) {
                    // Log warning but don't crash, maybe default path?
                    // Return 400 for explicit bad math data
                    return res.status(400).json({ error: "Invalid score/total values" });
                }

                const percentage = (score / total) * 100;
                if (percentage <= 40) {
                    learningPath = "beginner";
                } else if (percentage <= 70) {
                    learningPath = "intermediate";
                } else {
                    learningPath = "advanced";
                }

                // Update User model with learning path
                user.learningPath = learningPath;
                await user.save();
            } catch (calcError) {
                console.error("Error calculating learning path:", calcError);
                // Continue saving the result, but maybe without a learning path update?
                // Or fail? Requirement says "Logic throws uncaught errors", so we caught it.
                // We'll proceed.
            }
        }

        // Create ExamResult
        const result = await ExamResult.create({
            userId: user._id as any,
            examId,
            examType,
            score,
            total,
            learningPath, // Save snapshot in result too
        });

        res.json({
            success: true,
            message: "Exam result saved",
            data: result,
            learningPath
        });

    } catch (err) {
        console.error("Error in /api/exams/submit:", err);
        res.status(500).json({ error: "Internal server error" });
    }
});

// GET /api/exams/my - Get logged-in user's results
router.get("/my", verifyToken, async (req: Request, res: Response) => {
    try {
        const decodedUser = (req as any).user;
        const email = decodedUser.email;

        const user = await User.findOne({ email });
        if (!user) {
            return res.status(404).json({ error: "User not found" });
        }

        const results = await ExamResult.find({ userId: user._id as any }).sort({ createdAt: -1 });

        res.json({ results });
    } catch (err) {
        console.error("Error in /api/exams/my:", err);
        res.status(500).json({ error: "Internal server error" });
    }
});

// GET /api/admin/exam-results - Admin only
router.get("/all", verifyToken, async (req: Request, res: Response) => {
    try {
        const decodedUser = (req as any).user;
        const email = decodedUser.email;
        const adminEmail = process.env.ADMIN_EMAIL || "";

        if (!adminEmail || email !== adminEmail) {
            return res.status(403).json({ error: "Forbidden: Admin access required" });
        }

        // Return all results, populate user info
        const results = await ExamResult.find({})
            .populate("userId", "name email role learningPath")
            .sort({ createdAt: -1 });

        res.json({ results });
    } catch (err) {
        console.error("Error in /api/admin/exam-results:", err);
        res.status(500).json({ error: "Internal server error" });
    }
});

export default router;
