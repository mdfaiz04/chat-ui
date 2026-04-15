import mongoose, { Schema, model, models } from "mongoose";

/**
 * Message Schema for MongoDB
 * - role: 'user' or 'assistant'
 * - content: text of the message
 * - model: the AI model name used for this message
 * - image: optional image URL if an image was uploaded
 * - timestamp: when the message was created
 */
const MessageSchema = new Schema({
  chatId: {
    type: String,
    required: false,
  },
  userId: {
    type: String,
    required: true, // Tied to Google Email
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
  timestamp: {
    type: Date,
    default: Date.now,
  },
});

// Check if the model already exists to prevent duplication errors during Next.js hot-reloads
const Message = models.Message || model("Message", MessageSchema);

export default Message;
