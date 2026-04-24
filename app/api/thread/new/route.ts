import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import dbConnect from "@/lib/dbConnect";
import Thread from "@/models/Thread";

/**
 * POST /api/thread/new
 * Creates a new chat thread for the authenticated user.
 */
export async function POST(req: NextRequest) {
  try {
    const session = await getServerSession(authOptions);

    if (!session?.user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    await dbConnect();

    // Use the user ID from the session token
    const userId = (session.user as any).id;

    if (!userId) {
      return NextResponse.json({ error: "User ID not found in session" }, { status: 400 });
    }

    const { title } = await req.json().catch(() => ({ title: "New Chat" }));

    const newThread = await Thread.create({
      userId,
      title: title || "New Chat",
    });

    return NextResponse.json(newThread, { status: 201 });
  } catch (error: any) {
    console.error("[THREAD_NEW_POST]", error);
    return NextResponse.json(
      { error: "Internal Server Error", details: error.message },
      { status: 500 }
    );
  }
}
