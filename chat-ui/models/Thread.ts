import mongoose, { Schema, model, models } from "mongoose";

const ThreadSchema = new Schema(
  {
    userId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      required: true,
      index: true, // Speeds up queries for a user's threads
    },
    title: {
      type: String,
      default: "New Chat",
      trim: true,
    },
  },
  {
    timestamps: true,
  }
);

// Prevent re-compiling the model if it already exists
const Thread = models.Thread || model("Thread", ThreadSchema);

export default Thread;
