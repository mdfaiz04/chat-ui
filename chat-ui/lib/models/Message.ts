// We import mongoose — the library that helps us define
// the shape of our data and talk to MongoDB
import mongoose, { Schema, Document } from "mongoose";

// This is a TypeScript "interface" — it describes what a Message looks like
// Think of it as a blueprint or a contract that every message must follow
export interface IMessage extends Document {
  role: "user" | "assistant"; // Can ONLY be "user" or "assistant", nothing else
  content: string;            // The actual message text
  timestamp: Date;            // When the message was sent
}

// A "Schema" defines the exact structure of documents in MongoDB
// This is like designing the columns of a table in a spreadsheet
const MessageSchema = new Schema<IMessage>({
  role: {
    type: String,                        // Stored as text
    enum: ["user", "assistant"],         // Only these two values are allowed
    required: true,                      // This field MUST exist, can't be empty
  },
  content: {
    type: String,                        // Stored as text
    required: true,                      // This field MUST exist, can't be empty
  },
  timestamp: {
    type: Date,                          // Stored as a date/time value
    default: Date.now,                   // If not provided, use current time automatically
  },
});

// mongoose.models.Message checks if a model called "Message" already exists
// This prevents the error "Cannot overwrite model once compiled"
// which happens in development when Next.js hot-reloads the file
// If it exists, use it. If not, create a new one from the schema.
const Message =
  mongoose.models.Message ||
  mongoose.model<IMessage>("Message", MessageSchema);

// Export the model so other files can use it to save/read messages
export default Message;