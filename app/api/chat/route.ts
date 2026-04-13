import { NextRequest, NextResponse } from "next/server";

// An array of mock bot responses
// The bot will randomly pick one of these to reply with
// Later, this is where real AI responses will go
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

// This is a helper function that picks a random response from the array above
// Math.random() gives a random number between 0 and 1
// Multiplying by array length and flooring gives a random valid index
function getRandomResponse(): string {
  const randomIndex = Math.floor(Math.random() * mockResponses.length);
  return mockResponses[randomIndex];
}

// This is a helper function that makes our code "wait" for a given time
// We use this to simulate the bot "thinking" (1.5 second delay)
// setTimeout is wrapped in a Promise so we can use "await" with it
function delay(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

// This is a POST request handler
// POST = when someone wants to SEND/CREATE data (like sending a new message)
// The "request" parameter contains everything the user sent to us
export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { message, model } = body;

    // Use content if message is not provided (for backward compatibility if needed, but following requirement #2)
    const chatContent = message || body.content;

    // 6. Add Console Logs for Testing
    console.log("Selected Model:", model);

    // Validate — make sure the message isn't empty and is a string
    if (!chatContent || typeof chatContent !== "string" || chatContent.trim() === "") {
      return NextResponse.json(
        { error: "Message content is required" },
        { status: 400 }
      );
    }

    // 3. Add Future API Structure & 7. Safety (Fallback if no API key)
    const useRealAI = process.env.USE_REAL_AI === "true";
    let botReply = "";

    if (useRealAI) {
      // 5. Add Model Routing Logic (placeholder only)
      if (model === "Gemini 3 Flash") {
        if (process.env.GEMINI_API_KEY) {
          // Future real Gemini API logic here
          // botReply = await callGeminiAPI(chatContent);
        }
      } else if (model === "Claude Sonnet") {
        if (process.env.CLAUDE_API_KEY) {
          // Future real Claude API logic here
          // botReply = await callClaudeAPI(chatContent);
        }
      } else if (model === "GPT-OSS 120B") {
        if (process.env.OPENAI_API_KEY) {
          // Future real OpenAI API logic here
          // botReply = await callOpenAIAPI(chatContent);
        }
      }

      // If a real API was supposed to be used but failed or wasn't implemented yet, 
      // botReply will be empty. We'll fall back to mock.
    }

    // Fallback to mock response if not using real AI or if real AI logic didn't return a reply
    if (!botReply) {
      // Simulate the bot "thinking" with a 1.5 second delay
      await delay(1500);
      botReply = getRandomResponse();
    }
    
    // Generate an ID for the mock message
    const mockId = typeof crypto !== "undefined" && crypto.randomUUID ? crypto.randomUUID() : Date.now().toString() + Math.random();

    // Send the bot's message back to the frontend
    return NextResponse.json(
      {
        message: {
          id: mockId,
          role: "assistant",
          content: botReply,
          timestamp: new Date().toISOString(),
        }
      },
      { status: 201 }
    );

  } catch (error) {
    // If anything goes wrong, log it and return an error response
    console.error("Error processing chat message:", error);
    return NextResponse.json(
      { error: "Failed to process message" },
      { status: 500 }
    );
  }
}