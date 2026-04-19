import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import dbConnect from "@/lib/dbConnect";
import Message from "@/models/Message";

/**
 * DELETE /api/chat/clear
 * Clears all chat messages for the currently logged-in user
 */
export async function DELETE() {
  try {
    const session = await getServerSession(authOptions);

    if (!session?.user?.email) {
      return NextResponse.json(
        { error: "Unauthorized. Please sign in." },
        { status: 401 }
      );
    }

    await dbConnect();

    const result = await Message.deleteMany({ userId: session.user.email });

    return NextResponse.json({
      message: "Chat history cleared",
      deletedCount: result.deletedCount,
    });
  } catch (error: any) {
    console.error("[CLEAR CHAT ERROR]", error);
    return NextResponse.json(
      { error: "Failed to clear chat history", details: error.message },
      { status: 500 }
    );
  }
}
