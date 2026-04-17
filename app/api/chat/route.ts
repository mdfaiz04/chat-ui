import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import OpenAI from "openai";
import connectToDatabase from "@/lib/mongoose";
import Message from "@/models/Message";
import { getModelConfig, DEFAULT_MODEL } from "@/lib/models";

// ─────────────────────────────────────────────
// GEN AI HANDLERS (GEMINI, OLLAMA, OPENAI)
// ─────────────────────────────────────────────

async function callGeminiAPI(prompt: string, modelId: string): Promise<string> {
  const apiKey = process.env.GOOGLE_API_KEY || process.env.GEMINI_API_KEY;
  if (!apiKey) throw new Error("GOOGLE_API_KEY missing");

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

async function callOllamaAPI(prompt: string, modelId: string): Promise<string> {
  const endpoint = "http://localhost:11434/api/generate";
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

async function callOpenAIAPI(prompt: string, modelId: string): Promise<string> {
  const apiKey = process.env.OPENAI_API_KEY;
  if (!apiKey) throw new Error("OPENAI_API_KEY missing");

  const openai = new OpenAI({ apiKey });
  const completion = await openai.chat.completions.create({
    model: modelId,
    messages: [{ role: "user", content: prompt }],
  });

  return completion.choices[0]?.message?.content || "No response";
}

// ─────────────────────────────────────────────
// MAIN API ROUTE
// ─────────────────────────────────────────────

export async function POST(req: NextRequest) {
  try {
    const session = await getServerSession(authOptions);

    if (!session?.user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const userId = (session.user as any).id;
    if (!userId) {
      return NextResponse.json({ error: "User ID missing from session" }, { status: 400 });
    }

    await connectToDatabase();

    const { message, threadId, model } = await req.json();

    if (!threadId) {
      return NextResponse.json({ error: "threadId is required" }, { status: 400 });
    }

    if (!message) {
      return NextResponse.json({ error: "Message content is required" }, { status: 400 });
    }

    const modelValue = model || DEFAULT_MODEL;
    let modelConfig;
    try {
      modelConfig = getModelConfig(modelValue);
    } catch {
      modelConfig = getModelConfig(DEFAULT_MODEL);
    }

    // 1. Fetch History Scoped to Thread
    const history = await Message.find({ threadId, userId })
      .sort({ createdAt: -1 })
      .limit(6)
      .lean();

    history.reverse();

    const historyText = history
      .map((m: any) => `${m.role === "user" ? "User" : "Assistant"}: ${m.content}`)
      .join("\n");

    // 2. Save User Message
    await Message.create({
      threadId,
      userId,
      role: "user",
      content: message,
      model: modelValue,
    });

    const prompt = `
You are a helpful AI assistant.

${historyText}

User: ${message}
Assistant:
`;

    let reply = "";
    const { provider, model: apiModel } = modelConfig;

    try {
      if (provider === "gemini") {
        reply = await callGeminiAPI(prompt, apiModel);
      } else if (provider === "ollama") {
        reply = await callOllamaAPI(prompt, apiModel);
      } else if (provider === "openai") {
        reply = await callOpenAIAPI(prompt, apiModel);
      } else {
        throw new Error("Unknown AI provider selected");
      }
    } catch (err: any) {
      return NextResponse.json({ error: "AI invocation failed", details: err.message }, { status: 502 });
    }

    if (!reply) {
      return NextResponse.json({ error: "Empty AI response" }, { status: 502 });
    }

    // 3. Save Assistant Message
    const aiMsg = await Message.create({
      threadId,
      userId,
      role: "assistant",
      content: reply,
      model: modelValue,
    });

    // Return the response as plain text (or we could return JSON)
    // Most chat frontends expect the text response for streaming/immediate display
    return new Response(aiMsg.content, {
      status: 201,
      headers: { "Content-Type": "text/plain" },
    });
  } catch (err: any) {
    console.error("[CHAT_ERROR]", err);
    return NextResponse.json({ error: "Internal Server Error", details: err.message }, { status: 500 });
  }
}