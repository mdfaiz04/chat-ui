import { NextRequest, NextResponse } from "next/server";
import OpenAI from "openai";
import connectToDatabase from "@/lib/mongoose";
import Message from "@/models/Message";
import { getModelConfig, DEFAULT_MODEL } from "@/lib/models";

// ─────────────────────────────────────────────
// PROVIDER: GEMINI
// ─────────────────────────────────────────────
async function callGeminiAPI(prompt: string, geminiModelId: string): Promise<string> {
  const apiKey = process.env.GOOGLE_API_KEY || process.env.GEMINI_API_KEY;

  if (!apiKey) throw new Error("GOOGLE_API_KEY is missing in .env.local");

  const endpoint = `https://generativelanguage.googleapis.com/v1beta/models/${geminiModelId}:generateContent?key=${apiKey}`;

  console.log(`[GEMINI] Calling model: ${geminiModelId}`);

  const response = await fetch(endpoint, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      contents: [{ parts: [{ text: prompt }] }],
    }),
  });

  if (!response.ok) {
    const errorBody = await response.json();
    const errMsg = errorBody?.error?.message || response.statusText;
    console.error(`[GEMINI] API Error (${response.status}):`, errMsg);
    throw new Error(`Gemini API Error: ${errMsg}`);
  }

  const data = await response.json();
  return data.candidates?.[0]?.content?.parts?.[0]?.text || "No response from Gemini.";
}

// ─────────────────────────────────────────────
// PROVIDER: OLLAMA
// ─────────────────────────────────────────────
async function callOllamaAPI(prompt: string, ollamaModelId: string): Promise<string> {
  const endpoint = "http://localhost:11434/api/generate";

  console.log(`[OLLAMA] Calling model: ${ollamaModelId} at ${endpoint}`);

  let response: Response;
  try {
    response = await fetch(endpoint, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        model: ollamaModelId,
        prompt,
        stream: false,
      }),
    });
  } catch (err: any) {
    // Connection refused — Ollama is not running
    throw new Error(
      `Cannot connect to Ollama at ${endpoint}. Make sure Ollama is running locally. (${err.message})`
    );
  }

  if (!response.ok) {
    const errorBody = await response.text();
    console.error(`[OLLAMA] API Error (${response.status}):`, errorBody);
    throw new Error(`Ollama API Error (${response.status}): ${errorBody}`);
  }

  const data = await response.json();
  if (!data.response) {
    throw new Error("Ollama returned an empty response.");
  }

  console.log(`[OLLAMA] Response received (${data.response.length} chars)`);
  return data.response;
}

// ─────────────────────────────────────────────
// PROVIDER: OPENAI
// ─────────────────────────────────────────────
async function callOpenAIAPI(prompt: string, openAiModelId: string): Promise<string> {
  const apiKey = process.env.OPENAI_API_KEY;
  if (!apiKey) throw new Error("OPENAI_API_KEY is missing in .env.local");

  console.log(`[OPENAI] Calling model: ${openAiModelId}`);

  const openai = new OpenAI({ apiKey });
  const completion = await openai.chat.completions.create({
    model: openAiModelId,
    messages: [{ role: "user", content: prompt }],
  });

  return completion.choices[0]?.message?.content || "No response from OpenAI.";
}

// ─────────────────────────────────────────────
// MAIN POST HANDLER
// ─────────────────────────────────────────────
export async function POST(request: NextRequest) {
  try {
    console.log("\n=== API REQUEST RECEIVED ===");

    await connectToDatabase();

    const body = await request.json();
    const { message, model, chatId } = body;

    const chatContent = message || body.content;
    const modelValue: string = model || DEFAULT_MODEL;
    // ── Check if we should use real AI or Mock ──
    const rawUseRealAI = process.env.USE_REAL_AI;
    const useRealAI = String(rawUseRealAI).trim().toLowerCase() === "true";

    // Debug logging for Vercel/Production troubleshooting
    console.log("ENV USE_REAL_AI (raw):", rawUseRealAI);
    console.log("ENV USE_REAL_AI (parsed):", useRealAI);

    // ── Validate inputs ──────────────────────────
    if (!chatId) {
      return NextResponse.json({ error: "chatId is required" }, { status: 400 });
    }
    if (!chatContent) {
      return NextResponse.json({ error: "Message content is required" }, { status: 400 });
    }

    // ── Resolve model config (exact lookup, no fragile string matching) ──
    let modelConfig;
    try {
      modelConfig = getModelConfig(modelValue);
    } catch {
      console.warn(`[ROUTER] Unknown model value "${modelValue}", falling back to "${DEFAULT_MODEL}"`);
      modelConfig = getModelConfig(DEFAULT_MODEL);
    }

    console.log(`[ROUTER] Model selected: "${modelValue}" → provider: ${modelConfig.provider} → API model: ${modelConfig.model}`);

    // ── Fetch conversation history ──────────────
    const history = await Message.find({ chatId })
      .sort({ timestamp: -1 })
      .limit(6)
      .lean();
    history.reverse();

    const historyText = history
      .map((msg: any) => `${msg.role === "user" ? "User" : "AI"}: ${msg.content}`)
      .join("\n");

    // ── Save user message ───────────────────────
    await Message.create({
      chatId,
      role: "user",
      content: chatContent,
      model: modelValue,
    });

    const prompt = `You are a helpful AI assistant.

Conversation History:
${historyText || "(No previous messages)"}

User: ${chatContent}

AI:`;

    // ── Route to correct provider ───────────────
    let botReply = "";

    if (useRealAI) {
      try {
        const { provider, model: apiModelId } = modelConfig;

        if (provider === "gemini") {
          console.log(`[ROUTER] → Using GEMINI`);
          botReply = await callGeminiAPI(prompt, apiModelId);

        } else if (provider === "ollama") {
          console.log(`[ROUTER] → Using OLLAMA`);
          botReply = await callOllamaAPI(prompt, apiModelId);

        } else if (provider === "openai") {
          console.log(`[ROUTER] → Using OPENAI`);
          botReply = await callOpenAIAPI(prompt, apiModelId);

        } else {
          throw new Error(`No handler for provider: ${provider}`);
        }

      } catch (err: any) {
        console.error(`[ROUTER] Provider error (${modelConfig.provider}):`, err.message);
        // Return a descriptive error — do NOT silently fall back to another model
        return NextResponse.json(
          {
            error: `AI provider error (${modelConfig.provider})`,
            details: err.message,
          },
          { status: 502 }
        );
      }
    } else {
      // USE_REAL_AI is false — mock mode
      botReply = `[Mock] You asked: "${chatContent}" (using ${modelConfig.label})`;
      console.log("[ROUTER] USE_REAL_AI=false → returning mock response");
    }

    // ── Guard: never save an empty reply ────────
    if (!botReply || botReply.trim() === "") {
      console.warn("[ROUTER] Empty reply received from provider — something went wrong.");
      return NextResponse.json(
        { error: "Empty response from AI provider." },
        { status: 502 }
      );
    }

    // ── Save AI response ────────────────────────
    const aiMessage = await Message.create({
      chatId,
      role: "assistant",
      content: botReply,
      model: modelValue,
    });

    console.log(`[ROUTER] ✅ Response saved (${botReply.length} chars) — ID: ${aiMessage._id}\n`);

    return new Response(aiMessage.content, {
      status: 201,
      headers: { "Content-Type": "text/plain" },
    });

  } catch (error: any) {
    console.error("[CRITICAL ERROR]", error);
    return NextResponse.json(
      { error: "Internal Server Error", details: error.message },
      { status: 500 }
    );
  }
}