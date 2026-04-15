import { NextRequest, NextResponse } from "next/server";
import OpenAI from "openai";
import connectToDatabase from "@/lib/mongoose";
import Message from "@/models/Message";
import { getModelConfig, DEFAULT_MODEL } from "@/lib/models";

// ─────────────────────────────────────────────
// GEMINI
// ─────────────────────────────────────────────
async function callGeminiAPI(prompt: string, modelId: string): Promise<string> {
  const apiKey = process.env.GOOGLE_API_KEY || process.env.GEMINI_API_KEY;
  if (!apiKey) throw new Error("GOOGLE_API_KEY missing");

  console.log(`[GEMINI] Calling model: ${modelId}`);

  const res = await fetch(
    `https://generativelanguage.googleapis.com/v1beta/models/${modelId}:generateContent?key=${apiKey}`,
    {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        contents: [{ parts: [{ text: prompt }] }],
      }),
    }
  );

  if (!res.ok) {
    const err = await res.json();
    throw new Error(err?.error?.message || "Gemini error");
  }

  const data = await res.json();
  return data.candidates?.[0]?.content?.parts?.[0]?.text || "No response";
}

// ─────────────────────────────────────────────
// OLLAMA
// ─────────────────────────────────────────────
async function callOllamaAPI(prompt: string, modelId: string): Promise<string> {
  const endpoint = "http://localhost:11434/api/generate";

  console.log(`[OLLAMA] Calling model: ${modelId}`);

  const res = await fetch(endpoint, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      model: modelId,
      prompt,
      stream: false,
    }),
  });

  if (!res.ok) {
    const err = await res.text();
    throw new Error(`Ollama error: ${err}`);
  }

  const data = await res.json();
  return data.response || "No response";
}

// ─────────────────────────────────────────────
// OPENAI
// ─────────────────────────────────────────────
async function callOpenAIAPI(prompt: string, modelId: string): Promise<string> {
  const apiKey = process.env.OPENAI_API_KEY;
  if (!apiKey) throw new Error("OPENAI_API_KEY missing");

  console.log(`[OPENAI] Calling model: ${modelId}`);

  const openai = new OpenAI({ apiKey });
  const completion = await openai.chat.completions.create({
    model: modelId,
    messages: [{ role: "user", content: prompt }],
  });

  return completion.choices[0]?.message?.content || "No response";
}

// ─────────────────────────────────────────────
// MAIN
// ─────────────────────────────────────────────
export async function POST(req: NextRequest) {
  try {
    console.log("\n=== API REQUEST RECEIVED ===");

    await connectToDatabase();

    const body = await req.json();
    const { message, model, chatId } = body;

    const chatContent = message || body.content;
    const modelValue = model || DEFAULT_MODEL;

    // 🔥 FORCE REAL AI (NO MOCK EVER)
    console.log("ENV USE_REAL_AI:", process.env.USE_REAL_AI);
    const useRealAI = true;

    if (!chatId) {
      return NextResponse.json({ error: "chatId required" }, { status: 400 });
    }

    if (!chatContent) {
      return NextResponse.json({ error: "Message required" }, { status: 400 });
    }

    let modelConfig;
    try {
      modelConfig = getModelConfig(modelValue);
    } catch {
      modelConfig = getModelConfig(DEFAULT_MODEL);
    }

    console.log(
      `[ROUTER] Model: "${modelValue}" → ${modelConfig.provider} → ${modelConfig.model}`
    );

    // History
    const history = await Message.find({ chatId })
      .sort({ timestamp: -1 })
      .limit(6)
      .lean();

    history.reverse();

    const historyText = history
      .map((m: any) => `${m.role === "user" ? "User" : "AI"}: ${m.content}`)
      .join("\n");

    // Save user
    await Message.create({
      chatId,
      role: "user",
      content: chatContent,
      model: modelValue,
    });

    const prompt = `
You are a helpful AI assistant.

${historyText}

User: ${chatContent}
AI:
`;

    let reply = "";

    try {
      const { provider, model: apiModel } = modelConfig;

      if (provider === "gemini") {
        console.log("[ROUTER] → GEMINI");
        reply = await callGeminiAPI(prompt, apiModel);
      } else if (provider === "ollama") {
        console.log("[ROUTER] → OLLAMA");
        reply = await callOllamaAPI(prompt, apiModel);
      } else if (provider === "openai") {
        console.log("[ROUTER] → OPENAI");
        reply = await callOpenAIAPI(prompt, apiModel);
      } else {
        throw new Error("Unknown provider");
      }
    } catch (err: any) {
      console.error("[AI ERROR]", err.message);

      return NextResponse.json(
        { error: "AI failed", details: err.message },
        { status: 502 }
      );
    }

    if (!reply || reply.trim() === "") {
      return NextResponse.json(
        { error: "Empty AI response" },
        { status: 502 }
      );
    }

    const aiMsg = await Message.create({
      chatId,
      role: "assistant",
      content: reply,
      model: modelValue,
    });

    console.log(`[ROUTER] ✅ Saved (${reply.length} chars)`);

    return new Response(aiMsg.content, {
      status: 201,
      headers: { "Content-Type": "text/plain" },
    });
  } catch (err: any) {
    console.error("[CRITICAL ERROR]", err);

    return NextResponse.json(
      { error: "Server error", details: err.message },
      { status: 500 }
    );
  }
}