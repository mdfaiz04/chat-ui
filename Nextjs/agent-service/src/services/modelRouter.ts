import { AI_CONFIG } from "../config";

/**
 * Internal Helper: Detect provider from model name
 */
function getProviderFromModel(model: string): string {
  if (!model) throw new Error("Model is required");

  const lower = model.toLowerCase();

  if (lower.includes("gpt")) return "openai";
  if (lower.includes("gemini")) return "google";

  // EVERYTHING ELSE → ollama
  return "ollama";
}

async function fetchWithRetry(url: string, options: RequestInit, retries = 1, delay = 1500): Promise<Response> {
  try {
    const res = await fetch(url, options);
    if (res.status === 503 && retries > 0) {
      console.warn(`[RETRY] Gemini 503 Service Unavailable. Retrying in ${delay}ms...`);
      await new Promise(resolve => setTimeout(resolve, delay));
      return fetchWithRetry(url, options, retries - 1, delay);
    }
    return res;
  } catch (err) {
    if (retries > 0) {
      console.warn(`[RETRY] Network issue. Retrying in ${delay}ms...`);
      await new Promise(resolve => setTimeout(resolve, delay));
      return fetchWithRetry(url, options, retries - 1, delay);
    }
    throw err;
  }
}

export async function initiateAIStream(model: string, prompt: string) {
  // Normalize model name - remove provider prefix if present (e.g., "google:gemini-1.5-flash" -> "gemini-1.5-flash")
  const apiModel = model.includes(":") ? model.split(":")[1] : model;
  const provider = getProviderFromModel(apiModel);

  console.log("Routing model:", model, "→ provider:", provider);

  if (provider === "google") {
    console.log("Gemini Request:", {
      model: apiModel,
      apiKeyPresent: !!AI_CONFIG.providers.gemini.apiKey
    });

    const apiKey = AI_CONFIG.providers.gemini.apiKey;
    if (!apiKey) throw new Error("Invalid API key: Google API Key is missing.");

    try {
      // Use v1 endpoint for stable models
      const url = `https://generativelanguage.googleapis.com/v1/models/${apiModel}:streamGenerateContent?key=${apiKey}`;
      
      const res = await fetchWithRetry(
        url,
        {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ 
            contents: [{ parts: [{ text: prompt }] }],
            generationConfig: {
              temperature: 0.7,
              topK: 40,
              topP: 0.95,
              maxOutputTokens: 2048,
            }
          }),
        }
      );

      if (res.status === 404) {
        throw new Error(`Model not found: ${apiModel}. Check if the model ID is correct and available in your region.`);
      }
      if (res.status === 401 || res.status === 403) {
        throw new Error("Invalid API key");
      }
      if (res.status === 503) {
        throw new Error("Gemini API unavailable");
      }
      if (!res.ok) {
        const errorText = await res.text().catch(() => "Unknown error");
        throw new Error(`Google API error: ${res.status} ${res.statusText} - ${errorText}`);
      }

      return res.body!;
    } catch (err: any) {
      console.error(`[GEMINI_ERROR] ${err.message}`);
      if (err.message.includes("fetch failed") || err.name === "TypeError") {
        throw new Error("Network issue");
      }
      throw err;
    }
  }


  if (provider === "openai") {
    const apiKey = AI_CONFIG.providers.openai.apiKey;
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
    if (!res.ok) throw new Error(`OpenAI API error: ${res.statusText}`);
    return res.body!;
  }

  if (provider === "ollama") {
    const baseUrl = AI_CONFIG.providers.ollama.baseUrl;
    const res = await fetch(`${baseUrl}/api/generate`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        model: apiModel,
        prompt,
        stream: true,
      }),
    });
    if (!res.ok) throw new Error(`Ollama API error: ${res.statusText}`);
    return res.body!;
  }

  throw new Error(`Unsupported AI engine: ${provider} for model ${model}`);
}


