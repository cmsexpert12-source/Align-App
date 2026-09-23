/* ALIGN AI — Vercel serverless. Keys stay in Vercel env, never the phone.
   GEMINI_API_KEY and/or GROQ_API_KEY in Project → Settings → Environment Variables. */

const GEMINI_MODELS = [
  "gemini-3.5-flash-lite",
  "gemini-3.6-flash"
];
const GROQ_MODELS = [
  "llama-3.1-8b-instant",
  "openai/gpt-oss-20b"
];

const MAX_TOK = 320;
const CALL_MS = 7000;

const cors = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "content-type",
  "Access-Control-Allow-Methods": "GET, POST, OPTIONS"
};

let lastGood = null;

function send(res, status, body) {
  Object.entries(cors).forEach(([k, v]) => res.setHeader(k, v));
  res.setHeader("Cache-Control", "no-store");
  res.status(status).json(body);
}

async function timedFetch(url, opts, ms = CALL_MS) {
  const ctrl = new AbortController();
  const t = setTimeout(() => ctrl.abort(), ms);
  try {
    return await fetch(url, { ...opts, signal: ctrl.signal });
  } finally {
    clearTimeout(t);
  }
}

async function callGemini(key, model, system, prompt) {
  const url = "https://generativelanguage.googleapis.com/v1beta/models/" +
    encodeURIComponent(model) + ":generateContent?key=" + encodeURIComponent(key);
  const payload = {
    system_instruction: { parts: [{ text: system }] },
    contents: [{ role: "user", parts: [{ text: prompt }] }],
    generationConfig: {
      temperature: 0.5,
      maxOutputTokens: MAX_TOK,
      thinkingConfig: { thinkingBudget: 0 }
    }
  };
  let r = await timedFetch(url, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(payload)
  });
  let data = await r.json().catch(() => ({}));
  if (!r.ok && /thinking|unknown name|invalid/i.test(JSON.stringify(data))) {
    delete payload.generationConfig.thinkingConfig;
    r = await timedFetch(url, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(payload)
    });
    data = await r.json().catch(() => ({}));
  }
  if (!r.ok) throw new Error((data.error && data.error.message) || ("Gemini " + r.status));
  const parts = ((((data.candidates || [])[0] || {}).content || {}).parts) || [];
  const text = parts.filter((p) => !p.thought).map((p) => p.text || "").join("").trim();
  if (!text) throw new Error("Gemini returned empty");
  return { text, provider: "gemini", model };
}

async function callGroq(key, model, system, prompt) {
  const r = await timedFetch("https://api.groq.com/openai/v1/chat/completions", {
    method: "POST",
    headers: { "Content-Type": "application/json", Authorization: "Bearer " + key },
    body: JSON.stringify({
      model,
      temperature: 0.5,
      max_tokens: MAX_TOK,
      messages: [
        { role: "system", content: system },
        { role: "user", content: prompt }
      ]
    })
  });
  const data = await r.json().catch(() => ({}));
  if (!r.ok) throw new Error((data.error && (data.error.message || data.error)) || ("Groq " + r.status));
  const text = String((((data.choices || [])[0] || {}).message || {}).content || "").trim();
  if (!text) throw new Error("Groq returned empty");
  return { text, provider: "groq", model };
}

function orderModels(provider) {
  const base = provider === "gemini" ? GEMINI_MODELS : GROQ_MODELS;
  if (lastGood && lastGood.provider === provider && base.includes(lastGood.model)) {
    return [lastGood.model, ...base.filter((m) => m !== lastGood.model)];
  }
  return base.slice();
}

async function walk(label, fn, provider, key, system, prompt) {
  if (!key) {
    const e = new Error("no-key");
    e.code = "no-key";
    throw e;
  }
  let last = null;
  for (const model of orderModels(provider)) {
    try {
      return await fn(key, model, system, prompt);
    } catch (e) {
      last = e;
      if (e && e.name === "AbortError") {
        last = new Error(label + " timed out");
        continue;
      }
    }
  }
  throw last || new Error(label + " failed");
}

export default async function handler(req, res) {
  try {
    if (req.method === "OPTIONS") {
      Object.entries(cors).forEach(([k, v]) => res.setHeader(k, v));
      return res.status(200).end();
    }

    const geminiKey = process.env.GEMINI_API_KEY || "";
    const groqKey = process.env.GROQ_API_KEY || "";

    if (req.method === "GET") {
      return send(res, 200, {
        ok: true,
        ready: !!(geminiKey || groqKey),
        gemini: !!geminiKey,
        groq: !!groqKey
      });
    }

    if (req.method !== "POST") return send(res, 405, { error: "POST only" });

    if (!geminiKey && !groqKey) {
      return send(res, 503, {
        error: "Add GEMINI_API_KEY and/or GROQ_API_KEY in Vercel → Settings → Environment Variables, then redeploy."
      });
    }

    let body = req.body && typeof req.body === "object" ? req.body : {};
    if (typeof req.body === "string") {
      try { body = JSON.parse(req.body); } catch { body = {}; }
    }
    const prompt = String(body.prompt || "").trim().slice(0, 4000);
    if (!prompt) return send(res, 400, { error: "prompt required" });
    const system = String(body.system || "You are ALIGN. Be brief.").slice(0, 6000);
    let prefer = body.prefer === "groq" ? ["groq", "gemini"]
      : body.prefer === "gemini" ? ["gemini", "groq"]
        : ["gemini", "groq"];
    if (lastGood && body.prefer !== "groq" && body.prefer !== "gemini") {
      prefer = lastGood.provider === "groq" ? ["groq", "gemini"] : ["gemini", "groq"];
    }

    let last = "Both providers failed";
    for (const p of prefer) {
      try {
        const out = p === "gemini"
          ? await walk("Gemini", callGemini, "gemini", geminiKey, system, prompt)
          : await walk("Groq", callGroq, "groq", groqKey, system, prompt);
        lastGood = { provider: out.provider, model: out.model };
        return send(res, 200, { ok: true, ...out });
      } catch (e) {
        if (e && e.code === "no-key") continue;
        last = e instanceof Error ? e.message : String(e);
      }
    }
    return send(res, 502, { error: last });
  } catch (e) {
    const msg = e && e.name === "AbortError" ? "Timed out" : ((e && e.message) || "AI failed");
    return send(res, 502, { error: msg });
  }
}

export const config = { maxDuration: 20 };
