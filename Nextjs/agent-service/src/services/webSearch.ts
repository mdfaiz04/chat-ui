import { AI_CONFIG } from "../config";

export interface WebSearchResult {
  title: string;
  content: string;
  url: string;
}

export function needsWebSearch(message: string): boolean {
  const searchKeywords = /\b(latest|news|current|today|recent|update|updates|now|live|search|who is|what is the price of)\b/i;
  return searchKeywords.test(message);
}

export async function fetchWebContext(query: string): Promise<WebSearchResult[]> {
  const apiKey = AI_CONFIG.rag.tavilyKey;
  if (!apiKey) return [];

  try {
    const response = await fetch("https://api.tavily.com/search", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        api_key: apiKey,
        query: query,
        max_results: 3,
      }),
    });

    if (!response.ok) return [];
    const data = await response.json();
    return data.results.map((r: any) => ({
      title: r.title || "Unknown",
      content: r.content || "",
      url: r.url || "",
    }));
  } catch (error) {
    return [];
  }
}

export function formatSearchContext(results: WebSearchResult[]): string {
  if (!results.length) return "";
  let context = "=== SEARCH RESULTS ===\n";
  results.forEach((res, i) => {
    context += `[${i + 1}] ${res.title}\n${res.content.substring(0, 300)}\nURL: ${res.url}\n\n`;
  });
  return context + "=== END ===\n";
}
