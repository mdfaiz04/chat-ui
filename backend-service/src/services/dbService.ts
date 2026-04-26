import mongoose from 'mongoose';
import dotenv from 'dotenv';
dotenv.config();

/**
 * Backend DB Service
 * Responsibility: MongoDB connection and Model management.
 */

const MessageSchema = new mongoose.Schema(
  {
    // Keep aligned with chat-ui/models/Message.ts so Next API routes can read them.
    threadId: { type: mongoose.Schema.Types.ObjectId, ref: "Thread", required: true, index: true },
    userId: { type: mongoose.Schema.Types.ObjectId, ref: "User", required: true, index: true },
    role: { type: String, enum: ["user", "assistant"], required: true },
    content: { type: String, required: true },
    model: { type: String },
  },
  { timestamps: true }
);

const Message = mongoose.models.Message || mongoose.model('Message', MessageSchema);

export async function connectDB() {
  if (mongoose.connection.readyState === 1) return;
  await mongoose.connect(process.env.MONGODB_URI || "");
}

export async function getThreadHistory(userId: string, threadId: string) {
  const history = await Message.find({ threadId, userId })
    .sort({ createdAt: -1 })
    .limit(10)
    .lean();
  return history.reverse();
}

export async function saveMessage(data: any) {
  return await Message.create(data);
}
