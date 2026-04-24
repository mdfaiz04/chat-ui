import mongoose, { Schema, model, models } from "mongoose";

/**
 * Message Schema for MongoDB
 * - threadId: The conversation this message belongs to
 * - userId: The user who owns this message
 * - role: 'user' or 'assistant'
 * - content: text of the message
 * - model: the AI model name used for this message
 * - image: optional image URL if an image was uploaded
 */
const MessageSchema = new Schema(
  {
    threadId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Thread",
      required: true,
      index: true,
    },
    userId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      required: true,
    },
    role: {
      type: String,
      enum: ["user", "assistant"],
      required: true,
    },
    content: {
      type: String,
      required: true,
    },
    model: {
      type: String,
    },
    image: {
      type: String,
    },
  },
  {
    timestamps: true, // Automatically manages createdAt and updatedAt
  }
);

// Prevent re-compiling the model
const Message = models.Message || model("Message", MessageSchema);

export default Message;
