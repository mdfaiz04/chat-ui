// NextRequest lets us READ the incoming request (what the user sent)
// NextResponse lets us SEND back a response
import { NextRequest, NextResponse } from "next/server";

// Our database connection helper
import connectToDatabase from "@/lib/mongoose";

// Our Message model to save messages to MongoDB
import Message from "@/lib/models/Message";

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
    // Step 1: Connect to the database
    await connectToDatabase();

    // Step 2: Read the data the user sent
    // .json() parses the request body from raw text into a JavaScript object
    // "await" because reading the body is an async operation
    const body = await request.json();

    // Step 3: Extract the "content" field from what the user sent
    // We also "trim()" it to remove any accidental spaces at start/end
    const { content } = body;

    // Step 4: Validate — make sure the message isn't empty
    // If someone sends an empty message, we reject it immediately
    if (!content || content.trim() === "") {
      // HTTP status 400 means "Bad Request" — the user sent invalid data
      return NextResponse.json(
        { error: "Message content is required" },
        { status: 400 }
      );
    }

    // Step 5: Save the USER's message to MongoDB
    // "new Message({...})" creates a new message document
    // ".save()" actually writes it to the database
    const userMessage = new Message({
      role: "user",       // This message came from the user
      content: content.trim(), // The actual message text
      // timestamp is automatically set to now (we defined default: Date.now in the model)
    });
    await userMessage.save(); // Wait for it to be saved before continuing

    // Step 6: Simulate the bot "thinking" with a 1.5 second delay
    // This makes the UI feel more realistic — like a real AI is processing
    await delay(1500);

    // Step 7: Generate a random mock bot response
    const botReply = getRandomResponse();

    // Step 8: Save the BOT's response to MongoDB
    const botMessage = new Message({
      role: "assistant",  // This message came from the bot
      content: botReply,  // The randomly selected response
    });
    await botMessage.save(); // Wait for it to be saved

    // Step 9: Send the bot's message back to the frontend
    // The frontend is waiting for this response to show in the chat
    // HTTP status 201 means "Created" — we successfully created new data
    return NextResponse.json(
      {
        message: {
          id: botMessage._id,           // MongoDB auto-generates a unique ID
          role: botMessage.role,
          content: botMessage.content,
          timestamp: botMessage.timestamp,
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