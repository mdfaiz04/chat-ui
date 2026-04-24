/**
 * Agent Service Configuration
 * Isolated from the Backend. Contains ONLY AI Provider keys and RAG settings.
 */
import dotenv from 'dotenv';
dotenv.config();

export const AI_CONFIG = {
  providers: {
    gemini: {
      apiKey: process.env.GOOGLE_API_KEY || process.env.GEMINI_API_KEY,
      flashModel: process.env.GEMINI_FLASH_MODEL,
      proModel: process.env.GEMINI_PRO_MODEL,
      fallbackModels: (process.env.GEMINI_FALLBACK_MODELS || "gemini-2.5-flash-lite,gemini-2.0-flash,gemini-2.0-flash-lite")
        .split(",")
        .map((model) => model.trim())
        .filter(Boolean),
    },
    openai: {
      apiKey: process.env.OPENAI_API_KEY,
    },
    ollama: {
      baseUrl: process.env.OLLAMA_PROD_URL || "http://localhost:11434",
    }
  },
  rag: {
    tavilyKey: process.env.TAVILY_API_KEY,
    searchTimeout: 4000,
  }
};
