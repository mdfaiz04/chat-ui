import { NextRequest, NextResponse } from "next/server";
import { GoogleGenerativeAI } from "@google/generative-ai";
import OpenAI from "openai";
import connectToDatabase from "@/lib/mongoose";
import Message from "@/models/Message";
import mongoose from "mongoose";

// ✅ Model Mapping
const MODEL_MAP: Record<string, string> = {
  ollama: "phi3",
  openai: "gpt-4o-mini",
  gemini: "gemini-1.5-flash",
};

export async function POST(request: NextRequest) {
  try {
    console.log("=== API REQUEST RECEIVED ===");

    await connectToDatabase();

    const body = await request.json();
    const { message, model, chatId } = body;

    const chatContent = message || body.content;
    const targetModel = model || "Ollama (Local)";
    const useRealAI = process.env.USE_REAL_AI === "true";

    console.log(`DEBUG Model: ${targetModel}`);

    if (!chatId) {
      return NextResponse.json({ error: "chatId is required" }, { status: 400 });
    }

    if (!chatContent) {
      return NextResponse.json({ error: "Message content is required" }, { status: 400 });
    }

    // ✅ 1. Fetch Chat History (Before saving current message so we don't duplicate it)
    // Fetch last 6 messages from MongoDB using `chatId`, sorted newest to oldest, then reverse to chronological order
    const history = await Message.find({ chatId })
      .sort({ timestamp: -1 }) // -1 gives newest first
      .limit(6)
      .lean();
    
    history.reverse(); // put it back into reading chronological order

    // ✅ 2. Format History for AI
    // Convert previous messages into a clear text format: "User: ..." or "AI: ..."
    let historyText = history
      .map((msg: any) => `${msg.role === "user" ? "User" : "AI"}: ${msg.content}`)
      .join("\n");

    // ✅ Save user message
    await Message.create({
      chatId,
      role: "user",
      content: chatContent,
      model: targetModel,
    });


    let botReply = "";

    if (useRealAI) {
      try {
        const lowerModel = targetModel.toLowerCase();
        let provider: "ollama" | "openai" | "gemini" | "claude" = "ollama";

        if (lowerModel.includes("gpt") || lowerModel.includes("openai")) {
          provider = "openai";
        } else if (lowerModel.includes("gemini")) {
          provider = "gemini";
        } else if (lowerModel.includes("claude")) {
          provider = "claude";
        }

        // ✅ 1. INTENT DETECTION
        const lowerMsg = chatContent.toLowerCase();

        const isGreeting =
          lowerMsg === "hi" ||
          lowerMsg === "hello" ||
          lowerMsg.includes("hey");

        const isDetailed =
          lowerMsg.includes("explain") ||
          lowerMsg.includes("detail") ||
          lowerMsg.includes("what") ||
          lowerMsg.includes("how") ||
          lowerMsg.includes("why");

        const isFollowUp =
          lowerMsg.includes("detail") ||
          lowerMsg.includes("more") ||
          lowerMsg.includes("example") ||
          lowerMsg.includes("explain");

        // ✅ SMART CONTEXT HANDLING
        if (!isFollowUp) {
          historyText = "";
        }

        // ✅ 2. RESPONSE LOGIC
        let prompt = "";

        if (isGreeting) {
          prompt = `
You are a friendly AI.

Reply in ONLY one short line.
Be natural and conversational.

Example:
"Hi! How can I help you today?"
`;
        } else {
          prompt = `
You are a helpful AI assistant.

IMPORTANT RULES:
- Answer ONLY the latest user question
- If the question is new, ignore previous conversation
- ONLY continue previous topic if clearly asked
- DO NOT mix unrelated topics
- DO NOT assume context incorrectly
- DO NOT generate unrelated content

Style:
- Natural (like ChatGPT)
- Clean (no ###, no markdown noise)
- Human-like tone

Conversation:
${historyText}

User: ${chatContent}

AI:
`;
        }

        // ✅ 3. ENABLE STREAMING (CRITICAL)
        if (provider === "ollama") {
          console.log("DEBUG: Using Ollama (phi3) with streaming...");

          const ollamaResponse = await fetch("http://localhost:11434/api/generate", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({
              model: MODEL_MAP.ollama,
              prompt,
              stream: true, // 🔥 IMPORTANT
              options: {
                num_predict: isDetailed ? 500 : 120,
                temperature: 0.7,
                stop: ["User:", "AI:"]
              }
            }),
          });

          if (!ollamaResponse.ok) {
            const text = await ollamaResponse.text();
            throw new Error(`Ollama API error: ${ollamaResponse.status} - ${text}`);
          }

          // Return streaming response
          const stream = new ReadableStream({
            async start(controller) {
              const reader = ollamaResponse.body?.getReader();
              if (!reader) {
                controller.close();
                return;
              }
              const decoder = new TextDecoder();
              let buffer = "";
              let fullText = "";

              try {
                while (true) {
                  const { done, value } = await reader.read();
                  if (done) break;

                  buffer += decoder.decode(value, { stream: true });
                  const lines = buffer.split('\n');
                  buffer = lines.pop() || "";

                  for (const line of lines) {
                    if (!line.trim()) continue;
                    try {
                      const parsed = JSON.parse(line);
                      if (parsed.response) {
                        fullText += parsed.response;
                        controller.enqueue(new TextEncoder().encode(parsed.response));
                      }
                    } catch (e) {
                      // ignore parse errors for partial chunks
                    }
                  }
                }
              } finally {
                // ✅ 6. CLEAN OUTPUT SAFETY
                let safeBotReply = fullText.split("User:")[0];
                safeBotReply = safeBotReply.split("AI:")[0];
                safeBotReply = safeBotReply.replace("<|assistant|>", "").trimStart();
                safeBotReply = safeBotReply.replace("<|end|>", "");

                if (safeBotReply.toLowerCase().includes("covenant")) {
                  safeBotReply = "⚠️ Context mismatch detected. Please retry.";
                }

                // SAVE AI RESPONSE to MongoDB
                try {
                  if (mongoose.connection.readyState !== 1) {
                    await connectToDatabase();
                  }
                  await Message.create({
                    chatId,
                    role: "assistant",
                    content: safeBotReply,
                    model: targetModel,
                  });
                  console.log("✅ AI streamed & saved");
                } catch (err: any) {
                  console.error("DB Save Error:", err);
                }

                controller.close();
              }
            }
          });

          return new Response(stream, {
            headers: {
              'Content-Type': 'text/plain; charset=utf-8',
              'Transfer-Encoding': 'chunked'
            }
          });
        }

        // =========================
        // ✅ OPENAI
        // =========================
        else if (provider === "openai") {
          console.log("DEBUG: Using OpenAI...");

          const openai = new OpenAI({
            apiKey: process.env.OPENAI_API_KEY,
          });

          const completion = await openai.chat.completions.create({
            model: MODEL_MAP.openai,
            messages: [
              {
                role: "user",
                content: prompt, // using the generated prompt
              },
            ],
          });

          botReply = completion.choices[0]?.message?.content || "";
        }

        // =========================
        // ✅ GEMINI
        // =========================
        else if (provider === "gemini") {
          console.log("DEBUG: Using Gemini...");

          const genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY!);

          const generativeModel = genAI.getGenerativeModel({
            model: MODEL_MAP.gemini,
          });

          const result = await generativeModel.generateContent(prompt); // using generated prompt

          botReply = result.response.text();
        }
      } catch (apiError: any) {
        console.error("DEBUG: AI ERROR:", apiError.message);

        botReply =
          "⚠️ AI Error. Check:\n" +
          "- Ollama is running\n" +
          "- Model installed (ollama pull phi3)";
      }
    }

    // fallback safety
    if (!botReply || botReply.trim() === "") {
      botReply = "⚠️ AI Error: Could not generate response.";
    }

    let safeBotReply = botReply.split("User:")[0];
    safeBotReply = safeBotReply.split("AI:")[0];
    safeBotReply = safeBotReply.replace("<|assistant|>", "").trimStart();
    safeBotReply = safeBotReply.replace("<|end|>", "");

    if (safeBotReply.toLowerCase().includes("covenant")) {
      safeBotReply = "⚠️ Context mismatch detected. Please retry.";
    }

    // SAVE AI RESPONSE (NON-STREAMED)
    console.log(`DEBUG: Saving non-streamed AI message...`);
    try {
      if (mongoose.connection.readyState !== 1) {
        console.warn("Reconnecting DB...");
        await connectToDatabase();
      }

      const aiMessage = await Message.create({
        chatId,
        role: "assistant",
        content: safeBotReply,
        model: targetModel,
      });

      console.log("✅ AI saved:", aiMessage._id);

      // Return raw text response instead of JSON for unified receiver handling
      return new Response(aiMessage.content, {
        status: 201,
        headers: { 'Content-Type': 'text/plain; charset=utf-8' }
      });
    } catch (err: any) {
      console.error("DB Save Error:", err);
      throw err;
    }
  } catch (error: any) {
    console.error("CRITICAL ERROR:", error);

    return NextResponse.json(
      { error: "Internal Server Error", details: error.message },
      { status: 500 }
    );
  }
}