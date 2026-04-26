interface Message {
  role: "user" | "assistant";
  content: string;
}

export function constructPrompt(
  userMessage: string,
  history: Message[],
  searchContext: string
) {
  const historyText = history
    .map((m) => `${m.role === "user" ? "User" : "Assistant"}: ${m.content}`)
    .join("\n");

  return `You are a helpful AI assistant.\n\n${searchContext}\n\n${historyText}\n\nUser: ${userMessage}\nAssistant:`;
}

