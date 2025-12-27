import { Schema, model, Document } from "mongoose";

export interface IMessage extends Document {
  activityId: string;
  groupId: string;
  text: string;
  senderUid: string;
  createdAt: Date;
  updatedAt: Date;
}

const MessageSchema = new Schema<IMessage>(
  {
    activityId: { type: String, required: true, index: true },
    groupId: { type: String, required: true, index: true },
    text: { type: String, required: true },
    senderUid: { type: String, required: true, index: true },
  },
  { timestamps: true }
);

export const Message = model<IMessage>("Message", MessageSchema);
