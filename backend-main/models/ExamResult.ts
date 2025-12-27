import { Schema, model, Document } from "mongoose";

export interface IExamResult extends Document {
    userId: Schema.Types.ObjectId;
    examId: string; // can be number or string ID from frontend constants
    examType: "pre" | "post";
    score: number;
    total: number;
    groupId?: Schema.Types.ObjectId; // Optional
    learningPath?: "beginner" | "intermediate" | "advanced" | null;
    createdAt: Date;
}

const ExamResultSchema = new Schema<IExamResult>(
    {
        userId: { type: Schema.Types.ObjectId, ref: "User", required: true },
        examId: { type: String, required: true },
        examType: { type: String, enum: ["pre", "post"], required: true },
        score: { type: Number, required: true },
        total: { type: Number, required: true },
        groupId: { type: Schema.Types.ObjectId, ref: "Group" }, // Optional
        learningPath: {
            type: String,
            enum: ["beginner", "intermediate", "advanced", null],
            default: null
        },
        createdAt: { type: Date, default: Date.now },
    },
    { timestamps: true }
);

export const ExamResult = model<IExamResult>("ExamResult", ExamResultSchema);
