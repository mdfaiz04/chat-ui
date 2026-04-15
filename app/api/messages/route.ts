import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import connectToDatabase from "@/lib/mongoose";
import Message from "@/models/Message";

/**
 * GET /api/messages
 * Fetches either all messages for a specific chatId OR grouped chat sessions
 * Scoped to the authenticated user
 */
export async function GET(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions);

    if (!session?.user?.email) {
      return NextResponse.json(
        { error: "Unauthorized" },
        { status: 401 }
      );
    }

    const userEmail = session.user.email;

    await connectToDatabase();

    const { searchParams } = new URL(request.url);
    const chatId = searchParams.get("chatId");

    if (chatId) {
      // Return specific history for a session — scoped to user
      const messages = await Message.find({ chatId, userId: userEmail }).sort({ timestamp: 1 });
      return NextResponse.json(messages.map(msg => ({
        id: msg._id,
        role: msg.role,
        content: msg.content,
        timestamp: msg.timestamp,
        model: msg.model,
        image: msg.image
      })));
    }

    // Return grouped list of conversations for sidebar — scoped to user
    const sessions = await Message.aggregate([
      { $match: { userId: userEmail } },
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
 * Clears all messages for the authenticated user
 */
export async function DELETE() {
  try {
    const session = await getServerSession(authOptions);

    if (!session?.user?.email) {
      return NextResponse.json(
        { error: "Unauthorized" },
        { status: 401 }
      );
    }

    await connectToDatabase();

    // Remove only this user's messages
    await Message.deleteMany({ userId: session.user.email });

    return NextResponse.json({ message: "Chat history cleared" });
  } catch (error) {
    console.error("Failed to clear messages:", error);
    return NextResponse.json({ error: "Failed to clear chat history" }, { status: 500 });
  }
}