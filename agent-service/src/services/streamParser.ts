/// <reference lib="dom" />
/**
 * Agent Stream Parser

 * Converts raw provider SSE into a unified text-only stream.
 */
export function createStandardStream(
  responseStream: ReadableStream<Uint8Array>,
  provider: string
): ReadableStream<Uint8Array> {
  let fullResponseText = "";
  let buffer = "";
  const isOllama = provider === "ollama";

  const transformStream = new TransformStream<Uint8Array, Uint8Array>({
    transform(chunk, controller) {
      const text = new TextDecoder().decode(chunk, { stream: true });
      buffer += text;

      const lines = buffer.split(/\r?\n/);
      buffer = lines.pop() || "";

      for (const line of lines) {
        const trimmed = line.trim();
        if (!trimmed) continue;

        let jsonData = "";
        if (isOllama) {
          jsonData = trimmed;
        } else {
          if (!trimmed.startsWith("data:")) continue;
          jsonData = trimmed.substring(5).trim();
          if (jsonData === "[DONE]") continue;
        }

        try {
          const data = JSON.parse(jsonData);
          let textChunk = "";

          if (isOllama) {
            textChunk = data.response || "";
          } else if (provider === "gemini") {
            textChunk = data.candidates?.[0]?.content?.parts?.[0]?.text || "";
          } else if (provider === "openai") {
            textChunk = data.choices?.[0]?.delta?.content || "";
          }

          if (textChunk) {
            fullResponseText += textChunk;
            controller.enqueue(new TextEncoder().encode(textChunk));
          }
        } catch (e) { }
      }
    }
  });

  return responseStream.pipeThrough(transformStream);
}

