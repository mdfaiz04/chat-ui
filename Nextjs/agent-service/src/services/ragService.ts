import { needsWebSearch, fetchWebContext, formatSearchContext } from "./webSearch";

/**
 * Agent RAG Service
 */
export async function getEnhancedContext(message: string) {
  const shouldSearch = needsWebSearch(message);

  if (!shouldSearch) {
    return { contextText: "", results: [] };
  }

  const results = await fetchWebContext(message);
  const contextText = formatSearchContext(results);

  return { contextText, results };
}
