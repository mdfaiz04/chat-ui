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

    // Support an optional `stream` flag, default to true
    const body = await req.json();
    const { message, threadId, model, stream: shouldStream = true } = body;

    if (!threadId || !message) {
      return NextResponse.json({ error: "Missing parameters" }, { status: 400 });
    }

    console.log(`[API_CHAT] Request from ${userId} - Model: ${model || DEFAULT_MODEL} - Stream: ${shouldStream}`);

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

    // 3. Initiate API Request based on Provider
    // We request streaming format from the providers natively so our parsing logic remains uniform
    if (provider === "gemini") {
      const apiKey = process.env.GOOGLE_API_KEY || process.env.GEMINI_API_KEY;
      if (!apiKey) throw new Error("Gemini API Key missing in environment variables.");
      
      const res = await fetch(
        `https://generativelanguage.googleapis.com/v1beta/models/${apiModel}:streamGenerateContent?alt=sse&key=${apiKey}`,
        {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ contents: [{ parts: [{ text: prompt }] }] }),
        }
      );
      if (!res.ok) throw new Error(`Gemini API failed with status: ${res.status}`);
      responseStream = res.body!;
    } else if (provider === "openai") {
      const apiKey = process.env.OPENAI_API_KEY;
      if (!apiKey) throw new Error("OpenAI API Key missing in environment variables.");

      const res = await fetch("https://api.openai.com/v1/chat/completions", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${apiKey}`,
        },
        body: JSON.stringify({
          model: apiModel,
          messages: [{ role: "user", content: prompt }],
          stream: true, // We always request stream from remote to unify downstream
        }),
      });
      if (!res.ok) throw new Error(`OpenAI API failed with status: ${res.status}`);
      responseStream = res.body!;
    } else if (provider === "ollama") {
      isOllama = true;
      const endpoint = process.env.NODE_ENV === "production"
        ? process.env.OLLAMA_PROD_URL || "http://localhost:11434/api/generate"
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
      if (!res.ok) throw new Error(`Ollama API failed with status: ${res.status}`);
      responseStream = res.body!;
    } else {
      return NextResponse.json({ error: "Unknown AI provider configured." }, { status: 400 });
    }

    let fullResponseText = "";
    let buffer = "";

    // 4. Hardened Transform Stream with robust line-by-line parsing
    const stream = new TransformStream({
      transform(chunk, controller) {
        const text = new TextDecoder().decode(chunk, { stream: true });
        buffer += text; 

        // Split STRICTLY by newline to handle \r\n and \n safely without missing chunks
        const lines = buffer.split(/\r?\n/);
        
        // Retain the last potentially incomplete chunk in the buffer
        buffer = lines.pop() || "";

        for (const line of lines) {
          const trimmed = line.trim();
          if (!trimmed) continue;

          let jsonData = "";

          if (isOllama) {
            jsonData = trimmed; // Ollama sends direct JSON lines
          } else {
            // Standard SSE matching for OpenAI and Gemini
            if (!trimmed.startsWith("data:")) continue;
            // Extract the JSON portion
            jsonData = trimmed.substring(5).trim();
            if (jsonData === "[DONE]") continue; 
          }

          try {
            const data = JSON.parse(jsonData);
            let textChunk = "";

            if (isOllama) {
              textChunk = data.response || "";
            } else if (provider === "gemini") {
              // Safely extract Gemini SSE text blocks
              textChunk = data.candidates?.[0]?.content?.parts?.[0]?.text || "";
            } else if (provider === "openai") {
              // Safely extract OpenAI SSE text chunks
              textChunk = data.choices?.[0]?.delta?.content || "";
            }

            if (textChunk) {
              fullResponseText += textChunk;
              // If streaming is requested, pipe chunks immediately
              if (shouldStream) controller.enqueue(new TextEncoder().encode(textChunk));
            }
          } catch (e) {
            console.error("[STREAM_PARSE_ERROR] Failed parsing line:", jsonData, e);
          }
        }
      },
      async flush(controller) {
        // flush any remaining buffered text
        if (buffer.trim()) {
           try {
              let jsonData = isOllama ? buffer.trim() : buffer.replace(/^data:\s*/, "").trim();
              if (jsonData && jsonData !== "[DONE]") {
                 const data = JSON.parse(jsonData);
                 let textChunk = "";
                 if (isOllama) textChunk = data.response || "";
                 else if (provider === "gemini") textChunk = data.candidates?.[0]?.content?.parts?.[0]?.text || "";
                 else if (provider === "openai") textChunk = data.choices?.[0]?.delta?.content || "";
                 
                 if (textChunk) {
                    fullResponseText += textChunk;
                    if (shouldStream) controller.enqueue(new TextEncoder().encode(textChunk));
                 }
              }
           } catch(e) {}
        }

        // Attach Web Search Citations
        if (searchResults.length > 0) {
          let sourcesMarkdown = "\n\n---\n**🌐 Search Sources:**\n";
          searchResults.forEach((res, i) => {
            sourcesMarkdown += `${i + 1}. [${res.title}](${res.url})\n`;
          });
          fullResponseText += sourcesMarkdown;
          if (shouldStream) controller.enqueue(new TextEncoder().encode(sourcesMarkdown));
        }

        if (!fullResponseText.trim()) {
          console.warn("[WARN] Completed parse but response text was entirely empty.");
          fullResponseText = "Sorry, something went wrong. Please try again.";
          if (shouldStream) controller.enqueue(new TextEncoder().encode(fullResponseText));
        }

        // Save History
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

    // 5. Respond based on requested mode (JSON vs Stream)
    
    if (shouldStream) {
      // Return Native Readable Stream
      return new Response(responseStream.pipeThrough(stream), {
        status: 200,
        headers: {
          "Content-Type": "text/plain; charset=utf-8",
          "Cache-Control": "no-cache, no-transform",
          "Connection": "keep-alive"
        }
      });
    } else {
      // Manually consume the stream on the server for a JSON response
      const readable = responseStream.pipeThrough(stream);
      const reader = readable.getReader();
      // Drain execution
      while (true) {
        const { done } = await reader.read();
        if (done) break;
      }
      
      console.log("[API_CHAT] Returning block JSON response.");
      // Return expected format
      return NextResponse.json({ content: fullResponseText });
    }

  } catch (err: any) {
    console.error("[CHAT_ERROR]", err);
    
    // Safely fallback on catastrophic failure (matching frontend expectations)
    return NextResponse.json(
      { content: "Sorry, something went wrong. Please try again.", error: err.message }, 
      { status: 500 }
    );
  }
}