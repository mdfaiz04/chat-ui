import { NextRequest, NextResponse } from "next/server";
import connectToDatabase from "@/lib/mongoose";
import Message from "@/models/Message";

// An array of mock bot responses
const mockResponses = [
  "That's an interesting point! Tell me more.",
  "I understand what you're saying. Can you elaborate?",
  "Great question! I'm still learning, but I'll do my best.",
  "Thanks for sharing that with me!",
  "I'm processing your message... That's fascinating!",
  "Could you clarify what you mean by that?",
  "Absolutely! I agree with your perspective.",
  "Let me think about that for a moment...",
];

function getRandomResponse(): string {
  const randomIndex = Math.floor(Math.random() * mockResponses.length);
  return mockResponses[randomIndex];
}

function delay(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

export async function POST(request: NextRequest) {
  try {
    // 1. Connect to MongoDB
    console.log("Connecting to database...");
    await connectToDatabase();

    const body = await request.json();
    const { message, model, image, chatId } = body;
    const chatContent = message || body.content;

    // Validate
    if (!chatId) {
      return NextResponse.json({ error: "chatId is required" }, { status: 400 });
    }

    console.log(`Processing message for chatId: ${chatId}, model: ${model}`);

    if (!chatContent || typeof chatContent !== "string" || chatContent.trim() === "") {
      return NextResponse.json({ error: "Message content is required" }, { status: 400 });
    }

    // 2. Save incoming user message to DB
    console.log("Saving user message to MongoDB...");
    const userMessage = await Message.create({
      chatId,
      role: "user",
      content: chatContent,
      model: model,
      image: image,
    });
    console.log("User message saved:", userMessage._id);

    // 3. Keep existing mock response generator logic
    const useRealAI = process.env.USE_REAL_AI === "true";
    let botReply = "";

    if (useRealAI) {
      if (model === "Gemini 3 Flash") {
        if (process.env.GEMINI_API_KEY) {
          // Future real Gemini API logic
        }
      } else if (model === "Claude Sonnet") {
        if (process.env.CLAUDE_API_KEY) {
          // Future real Claude API logic
        }
      } else if (model === "GPT-OSS 120B") {
        if (process.env.OPENAI_API_KEY) {
          // Future real OpenAI API logic
        }
      }
    }

    // Fallback to mock
    if (!botReply) {
      await delay(1500);
      botReply = getRandomResponse();
    }
    
    // 4. Save AI response also to DB
    console.log("Saving AI response to MongoDB...");
    const aiMessage = await Message.create({
      chatId,
      role: "assistant",
      content: botReply,
      model: model,
    });
    console.log("AI message saved:", aiMessage._id);

    // 5. Return AI response as before
    return NextResponse.json(
      {
        message: {
          id: aiMessage._id,
          role: "assistant",
          content: aiMessage.content,
          timestamp: aiMessage.timestamp,
        }
      },
      { status: 201 }
    );

  } catch (error) {
    console.error("CRITICAL API ERROR:", error);
    return NextResponse.json(
      { error: "Failed to process message" },
      { status: 500 }
    );
  }
}


