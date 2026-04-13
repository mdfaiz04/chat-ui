import { NextRequest, NextResponse } from "next/server";
import connectToDatabase from "@/lib/mongoose";
import Message from "@/models/Message";

/**
 * GET /api/messages
 * Fetches either all messages for a specific chatId OR grouped chat sessions
 */
export async function GET(request: NextRequest) {
  try {
    await connectToDatabase();
    
    const { searchParams } = new URL(request.url);
    const chatId = searchParams.get("chatId");

    if (chatId) {
      // Return specific history for a session
      const messages = await Message.find({ chatId }).sort({ timestamp: 1 });
      return NextResponse.json(messages.map(msg => ({
        id: msg._id,
        role: msg.role,
        content: msg.content,
        timestamp: msg.timestamp,
        model: msg.model,
        image: msg.image
      })));
    }

    // Return grouped list of conversations for sidebar
    const sessions = await Message.aggregate([
      { $sort: { timestamp: -1 } },
      {
        $group: {
          _id: "$chatId",
          title: { $first: "$content" }, // Use first message as title
          time: { $first: "$timestamp" },
          lastUpdated: { $max: "$timestamp" }
        }
      },
      { $sort: { lastUpdated: -1 } }
    ]);

    return NextResponse.json(sessions);
  } catch (error) {
    console.error("Failed to fetch messages:", error);
    return NextResponse.json({ error: "Failed to fetch messages" }, { status: 500 });
  }
}


/**
 * DELETE /api/messages
 * Clears all messages from the database
 */
export async function DELETE() {
  try {
    await connectToDatabase();
    
    // Remove all documents from the Message collection
    await Message.deleteMany({});

    return NextResponse.json({ message: "Chat history cleared" });
  } catch (error) {
    console.error("Failed to clear messages:", error);
    return NextResponse.json({ error: "Failed to clear chat history" }, { status: 500 });
  }
}