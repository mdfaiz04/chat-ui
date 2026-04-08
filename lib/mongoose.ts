// Import mongoose — our MongoDB object modeling library
import mongoose from "mongoose";

// Read the MongoDB connection string from environment variables
const MONGODB_URI = process.env.MONGODB_URI as string;

// Safety check — crash early with a clear message if URI is missing
if (!MONGODB_URI) {
  throw new Error("Please add MONGODB_URI to your .env.local file");
}

// This variable tracks the current connection state
// We store it outside the function so it persists between function calls
// "cached" holds: conn (the connection) and promise (the ongoing connection attempt)
let cached = global as any;

// If the cache doesn't exist yet, initialize it
// This prevents creating multiple connections when Next.js hot-reloads in dev
if (!cached.mongoose) {
  cached.mongoose = { conn: null, promise: null };
}

// This is the main function other files will call to get a DB connection
async function connectToDatabase() {
  // If we already have a connection, just return it immediately
  // No need to connect again
  if (cached.mongoose.conn) {
    return cached.mongoose.conn;
  }

  // If there's no ongoing connection attempt, start one
  if (!cached.mongoose.promise) {
    cached.mongoose.promise = mongoose.connect(MONGODB_URI, {
      bufferCommands: false, // Don't queue commands if connection is lost
    });
  }

  // Wait for the connection to finish and store it
  cached.mongoose.conn = await cached.mongoose.promise;

  // Return the connection
  return cached.mongoose.conn;
}

// Export this function so any file that needs the DB can call it
export default connectToDatabase;