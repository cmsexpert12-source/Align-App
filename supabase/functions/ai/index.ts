// ALIGN AI proxy — Gemini, then Groq.
// Deploy:  supabase functions deploy ai
// Secrets: supabase secrets set GEMINI_API_KEY=... GROQ_API_KEY=...
// Optional. The app also calls Gemini/Groq directly from keys saved on the phone.

const cors = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
  "Access-Control-Allow-Methods": "POST, OPTIONS"
};

function json(body: unknown, status = 200) {
  return new Response(JSON.stringify(body), {
    status,
    headers: { ...cors, "Content-Type": "application/json" }
  });
}

const GEMINI = ["gemini-2.5-flash-lite", "gemini-2.5-flash", "gemini-2.0-flash", "gemini-flash-latest"];
const GROQ = ["openai/gpt-oss-20b", "openai/gpt-oss-120b", "qwen/qwen3.8-27b", "llama-3.1-8b-instant"];

async function gemini(key: string, model: string, system: string, prompt: string) {
  const url = `https://generativelanguage.googleapis.com/v1beta/models/${model}:generateContent?key=${encodeURIComponent(key)}`;
  const res = await fetch(url, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      system_instruction: { parts: [{ text: system }] },
      contents: [{ role: "user", parts: [{ text: prompt }] }],
      generationConfig: { temperature: 0.55, maxOutputTokens: 512 }
    })
  });
  const data = await res.json();
  if (!res.ok) throw new Error((data.error && data.error.message) || `Gemini ${res.status}`);
  const parts = data?.candidates?.[0]?.content?.parts || [];
  const text = parts.map((p: { text?: string }) => p.text || "").join("").trim();
  if (!text) throw new Error("Gemini empty");
  return { text, provider: "gemini", model };
}

async function groq(key: string, model: string, system: string, prompt: string) {
  const res = await fetch("https://api.groq.com/openai/v1/chat/completions", {
    method: "POST",
    headers: { "Content-Type": "application/json", Authorization: "Bearer " + key },
    body: JSON.stringify({
      model,
      temperature: 0.55,
      max_tokens: 512,
      messages: [
        { role: "system", content: system },
        { role: "user", content: prompt }
      ]
    })
  });
  const data = await res.json();
  if (!res.ok) throw new Error((data.error && data.error.message) || `Groq ${res.status}`);
  const text = String(data?.choices?.[0]?.message?.content || "").trim();
  if (!text) throw new Error("Groq empty");
  return { text, provider: "groq", model };
}

async function walk(
  label: string,
  fn: (key: string, model: string, system: string, prompt: string) => Promise<{ text: string; provider: string; model: string }>,
  models: string[],
  key: string,
  system: string,
  prompt: string
) {
  if (!key) throw new Error("no-key");
  let last = "failed";
  for (const model of models) {
    try {
      return await fn(key, model, system, prompt);
    } catch (e) {
      last = e instanceof Error ? e.message : String(e);
    }
  }
  throw new Error(label + ": " + last);
}

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: cors });
  if (req.method !== "POST") return json({ error: "POST only" }, 405);

  let body: { prompt?: string; system?: string; prefer?: string } = {};
  try { body = await req.json(); } catch { /* empty */ }
  const prompt = String(body.prompt || "").trim();
  if (!prompt) return json({ error: "prompt required" }, 400);

  const geminiKey = Deno.env.get("GEMINI_API_KEY") || "";
  const groqKey = Deno.env.get("GROQ_API_KEY") || "";
  if (!geminiKey && !groqKey) return json({ error: "No AI keys on the server" }, 500);

  const system = String(body.system || "You are ALIGN. Be brief.");
  const prefer = body.prefer === "groq" ? ["groq", "gemini"] : ["gemini", "groq"];
  let last = "Both providers failed";
  for (const p of prefer) {
    try {
      const res = p === "gemini"
        ? await walk("Gemini", gemini, GEMINI, geminiKey, system, prompt)
        : await walk("Groq", groq, GROQ, groqKey, system, prompt);
      return json({ ok: true, ...res });
    } catch (e) {
      const msg = e instanceof Error ? e.message : String(e);
      if (msg === "no-key") continue;
      last = msg;
    }
  }
  return json({ error: last }, 502);
});
