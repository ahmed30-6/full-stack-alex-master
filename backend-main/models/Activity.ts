import { Schema, model, Document } from "mongoose";

export interface IActivityFile extends Document {
  activityId: string;
  groupId: string;
  filename: string;
  url: string;
  uploadedByUid: string;
  createdAt: Date;
  updatedAt: Date;
}

const ActivityFileSchema = new Schema<IActivityFile>(
  {
    activityId: { type: String, required: true, index: true },
    groupId: { type: String, required: true, index: true },
    filename: { type: String, required: true },
    url: { type: String, required: true },
    uploadedByUid: { type: String, required: true, index: true },
  },
  { timestamps: true }
);

export const ActivityFile = model<IActivityFile>(
  "ActivityFile",
  ActivityFileSchema
);
