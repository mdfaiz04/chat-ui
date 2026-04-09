import { NextResponse } from "next/server";
import connectToDatabase from "@/lib/mongoose";
import Message from "@/lib/models/Message";

// ✅ GET → fetch messages (THIS IS MISSING IN YOUR CODE)
export async function GET() {
  try {
    await connectToDatabase();

    const messages = await Message.find().sort({ timestamp: 1 });

    return NextResponse.json({ messages });

  } catch (error) {
    console.error("Error fetching messages:", error);
    return NextResponse.json(
      { error: "Failed to fetch messages" },
      { status: 500 }
    );
  }
}

// ✅ DELETE → clear messages (YOU ALREADY HAVE THIS)
export async function DELETE() {
  try {
    await connectToDatabase();

    await Message.deleteMany({});

    return NextResponse.json({ success: true, message: "Chat cleared" });

  } catch (error) {
    console.error("Error clearing messages:", error);
    return NextResponse.json(
      { error: "Failed to clear messages" },
      { status: 500 }
    );
  }
}