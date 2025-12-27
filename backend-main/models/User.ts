import { Schema, model, Document } from "mongoose";

export interface IUser extends Document {
  firebaseUid: string;
  username: string;
  name: string; // Display name
  email: string;
  avatar?: string;
  profile?: any;
  role: "admin" | "student" | "teacher";
  loginTimes: Date[];
  registeredAt: Date;
  lastActivityAt: Date;
  status: "active" | "inactive" | "suspended";
  createdAt: Date;
  updatedAt: Date;
  learningPath?: string;
  groupId?: Schema.Types.ObjectId;
}

const UserSchema = new Schema<IUser>(
  {
    firebaseUid: { type: String, required: true, unique: true, index: true },
    username: {
      type: String,
      required: true,
      set: (v: string) => v.trim().toLowerCase(),
    },
    name: { type: String, required: true }, // Display name
    email: { type: String, required: true, unique: true, index: true },
    avatar: { type: String, default: null },
    profile: { type: Schema.Types.Mixed, default: {} },
    role: {
      type: String,
      enum: ["admin", "student", "teacher"],
      default: "student",
    },
    loginTimes: { type: [Date], default: [] },
    registeredAt: { type: Date, default: Date.now },
    lastActivityAt: { type: Date, default: Date.now },
    status: {
      type: String,
      enum: ["active", "inactive", "suspended"],
      default: "active",
    },
    learningPath: { type: String, default: null },
    groupId: {
      type: Schema.Types.ObjectId,
      ref: "Group",
      required: function (this: any) {
        return this.role === "student";
      },
    },
  },
  { timestamps: true }
);

// Indexes for common queries
UserSchema.index({ email: 1 });
UserSchema.index({ firebaseUid: 1 });
UserSchema.index({ role: 1 });
UserSchema.index({ status: 1 });

export const User = model<IUser>("User", UserSchema);
