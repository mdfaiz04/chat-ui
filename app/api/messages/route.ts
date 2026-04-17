import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import connectToDatabase from "@/lib/mongoose";
import Message from "@/models/Message";

/**
 * GET /api/messages
 * Fetches all messages for a specific threadId.
 * Scoped to the authenticated user.
 */
export async function GET(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions);

    if (!session?.user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const userId = (session.user as any).id;
    const { searchParams } = new URL(request.url);
    const threadId = searchParams.get("threadId");

    if (!threadId) {
      return NextResponse.json({ error: "threadId is required" }, { status: 400 });
    }

    await connectToDatabase();

    // Fetch messages for this thread and user
    const messages = await Message.find({ 
      threadId, 
      userId 
    }).sort({ createdAt: 1 });

    return NextResponse.json(messages);
  } catch (error: any) {
    console.error("[MESSAGES_GET_ERROR]", error);
    return NextResponse.json({ error: "Failed to fetch messages", details: error.message }, { status: 500 });
  }
}

/**
 * DELETE /api/messages
 * Clears messages for a specific threadId
 */
export async function DELETE(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions);

    if (!session?.user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const userId = (session.user as any).id;
    const { searchParams } = new URL(request.url);
    const threadId = searchParams.get("threadId");

    if (!threadId) {
      return NextResponse.json({ error: "threadId is required" }, { status: 400 });
    }

    await connectToDatabase();

    // Remove only this user's messages within this thread
    await Message.deleteMany({ threadId, userId });

    return NextResponse.json({ message: "Thread messages cleared" });
  } catch (error: any) {
    console.error("[MESSAGES_DELETE_ERROR]", error);
    return NextResponse.json({ error: "Failed to clear messages", details: error.message }, { status: 500 });
  }
}