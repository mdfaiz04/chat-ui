/// <reference lib="dom" />
import { AI_CONFIG } from "../config";

import { GoogleGenerativeAI } from "@google/generative-ai";

/**
 * Internal Helper: Detect provider from model name
 */
function getProviderFromModel(model: string): string {
  if (!model) throw new Error("Model is required");

  const lower = model.toLowerCase();

  if (lower.includes("gpt")) return "openai";
  if (lower.includes("gemini")) return "google";

  // Everything else is handled by Ollama.
  return "ollama";
}

function normalizeGeminiModel(model: string): string {
  const lower = model.toLowerCase();

  if (lower.includes("pro")) {
    return AI_CONFIG.providers.gemini.proModel || "gemini-1.5-pro";
  }

  return AI_CONFIG.providers.gemini.flashModel || "gemini-1.5-flash";
}

function getGeminiModelCandidates(model: string): string[] {
  const primaryModel = normalizeGeminiModel(model);
  return [primaryModel, ...AI_CONFIG.providers.gemini.fallbackModels]
    .filter((candidate, index, all) => candidate && all.indexOf(candidate) === index);
}

function isTemporaryGeminiError(message: string): boolean {
  const lower = message.toLowerCase();
  return lower.includes("503")
    || lower.includes("service unavailable")
    || lower.includes("high demand")
    || lower.includes("429")
    || lower.includes("quota")
    || lower.includes("temporarily");
}

function toGeminiUserError(message: string, modelName: string, triedModels: string[]): Error {
  if (message.includes("403") || message.includes("forbidden") || message.includes("leaked")) {
    return new Error("Gemini API key is invalid or leaked. Please ensure you have replaced it in agent-service/.env and RESTARTED the service.");
  }

  if (message.includes("streamGenerateContent")) {
    return new Error("Gemini response failed because streaming is not supported for the selected model.");
  }

  if (message.includes("not found for API version") || message.includes("Model not found") || message.includes("404")) {
    return new Error(`Gemini model "${modelName}" is not available. Please check your model configuration.`);
  }

  if (isTemporaryGeminiError(message)) {
    return new Error(`Gemini is temporarily busy. Tried: ${triedModels.join(", ")}. Please send the message again in a moment.`);
  }

  return new Error(`Gemini API request failed: ${message}`);
}

async function wait(ms: number) {
  await new Promise((resolve) => setTimeout(resolve, ms));
}

async function generateGeminiText(apiKey: string, modelName: string, prompt: string) {
  const genAI = new GoogleGenerativeAI(apiKey);
  const geminiModel = genAI.getGenerativeModel({ model: modelName });

  const result = await geminiModel.generateContent({
    contents: [{ role: "user", parts: [{ text: prompt }] }],
    generationConfig: {
      temperature: 0.7,
      topK: 40,
      topP: 0.95,
      maxOutputTokens: 2048,
    }
  });

  return result.response.text();
}

async function handleOllamaFallback(prompt: string, error: any): Promise<ReadableStream<Uint8Array>> {
  console.warn(`[FALLBACK] Gemini failed. Switching to Ollama. Error: ${error.message}`);
  const baseUrl = AI_CONFIG.providers.ollama.baseUrl;
  const res = await fetch(`${baseUrl}/api/generate`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      model: "llama3", // Default fallback model for Ollama
      prompt,
      stream: true,
    }),
  });
  if (!res.ok) throw new Error(`Ollama Fallback Failed: ${res.statusText}`);
  return res.body as ReadableStream<Uint8Array>;
}

function createGeminiCompatibleStream(responseText: string): ReadableStream<Uint8Array> {
  const encoder = new TextEncoder();

  return new ReadableStream({
    start(controller) {
      try {
        const chunk = {
          candidates: [
            {
              content: {
                parts: [{ text: responseText }]
              }
            }
          ]
        };
        controller.enqueue(encoder.encode(`data: ${JSON.stringify(chunk)}\n\n`));
        controller.enqueue(encoder.encode("data: [DONE]\n\n"));
        controller.close();
      } catch (err: any) {
        console.error(`[PSEUDO_STREAM_ERROR] ${err.message}`);
        controller.error(err);
      }
    }
  });
}


export async function initiateAIStream(model: string, prompt: string): Promise<ReadableStream<Uint8Array>> {
  // Normalize model name
  const apiModel = model.includes(":") ? model.split(":")[1] : model;
  const provider = getProviderFromModel(apiModel);

  console.log(`[ROUTER] Routing model: ${model} -> provider: ${provider}`);

  if (provider === "google") {
    const apiKey = AI_CONFIG.providers.gemini.apiKey;
    console.log(`[DEBUG] Gemini key loaded: ${apiKey ? "YES" : "NO"}`);

    if (!apiKey) {
      console.error("[ERROR] Google API Key is missing. Falling back to Ollama.");
      return handleOllamaFallback(prompt, new Error("Missing Gemini API Key"));
    }

    const modelCandidates = getGeminiModelCandidates(apiModel);
    const triedModels: string[] = [];
    let lastError: any = null;

    for (const modelName of modelCandidates) {
      triedModels.push(modelName);
      console.log(`[DEBUG] Attempting Gemini model: ${modelName}`);

      for (let attempt = 1; attempt <= 2; attempt++) {
        try {
          const responseText = await generateGeminiText(apiKey, modelName, prompt);
          return createGeminiCompatibleStream(responseText);
        } catch (err: any) {
          lastError = err;
          const message = err?.message || String(err);
          console.error(`[GEMINI_ERROR] ${modelName} (attempt ${attempt}): ${message}`);

          // If it's a 403 (leaked key), don't bother retrying or trying other models
          if (message.includes("403") || message.includes("forbidden") || message.includes("leaked")) {
            console.warn("[CRITICAL] Gemini Key error detected. Triggering immediate fallback.");
            return handleOllamaFallback(prompt, toGeminiUserError(message, modelName, triedModels));
          }

          if (!isTemporaryGeminiError(message)) {
            // Try next model if this one isn't available
            break;
          }

          if (attempt < 2) await wait(1000);
        }
      }
    }

    // If all Gemini attempts failed, fallback to Ollama instead of throwing
    return handleOllamaFallback(prompt, lastError);
  }

  if (provider === "openai") {
    const apiKey = AI_CONFIG.providers.openai.apiKey;
    const res = await globalThis.fetch("https://api.openai.com/v1/chat/completions", {

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
    if (!res.ok) throw new Error(`OpenAI API error: ${res.statusText}`);
    return res.body as ReadableStream<Uint8Array>;
  }

  if (provider === "ollama") {
    const baseUrl = AI_CONFIG.providers.ollama.baseUrl;
    const res = await globalThis.fetch(`${baseUrl}/api/generate`, {

      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        model: apiModel,
        prompt,
        stream: true,
      }),
    });
    if (!res.ok) throw new Error(`Ollama API error: ${res.statusText}`);
    return res.body as ReadableStream<Uint8Array>;
  }

  throw new Error(`Unsupported AI engine: ${provider} for model ${model}`);
}
