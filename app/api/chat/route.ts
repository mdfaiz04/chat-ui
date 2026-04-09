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
    const { content } = body;

    // Validate — make sure the message isn't empty and is a string
    if (!content || typeof content !== "string" || content.trim() === "") {
      return NextResponse.json(
        { error: "Message content is required" },
        { status: 400 }
      );
    }

    // Simulate the bot "thinking" with a 1.5 second delay
    await delay(1500);

    // Generate a random mock bot response
    const botReply = getRandomResponse();
    
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