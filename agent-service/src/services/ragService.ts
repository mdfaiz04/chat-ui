/// <reference lib="dom" />
import { needsWebSearch, fetchWebContext, formatSearchContext, WebSearchResult } from "./webSearch";


export interface EnhancedContext {
  contextText: string;
  results: WebSearchResult[];
}

/**
 * Agent RAG Service
 */
export async function getEnhancedContext(message: string): Promise<EnhancedContext> {
  const shouldSearch = needsWebSearch(message);

  if (!shouldSearch) {
    return { contextText: "", results: [] };
  }

  const results = await fetchWebContext(message);
  const contextText = formatSearchContext(results);

  return { contextText, results };
}

