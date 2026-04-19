import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import dbConnect from "@/lib/dbConnect";
import Message from "@/models/Message";
import { getModelConfig, DEFAULT_MODEL } from "@/lib/models";
import { needsWebSearch, fetchWebContext, formatSearchContext } from "@/lib/webSearch";

export const runtime = "nodejs";
export const maxDuration = 60; // Max execution time for Vercel Serverless

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

    await dbConnect();

    const { message, threadId, model } = await req.json();

    if (!threadId || !message) {
      return NextResponse.json({ error: "Missing parameters" }, { status: 400 });
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

    // 2. Save User Message instantly (Unblocking)
    await Message.create({
      threadId,
      userId,
      role: "user",
      content: message,
      model: modelValue,
    });

    // 2.5 Dynamic Web Search (RAG)
    const shouldSearch = needsWebSearch(message);
    let searchContextText = "";
    let searchResults: Array<{ title: string, url: string, content: string }> = [];

    if (shouldSearch) {
      searchResults = await fetchWebContext(message);
      searchContextText = formatSearchContext(searchResults);
    }

    const prompt = `You are a helpful AI assistant.\n\n${searchContextText}${historyText}\n\nUser: ${message}\nAssistant:`;
    const { provider, model: apiModel } = modelConfig;

    let responseStream: ReadableStream;
    let isOllama = false;

    // 3. Initiate Streaming API Request based on Provider
    if (provider === "gemini") {
      const apiKey = process.env.GOOGLE_API_KEY || process.env.GEMINI_API_KEY;
      const res = await fetch(
        `https://generativelanguage.googleapis.com/v1beta/models/${apiModel}:streamGenerateContent?alt=sse&key=${apiKey}`,
        {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ contents: [{ parts: [{ text: prompt }] }] }),
        }
      );
      if (!res.ok) throw new Error("Gemini stream failed");
      responseStream = res.body!;
    } else if (provider === "openai") {
      const apiKey = process.env.OPENAI_API_KEY;
      const res = await fetch("https://api.openai.com/v1/chat/completions", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${apiKey}`,
        },
        body: JSON.stringify({
          model: apiModel,
          messages: [{ role: "user", content: prompt }],
          stream: true,
        }),
      });
      if (!res.ok) throw new Error("OpenAI stream failed");
      responseStream = res.body!;
    } else if (provider === "ollama") {
      isOllama = true;
      const endpoint = process.env.NODE_ENV === "production"
        ? process.env.OLLAMA_PROD_URL || "http://localhost:11434/api/generate" // Fallback
        : "http://localhost:11434/api/generate";

      const res = await fetch(endpoint, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          model: apiModel,
          prompt,
          stream: true,
        }),
      });
      if (!res.ok) throw new Error("Ollama stream failed");
      responseStream = res.body!;
    } else {
      return NextResponse.json({ error: "Unknown AI provider" }, { status: 400 });
    }

    let fullResponseText = "";
    let buffer = "";

    // 4. Hardened Transform Stream with Chunk Buffering & Abort Safety
    const stream = new TransformStream({
      transform(chunk, controller) {
        const text = new TextDecoder().decode(chunk);
        buffer += text; // Append to buffer to prevent partial JSON truncation

        let lines: string[] = [];

        if (isOllama) {
          // Ollama: Raw JSON lines
          const splitChar = "\n";
          const parts = buffer.split(splitChar);
          buffer = parts.pop() || ""; // Keep the incomplete line in buffer
          lines = parts;
        } else {
          // SSE APIs: double newline splits blocks
          const splitChar = "\n\n";
          const parts = buffer.split(splitChar);
          buffer = parts.pop() || "";
          // Extract individual data segments
          lines = parts.flatMap(p => p.split("\n"));
        }

        for (const line of lines) {
          const trimmed = line.trim();
          if (!trimmed) continue;

          let jsonData = "";

          if (isOllama) {
            jsonData = trimmed;
          } else {
            if (!trimmed.startsWith("data:")) continue;
            jsonData = trimmed.replace(/^data:\s*/, "").trim();
            if (jsonData === "[DONE]") continue; // OpenAI stream complete
          }

          try {
            const data = JSON.parse(jsonData);
            let textChunk = "";

            if (isOllama) {
              textChunk = data.response || "";
            } else if (provider === "gemini") {
              textChunk = data.candidates?.[0]?.content?.parts?.[0]?.text || "";
            } else if (provider === "openai") {
              textChunk = data.choices?.[0]?.delta?.content || "";
            }

            if (textChunk) {
              fullResponseText += textChunk;
              controller.enqueue(new TextEncoder().encode(textChunk));
            }
          } catch (e) {
            // If parse fails mid-chunk, we ignore it, but because of buffering, this should happen very rarely.
            console.error("[STREAM_PARSE_ERROR] Failed parsing segment", e);
          }
        }
      },
      async flush(controller) {
        // Deterministically append Sources to the stream at the very end
        if (searchResults.length > 0) {
          let sourcesMarkdown = "\n\n---\n**🌐 Search Sources:**\n";
          searchResults.forEach((res, i) => {
            sourcesMarkdown += `${i + 1}. [${res.title}](${res.url})\n`;
          });
          controller.enqueue(new TextEncoder().encode(sourcesMarkdown));
          fullResponseText += sourcesMarkdown;
        }

        // Save the full assistant message response to DB AFTER streaming finishes perfectly
        if (!fullResponseText.trim()) {
          fullResponseText = "An error occurred or the response was empty.";
          controller.enqueue(new TextEncoder().encode(fullResponseText));
        }

        try {
          await dbConnect();
          await Message.create({
            threadId,
            userId,
            role: "assistant",
            content: fullResponseText,
            model: modelValue,
          });
        } catch (e) {
          console.error("[STREAM_SAVE_ERROR]", e);
        }
      }
    });

    // Handle Network Disconnects (Pre-mature Aborts)
    req.signal.addEventListener("abort", async () => {
      if (fullResponseText.length > 0) {
        try {
          await dbConnect();
          await Message.create({
            threadId,
            userId,
            role: "assistant",
            content: fullResponseText + " [Stream Interrupted]",
            model: modelValue,
          });
        } catch (e) { }
      }
    });

    return new Response(responseStream.pipeThrough(stream), {
      status: 200,
      headers: {
        "Content-Type": "text/plain; charset=utf-8",
        "Cache-Control": "no-cache, no-transform",
        "Connection": "keep-alive"
      }
    });

  } catch (err: any) {
    console.error("[CHAT_STREAM_ERROR]", err);
    return NextResponse.json({ error: "Internal Server Error", details: err.message }, { status: 500 });
  }
}