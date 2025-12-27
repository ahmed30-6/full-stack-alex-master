import { Schema, model, Document } from "mongoose";

export interface IScore extends Document {
  studentUid: string;
  examId: string;
  score: number;
  maxScore: number;
  groupId?: string;
  meta?: any;
  createdAt: Date;
  updatedAt: Date;
}

const ScoreSchema = new Schema<IScore>(
  {
    studentUid: { type: String, required: true, index: true },
    examId: { type: String, required: true, index: true },
    score: { type: Number, required: true },
    maxScore: { type: Number, required: true },
    groupId: { type: String, index: true },
    meta: { type: Schema.Types.Mixed },
  },
  { timestamps: true }
);

ScoreSchema.index({ studentUid: 1, examId: 1 });

export const Score = model<IScore>("Score", ScoreSchema);
