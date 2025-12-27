import { Schema, model, Document } from "mongoose";

export interface IGroup extends Document {
  name: string;
  type: "single" | "multi";
  members: Schema.Types.ObjectId[]; // Array of ObjectId ref User
  level: "beginner" | "intermediate" | "advanced";
  createdBy: Schema.Types.ObjectId; // Admin user objectId
  createdAt: Date;
  updatedAt: Date;
}

const GroupSchema = new Schema<IGroup>(
  {
    name: { type: String, required: true },
    type: {
      type: String,
      enum: ["single", "multi"],
      required: true,
      default: "single",
    },
    members: {
      type: [Schema.Types.ObjectId],
      ref: "User",
      default: [],
    },
    level: {
      type: String,
      enum: ["beginner", "intermediate", "advanced"],
      required: true,
      default: "beginner",
    },
    createdBy: { type: Schema.Types.ObjectId, ref: "User", required: true },
  },
  { timestamps: true }
);

// Indexes for efficient queries
GroupSchema.index({ members: 1 });
GroupSchema.index({ level: 1 });
GroupSchema.index({ createdBy: 1 });

export const Group = model<IGroup>("Group", GroupSchema);
