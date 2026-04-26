import dotenv from 'dotenv';
// IMPORTANT: Initialize dotenv at the absolute top before any other imports
dotenv.config();

const gKey = process.env.GOOGLE_API_KEY;
const geminiKey = process.env.GEMINI_API_KEY;

console.log(`\n--- [ENV VERIFICATION] ---`);
console.log(`GEMINI_API_KEY present: ${geminiKey ? 'YES' : 'NO'}`);
if (gKey) {
  console.warn(`WARNING: GOOGLE_API_KEY is also present and will take priority over GEMINI_API_KEY.`);
}
console.log(`Effective Gemini Key (Safe Peek): ${(gKey || geminiKey || 'N/A').substring(0, 6)}...`);
console.log(`---------------------------\n`);

import express from 'express';
import cors from 'cors';
import { initiateAIStream } from './services/modelRouter';


import { createStandardStream } from './services/streamParser';
import { constructPrompt } from './services/promptBuilder';
import { getEnhancedContext } from './services/ragService';

const app = express();
const PORT = Number(process.env.PORT) || 6001;

app.use(cors());
app.use(express.json());

/**
 * PRODUCTION-READY AGENT GENERATE ENDPOINT
 */
app.post('/generate', async (req: any, res: any) => {
  const requestId = req.headers['x-request-id'] || Math.random().toString(36).substring(7);

  try {
    const { messages, model, useWebSearch = true, stream = true } = req.body;

    // 1. MODEL-DRIVEN VALIDATION
    if (!messages || !Array.isArray(messages) || messages.length === 0 || !model) {
      return res.status(400).json({ error: "Missing required fields: messages (array) or model (string)." });
    }

    const latestMessage = messages[messages.length - 1]?.content;

    // Determine provider for stream normalization logic (derived from model only)
    const normalizedModel = typeof model === "string" && model.includes(":") ? model.split(":")[1] : model;
    const modelLower = String(normalizedModel).toLowerCase();
    const provider =
      modelLower.includes("gemini") ? "gemini" :
        modelLower.includes("gpt") ? "openai" :
          (modelLower.includes("llama") || modelLower.includes("mistral") || modelLower.includes("phi")) ? "ollama" :
            "ollama";

    console.log(`[AGENT_REQ] RequestID: ${requestId} | Model: ${model} | Provider: ${provider} | Stream: ${Boolean(stream)}`);

    // 2. CONTEXT RETRIEVAL (Stateless RAG)
    let contextText: string = "";
    let searchResults: any[] = [];

    if (useWebSearch && latestMessage) {
      const ragResults = await getEnhancedContext(latestMessage);
      contextText = ragResults.contextText;
      searchResults = ragResults.results;
    }

    // 3. PROMPT CONSTRUCTION
    const prompt = constructPrompt(latestMessage, messages.slice(0, -1), contextText);

    // 4. MODEL-DRIVEN EXECUTION
    const rawStream = await initiateAIStream(normalizedModel, prompt);
    console.log(`[AGENT_STREAM] RequestID: ${requestId} - Origin: ${provider}`);

    // 5. TRANSFORM & PIPE
    const unifiedStream = createStandardStream(rawStream, provider as any);

    res.setHeader('Content-Type', 'text/plain; charset=utf-8');
    res.setHeader('Transfer-Encoding', 'chunked');
    res.setHeader('x-request-id', requestId);

    const reader = (unifiedStream as any).getReader();

    while (true) {
      const { done, value } = await reader.read();
      if (done) break;
      res.write(value);
    }

    // 6. CITATIONS
    if (searchResults && searchResults.length > 0) {
      let sourcesMarkdown = "\n\n---\n**🌐 Search Sources:**\n";
      searchResults.forEach((resItem: any, i: number) => {
        sourcesMarkdown += `${i + 1}. [${resItem.title}](${resItem.url})\n`;
      });
      res.write(sourcesMarkdown);
    }

    res.end();
  } catch (error: any) {
    console.error(`[AGENT_ERROR] RequestID: ${requestId} - ${error.message}`);
    res.status(500).json({ error: "AI execution failed", detail: error.message });
  }
});

/**
 * HEALTH CHECK ENDPOINT
 */
app.get('/health', (req, res) => {
  res.status(200).json({ status: 'healthy', service: 'agent-service', timestamp: new Date().toISOString() });
});

app.listen(PORT, '0.0.0.0', () => {
  console.log(`\n================================================`);
  console.log(`🚀 AGENT BRAIN RUNNING ON: http://127.0.0.1:${PORT}`);
  console.log(`🏥 Health Check: http://127.0.0.1:${PORT}/health`);
  console.log(`================================================\n`);
}).on('error', (err: any) => {
  if (err.code === 'EADDRINUSE') {
    console.log(`\n✅ NOTICE: The Agent Service is ALREADY RUNNING on Port ${PORT}.`);
    console.log(`You already have a terminal where this is active. You are good to go!\n`);
    process.exit(0);
  }
});
