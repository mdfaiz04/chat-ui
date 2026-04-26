import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import dbConnect from "@/lib/dbConnect";
import Thread from "@/models/Thread";

/**
 * GET /api/thread/[id]
 * Returns metadata for a specific thread (e.g., title).
 * Scoped to the authenticated user.
 */
export async function GET(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const session = await getServerSession(authOptions);

    if (!session?.user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { id } = await params;
    const userId = (session.user as any).id;

    console.log(`[API_THREAD_GET] Fetching thread: ${id} for user: ${userId}`);

    await dbConnect();

    const thread = await Thread.findOne({ _id: id, userId });

    if (!thread) {
      return NextResponse.json({ error: "Thread not found" }, { status: 404 });
    }

    return NextResponse.json(thread);
  } catch (error: any) {
    console.error("[THREAD_GET_SINGLE]", error);
    return NextResponse.json(
      { error: "Internal Server Error" },
      { status: 500 }
    );
  }
}

/**
 * PATCH /api/thread/[id]
 * Updates thread metadata (e.g., renaming the title).
 */
export async function PATCH(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const session = await getServerSession(authOptions);

    if (!session?.user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { id } = await params;
    const userId = (session.user as any).id;
    const { title } = await req.json();

    await dbConnect();

    const updatedThread = await Thread.findOneAndUpdate(
      { _id: id, userId },
      { title },
      { new: true }
    );

    if (!updatedThread) {
      return NextResponse.json({ error: "Thread not found" }, { status: 404 });
    }

    return NextResponse.json(updatedThread);
  } catch (error: any) {
    console.error("[THREAD_PATCH]", error);
    return NextResponse.json(
      { error: "Internal Server Error" },
      { status: 500 }
    );
  }
}

/**
 * DELETE /api/thread/[id]
 * Deletes a thread and its messages.
 */
export async function DELETE(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const session = await getServerSession(authOptions);

    if (!session?.user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { id } = await params;
    const userId = (session.user as any).id;

    console.log(`[API_THREAD_DELETE] Deleting thread: ${id} for user: ${userId}`);

    await dbConnect();

    // 1. Delete the thread entry
    const deletedThread = await Thread.findOneAndDelete({ _id: id, userId });

    if (!deletedThread) {
      console.warn(`[API_THREAD_DELETE] Thread ${id} not found or unauthorized`);
      return NextResponse.json({ error: "Thread not found" }, { status: 404 });
    }

    console.log(`[API_THREAD_DELETE] Successfully deleted thread: ${id}`);
    return NextResponse.json({ message: "Thread deleted successfully" });
  } catch (error: any) {
    console.error("[THREAD_DELETE]", error);
    return NextResponse.json(
      { error: "Internal Server Error", details: error.message },
      { status: 500 }
    );
  }
}
