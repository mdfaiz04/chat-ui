/// <reference lib="dom" />
import { AI_CONFIG } from "../config";


export interface WebSearchResult {
  title: string;
  content: string;
  url: string;
}

interface TavilyResponse {
  results: Array<{
    title?: string;
    content?: string;
    url?: string;
  }>;
}

export function needsWebSearch(message: string): boolean {
  const searchKeywords = /\b(latest|news|current|today|recent|update|updates|now|live|search|who is|what is the price of)\b/i;
  return searchKeywords.test(message);
}

export async function fetchWebContext(query: string): Promise<WebSearchResult[]> {
  const apiKey = AI_CONFIG.rag.tavilyKey;
  if (!apiKey) {
    console.warn("[RAG_WARN] TAVILY_API_KEY is not set. Web search disabled.");
    return [];
  }

  try {
    const response = await globalThis.fetch("https://api.tavily.com/search", {

      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        api_key: apiKey,
        query: query,
        max_results: 3,
      }),
    });

    if (!response.ok) {
      console.error(`[TAVILY_ERROR] Status: ${response.status}`);
      return [];
    }

    const data = (await response.json()) as TavilyResponse;

    if (!data.results || !Array.isArray(data.results)) {
      return [];
    }

    return data.results.map((r) => ({
      title: r.title || "Unknown",
      content: r.content || "",
      url: r.url || "",
    }));
  } catch (error: any) {
    console.error(`[RAG_ERROR] ${error.message}`);
    return [];
  }
}

export function formatSearchContext(results: WebSearchResult[]): string {
  if (!results.length) return "";
  let context = "\n=== WEB SEARCH CONTEXT ===\n";
  results.forEach((res, i) => {
    context += `[Source ${i + 1}]: ${res.title}\n${res.content.substring(0, 400)}\nLink: ${res.url}\n\n`;
  });
  return context + "=== END OF CONTEXT ===\n";
}

