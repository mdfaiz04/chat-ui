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
