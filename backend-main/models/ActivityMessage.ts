import { Schema, model, Document, Types } from "mongoose";

export interface IActivityMessage extends Document {
    activityId: number;
    groupId: Types.ObjectId;
    userId: Types.ObjectId;
    text: string;
    createdAt: Date;
}

const ActivityMessageSchema = new Schema<IActivityMessage>(
    {
        activityId: { type: Number, required: true },
        groupId: { type: Schema.Types.ObjectId, ref: "Group", required: true },
        userId: { type: Schema.Types.ObjectId, ref: "User", required: true },
        text: { type: String, required: true, trim: true },
        createdAt: { type: Date, default: Date.now },
    }
);

export const ActivityMessage = model<IActivityMessage>(
    "ActivityMessage",
    ActivityMessageSchema
);
