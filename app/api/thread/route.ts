import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import connectToDatabase from "@/lib/mongoose";
import Thread from "@/models/Thread";

/**
 * GET /api/thread
 * Returns all chat threads belonging to the authenticated user.
 */
export async function GET(req: NextRequest) {
  try {
    const session = await getServerSession(authOptions);

    if (!session?.user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    await connectToDatabase();

    const userId = (session.user as any).id;

    if (!userId) {
      return NextResponse.json({ error: "User ID not found in session" }, { status: 400 });
    }

    // Fetch threads for the user, sorted by most recent first
    const threads = await Thread.find({ userId }).sort({ createdAt: -1 });

    return NextResponse.json(threads);
  } catch (error: any) {
    console.error("[THREAD_GET]", error);
    return NextResponse.json(
      { error: "Internal Server Error", details: error.message },
      { status: 500 }
    );
  }
}

/**
 * DELETE /api/thread
 * Deletes all chat threads belonging to the authenticated user.
 */
export async function DELETE(req: NextRequest) {
  try {
    const session = await getServerSession(authOptions);

    if (!session?.user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    await connectToDatabase();

    const userId = (session.user as any).id;

    if (!userId) {
      return NextResponse.json({ error: "User ID not found in session" }, { status: 400 });
    }

    // Delete all threads for this user
    await Thread.deleteMany({ userId });

    // Optional: Delete all messages for these threads
    // await Message.deleteMany({ userId });

    return NextResponse.json({ message: "All history cleared" });
  } catch (error: any) {
    console.error("[THREAD_DELETE_ALL]", error);
    return NextResponse.json(
      { error: "Internal Server Error", details: error.message },
      { status: 500 }
    );
  }
}
