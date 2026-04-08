// NextResponse is Next.js's built-in tool for sending back HTTP responses
// Think of it as the "reply" tool for our API
import { NextResponse } from "next/server";

// Import our mongoose connection helper we built in Step 2
import connectToDatabase from "@/lib/mongoose";

// Import the Message model — this is how we talk to the messages collection in MongoDB
import Message from "@/lib/models/Message";

// This is a GET request handler
// In Next.js App Router, you export a function named after the HTTP method
// GET = when someone wants to FETCH/READ data (like loading chat history)
export async function GET() {
  try {
    // Step 1: Connect to the database before doing anything
    // "await" means: wait here until the connection is ready before moving on
    await connectToDatabase();

    // Step 2: Fetch ALL messages from MongoDB
    // .find({}) means "find everything" — empty {} = no filters
    // .sort({ timestamp: 1 }) means sort by time, oldest first (1 = ascending)
    // This ensures messages appear in the correct order in the chat
    const messages = await Message.find({}).sort({ timestamp: 1 });

    // Step 3: Send the messages back as a JSON response
    // JSON is the format APIs use to send data — like a structured text format
    // { messages } is shorthand for { messages: messages }
    return NextResponse.json({ messages });

  } catch (error) {
    // If anything goes wrong (DB down, network issue etc),
    // we catch the error here and send back a proper error response
    // HTTP status 500 means "Internal Server Error"
    console.error("Error fetching messages:", error);
    return NextResponse.json(
      { error: "Failed to fetch messages" },
      { status: 500 }
    );
  }
}