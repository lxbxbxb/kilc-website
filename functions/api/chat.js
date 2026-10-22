// Cloudflare Pages Function: POST /api/chat
// Replaces the Node chat-api server that ran on the VPS behind nginx.
// Same request/response contract as chat-api/server.js, so ChatWidget.astro
// needs no change. Environment variables (set in the Pages project):
//   OPENAI_API_KEY  (required, encrypted)
//   OPENAI_BASE_URL (optional, OpenAI-compatible endpoint; default OpenAI)
//   OPENAI_MODEL    (optional, default "qwen-turbo")
import { getSystemPrompt } from "../../chat-api/prompt.js";

// Best-effort rate limit: 20 requests per IP per minute, per isolate.
const RATE_LIMIT = 20;
const RATE_WINDOW_MS = 60_000;
const rateLimitMap = new Map();

function isRateLimited(ip) {
  const now = Date.now();
  const entry = rateLimitMap.get(ip);
  if (!entry || now > entry.resetAt) {
    rateLimitMap.set(ip, { count: 1, resetAt: now + RATE_WINDOW_MS });
    return false;
  }
  if (entry.count >= RATE_LIMIT) return true;
  entry.count++;
  return false;
}

function json(status, data) {
  return new Response(JSON.stringify(data), {
    status,
    headers: { "Content-Type": "application/json" },
  });
}

function validate(body) {
  const { message, messages } = body || {};
  if (Array.isArray(messages) && messages.length > 0) {
    if (messages.length > 10) return { error: "Maximum 10 messages allowed" };
    for (const msg of messages) {
      if (!msg || !msg.role || !msg.content || typeof msg.content !== "string") {
        return { error: "Each message must have role and content" };
      }
      if (msg.role !== "user" && msg.role !== "assistant") {
        return { error: 'Message role must be "user" or "assistant"' };
      }
      if (msg.content.length > 500) {
        return { error: "Each message must be 500 characters or fewer" };
      }
    }
    return { messages: messages.map((m) => ({ role: m.role, content: m.content.trim() })) };
  }
  if (typeof message === "string" && message.trim().length > 0) {
    if (message.length > 500) return { error: "message must be 500 characters or fewer" };
    return { messages: [{ role: "user", content: message.trim() }] };
  }
  return { error: "message or messages is required" };
}

export async function onRequestPost({ request, env }) {
  const ip = request.headers.get("CF-Connecting-IP") || "unknown";
  if (isRateLimited(ip)) {
    return json(429, { error: "Too many requests. Please wait a moment." });
  }
  if (!env.OPENAI_API_KEY) {
    return json(503, { error: "Assistant is not configured" });
  }

  let body;
  try {
    body = await request.json();
  } catch {
    return json(400, { error: "Invalid JSON body" });
  }
  const checked = validate(body);
  if (checked.error) return json(400, { error: checked.error });

  const locale = body.locale === "zh" ? "zh" : "en";
  const baseUrl = (env.OPENAI_BASE_URL || "https://api.openai.com/v1").replace(/\/+$/, "");

  try {
    const res = await fetch(`${baseUrl}/chat/completions`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${env.OPENAI_API_KEY}`,
      },
      body: JSON.stringify({
        model: env.OPENAI_MODEL || "qwen-turbo",
        messages: [{ role: "system", content: getSystemPrompt(locale) }, ...checked.messages],
        max_tokens: 300,
        temperature: 0.7,
      }),
    });
    if (!res.ok) {
      console.error("LLM error:", res.status, await res.text());
      return json(500, { error: "Failed to get a response from the assistant" });
    }
    const data = await res.json();
    const answer = data?.choices?.[0]?.message?.content;
    if (!answer) return json(500, { error: "Failed to get a response from the assistant" });
    return json(200, { answer });
  } catch (err) {
    console.error("LLM error:", err?.message || err);
    return json(500, { error: "Failed to get a response from the assistant" });
  }
}
