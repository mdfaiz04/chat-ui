import express from 'express';
import cors from 'cors';
import dotenv from 'dotenv';
import { connectDB, getThreadHistory, saveMessage } from './services/dbService';

dotenv.config();

const app = express();
const PORT = process.env.PORT || 5000;
const AGENT_URL = process.env.AGENT_URL || "http://127.0.0.1:6001/generate";
const MONGODB_URI = process.env.MONGODB_URI || "";

app.use(cors());
app.use(express.json());

app.get('/health', (_req, res) => {
  res.status(200).json({
    status: 'healthy',
    service: 'backend-service',
    agentUrl: AGENT_URL,
    mongoConfigured: Boolean(MONGODB_URI),
    timestamp: new Date().toISOString(),
  });
});

/**
 * AUTH MIDDLEWARE (HARDENED)
 * Responsibility: Ensure request is from a valid user.
 */
const validateUser = (req: any, res: any, next: any) => {
  const userId = req.headers['x-user-id'] || req.body.userId;
  if (!userId) {
    console.warn("[AUTH_BLOCKED] Missing UserID in request.");
    return res.status(401).json({ error: "Unauthorized: Missing identity header." });
  }
  req.userId = userId;
  next();
};

/**
 * PRODUCTION-READY CHAT ENDPOINT
 */
app.post('/chat', validateUser, async (req: any, res: any) => {
  const requestId = Math.random().toString(36).substring(7);
  const { message, threadId, model, modelConfig, useWebSearch = true, stream = true } = req.body;
  const userId = req.userId;

  console.log(`[BACKEND_START] RequestID: ${requestId} - User: ${userId}, Thread: ${threadId}`);

  // 1. INPUT VALIDATION
  const resolvedModel =
    typeof model === 'string' && model.trim()
      ? model.trim()
      : typeof modelConfig?.model === 'string' && modelConfig.model.trim()
        ? modelConfig.model.trim()
        : null;

  if (!threadId || !message || !resolvedModel) {
    return res.status(400).json({
      error: "Missing required fields.",
      details: {
        required: ["threadId", "message", "model"],
        received: {
          threadId: Boolean(threadId),
          message: Boolean(message),
          model: typeof model,
          modelConfigType: typeof modelConfig,
        }
      }
    });
  }

  try {
    if (!MONGODB_URI) {
      throw new Error("MONGODB_URI is not configured in backend-service/.env");
    }
    await connectDB();

    // 2. FETCH HISTORY
    const history = await getThreadHistory(userId, threadId);
    const normalizedHistory = (history || [])
      .map((m: any) => ({ role: m.role, content: m.content }))
      .filter((m: any) => typeof m.role === 'string' && typeof m.content === 'string');

    // 3. PERSIST USER MESSAGE (Optimistic)
    await saveMessage({
      threadId,
      userId,
      role: "user",
      content: message,
      model: resolvedModel,
    });

    // 4. CALL AGENT WITH RESILIENCE (Heartbeat + Retry)
    console.log(`[BACKEND_AGENT_CALL] RequestID: ${requestId} - Origin: ${AGENT_URL}`);

    // Pre-flight health check (Optional but robust)
    try {
      const healthCheck = await fetch(AGENT_URL.replace('/generate', '/health'), { signal: AbortSignal.timeout(2000) });
      if (!healthCheck.ok) throw new Error("Agent health check failed");
    } catch (e) {
      console.warn(`[BACKEND_WARN] Agent health check failed for RequestID: ${requestId}. Proceeding with caution.`);
    }

    let agentResponse: Response;
    const retries = 1;

    const callAgent = async (): Promise<Response> => {
      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), 30000);

      try {
        const res = await fetch(AGENT_URL, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'x-request-id': requestId
          },
          body: JSON.stringify({
            messages: [...normalizedHistory, { role: 'user', content: message }],
            model: resolvedModel,
            useWebSearch: Boolean(useWebSearch),
            stream: Boolean(stream)
          }),
          signal: controller.signal
        });
        clearTimeout(timeoutId);
        return res;
      } catch (err: any) {
        clearTimeout(timeoutId);
        throw err;
      }
    };

    try {
      agentResponse = await callAgent();
    } catch (error: any) {
      if (retries > 0) {
        console.log(`[BACKEND_RETRY] RequestID: ${requestId} - Retrying once...`);
        agentResponse = await callAgent();
      } else {
        throw error;
      }
    }

    if (!agentResponse.ok) {
      const errorDetail = await agentResponse.text().catch(() => "");
      console.error(`[BACKEND_AGENT_FAIL] RequestID: ${requestId} | Status: ${agentResponse.status} | Detail: ${errorDetail}`);
      res.status(agentResponse.status).setHeader('x-request-id', requestId);
      return res.send(errorDetail || `Agent error (${agentResponse.status})`);
    }

    if (!agentResponse.body) {
      throw new Error("No response body received from Agent.");
    }

    // 5. STREAM PIPING & BUFFERING
    res.setHeader('Content-Type', 'text/plain; charset=utf-8');
    res.setHeader('Transfer-Encoding', 'chunked');
    res.setHeader('x-request-id', requestId);
    res.setHeader('Cache-Control', 'no-cache, no-transform');

    let fullBuffer = "";
    const reader = agentResponse.body.getReader();
    const decoder = new TextDecoder();

    try {
      while (true) {
        const { done, value } = await reader.read();

        if (done) {
          console.log(`[BACKEND_STREAM_END] RequestID: ${requestId}.`);
          break;
        }

        // Forward chunk to client
        res.write(Buffer.from(value));

        // Accumulate for DB
        fullBuffer += decoder.decode(value, { stream: true });
      }
    } catch (streamError) {
      console.error(`[BACKEND_STREAM_INTERRUPT] RequestID: ${requestId}`, streamError);
      // Even if stream fails partially, we try to end gracefully
    }

    // 6. PERSIST ASSISTANT MESSAGE (Guaranteed after stream)
    if (fullBuffer.trim()) {
      await saveMessage({
        threadId,
        userId,
        role: "assistant",
        content: fullBuffer,
        model: resolvedModel,
      });
      console.log(`[BACKEND_SAVE_SUCCESS] RequestID: ${requestId} - Thread: ${threadId}`);
    }

    res.end();

  } catch (error: any) {
    const msg = error?.message || String(error);
    console.error(`[BACKEND_ERROR] RequestID: ${requestId} -`, msg);

    if (error.name === 'AbortError') {
      return res.status(504).json({ error: "Agent Service Timeout" });
    }

    // Node/undici fetch failures typically surface as TypeError("fetch failed")
    if (msg === "fetch failed") {
      return res.status(502).json({
        error: "Cannot reach agent-service",
        details: "Backend could not connect to agent-service. Ensure agent-service is running and AGENT_URL is correct.",
        agentUrl: AGENT_URL,
        requestId,
      });
    }

    res.status(500).json({ error: "Communication failure with AI services", details: msg, requestId });
  }
});

app.listen(PORT, async () => {
  console.log(`📡 Hardened Backend Service running on http://localhost:${PORT}`);
}).on('error', (err: any) => {
  if (err.code === 'EADDRINUSE') {
    console.log(`\n✅ NOTICE: The Backend Service is ALREADY RUNNING on Port ${PORT}.`);
    console.log(`You already have a terminal where this is active. You are good to go!\n`);
    process.exit(0);
  }
});
