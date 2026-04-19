/**
 * Web Search API Module using Tavily (or any other search provider)
 * Designed for RAG integration into the AI Chat Pipeline.
 */

export interface WebSearchResult {
  title: string;
  content: string;
  url: string;
}

/**
 * Fast, regex-based heuristic to determine if a web search is needed.
 * Prevents expensive API calls for casual conversation.
 */
export function needsWebSearch(message: string): boolean {
  const searchKeywords = /\b(latest|news|current|today|recent|update|updates|now|live|search|who is|what is the price of)\b/i;
  return searchKeywords.test(message);
}

/**
 * Executes a search query using Tavily API limit 3 results.
 * Gracefully falls back to empty array if the API errors or timeout occurs.
 */
export async function fetchWebContext(query: string): Promise<WebSearchResult[]> {
  const apiKey = process.env.TAVILY_API_KEY;
  if (!apiKey) {
    console.warn("[WEB_SEARCH] TAVILY_API_KEY is missing. Skipping search.");
    return [];
  }

  try {
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), 3000); // 3-second hard timeout for RAG speed

    const response = await fetch("https://api.tavily.com/search", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        api_key: apiKey,
        query: query,
        search_depth: "basic",
        max_results: 3,
        include_images: false,
      }),
      signal: controller.signal,
    });

    clearTimeout(timeoutId);

    if (!response.ok) {
      console.error("[WEB_SEARCH] API Error:", response.status);
      return [];
    }

    const data = await response.json();

    if (!data.results || !Array.isArray(data.results)) {
      return [];
    }

    // Map safely to our standardized interface
    return data.results.map((r: any) => ({
      title: r.title || "Unknown Title",
      content: r.content || "",
      url: r.url || "",
    }));

  } catch (error) {
    console.error("[WEB_SEARCH] Timeout or Failure:", error);
    return []; // Fail gracefully, don't break the chat
  }
}

/**
 * Formats structured search results into a clean text prompt injection.
 */
export function formatSearchContext(results: WebSearchResult[]): string {
  if (!results.length) return "";

  let context = "=== REAL-TIME WEB SEARCH RESULTS ===\n";
  context += "Use the following context to answer the user's question accurately. Prioritize this information if relevant.\n\n";

  results.forEach((res, index) => {
    context += `[Source ${index + 1}]\n`;
    context += `Title: ${res.title}\n`;
    context += `Summary: ${res.content.substring(0, 400)}...\n`; // Cap length to save token bounds
    context += `URL: ${res.url}\n\n`;
  });

  context += "=== END SEARCH RESULTS ===\n";
  return context;
}
