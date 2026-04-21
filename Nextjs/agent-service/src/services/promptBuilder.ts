/**
 * Agent Prompt Builder
 * Responsibility: Constructing the LLM message payload.
 */

export function constructPrompt(
  userMessage: string,
  history: any[],
  searchContext: string
) {
  const historyText = history
    .map((m: any) => `${m.role === "user" ? "User" : "Assistant"}: ${m.content}`)
    .join("\n");

  return `You are a helpful AI assistant.\n\n${searchContext}${historyText}\n\nUser: ${userMessage}\nAssistant:`;
}
