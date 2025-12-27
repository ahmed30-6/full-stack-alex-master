import { Schema, model, Document } from "mongoose";

/**
 * Content Interface
 * Represents educational lesson content for adaptive learning system
 * Content is filtered by moduleId and learning level
 */
export interface IContent extends Document {
    moduleId: number;
    level: "beginner" | "intermediate" | "advanced";
    type: "lesson";
    title: string;
    body: string;
    order: number;
    isActive: boolean;
    createdAt: Date;
    updatedAt: Date;
}

/**
 * Content Schema
 * 
 * Design Decisions:
 * 1. moduleId: Number for easy querying and sorting
 * 2. level: Enum matches User.learningPath values exactly
 * 3. type: Enum for future extensibility (quiz, activity, etc.)
 * 4. title: Arabic-supported string for lesson titles
 * 5. body: Text field for lesson content (supports Arabic)
 * 6. order: Explicit ordering within module+level combination
 * 7. isActive: Soft delete / draft support
 * 
 * Indexes:
 * - Compound index on (moduleId, level, isActive, order) for optimal query performance
 * - Individual index on isActive for admin queries
 */
const ContentSchema = new Schema<IContent>(
    {
        moduleId: {
            type: Number,
            required: true,
            min: 1,
            index: true,
        },
        level: {
            type: String,
            enum: ["beginner", "intermediate", "advanced"],
            required: true,
            index: true,
        },
        type: {
            type: String,
            enum: ["lesson"],
            default: "lesson",
            required: true,
        },
        title: {
            type: String,
            required: true,
            trim: true,
            maxlength: 500,
        },
        body: {
            type: String,
            required: true,
        },
        order: {
            type: Number,
            required: true,
            min: 0,
            default: 0,
        },
        isActive: {
            type: Boolean,
            default: true,
            index: true,
        },
    },
    {
        timestamps: true,
    }
);

// Compound index for optimal query performance
// Query pattern: Find by moduleId + level, filter by isActive, sort by order
ContentSchema.index({ moduleId: 1, level: 1, isActive: 1, order: 1 });

// Ensure no duplicate order within same module+level combination
ContentSchema.index(
    { moduleId: 1, level: 1, order: 1 },
    { unique: true, sparse: false }
);

export const Content = model<IContent>("Content", ContentSchema);
