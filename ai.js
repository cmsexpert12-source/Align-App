/* ALIGN AI — Gemini + Groq with automatic failover */
window.ALIGN_AI = (() => {
  const LS = "align-ai-keys";
  const GEMINI_MODELS = [
    "gemini-2.5-flash-lite",
    "gemini-2.5-flash",
    "gemini-2.0-flash",
    "gemini-flash-latest"
  ];
  const GROQ_MODELS = [
    "openai/gpt-oss-20b",
    "openai/gpt-oss-120b",
    "qwen/qwen3.8-27b",
    "llama-3.1-8b-instant"
  ];

  const BASE = [
    "You are ALIGN, a quiet assistant inside a consumer morning operating system.",
    "The person trains at home with bodyweight work, then prays, reads a devotion, reads Scripture (World English Bible), plans the day, and sometimes a PDF book.",
    "Sunday: rise 4:00 AM, short 12-minute push, one Bible chapter, leave for church by 5:45 AM.",
    "Mon–Sat: rise 5:00 AM, fuller training, 3–4 Bible chapters. Lights out 1:00 AM (midnight Sunday).",
    "Be brief. 2–6 short sentences unless they ask for a list. Use short paragraphs or a simple numbered list. Bold only for labels. No code fences, no markdown headings, no fluff, no emojis, no medical claims.",
    "Do not replace prayer or Scripture with generated devotion. You may ask a question or name a theme.",
    "If you lack a fact, say so. Do not invent Bible verses."
  ].join(" ");

  const load = () => {
    try {
      const s = JSON.parse(localStorage.getItem(LS) || "null") || {};
      return {
        gemini: String(s.gemini || ""),
        groq: String(s.groq || ""),
        prefer: s.prefer === "groq" || s.prefer === "gemini" ? s.prefer : "auto"
      };
    } catch {
      return { gemini: "", groq: "", prefer: "auto" };
    }
  };

  const save = (keys) => {
    const cur = load();
    const next = { ...cur, ...keys };
    localStorage.setItem(LS, JSON.stringify(next));
    return next;
  };

  const cfgKeys = () => {
    const c = window.ALIGN_CONFIG || {};
    return { gemini: c.geminiKey || "", groq: c.groqKey || "" };
  };

  const keysOf = () => {
    const a = load();
    const b = cfgKeys();
    return { gemini: a.gemini || b.gemini, groq: a.groq || b.groq, prefer: a.prefer };
  };

  let server = { ready: false, gemini: false, groq: false, checked: false };

  const probe = async () => {
    try {
      const r = await fetch("/api/ai", { method: "GET", cache: "no-store" });
      const data = await r.json().catch(() => ({}));
      server = {
        ready: !!(data && data.ready),
        gemini: !!(data && data.gemini),
        groq: !!(data && data.groq),
        checked: true
      };
    } catch {
      server = { ready: false, gemini: false, groq: false, checked: true };
    }
    return server;
  };

  let lastOk = null;

  const callServer = async (system, user, prefer) => {
    const res = await timeoutFetch("/api/ai", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ prompt: user, system, prefer })
    }, 28000);
    const data = await res.json().catch(() => ({}));
    if (!res.ok || !data.text) {
      const err = new Error(data.error || ("AI " + res.status));
      err.status = res.status;
      throw err;
    }
    return { text: data.text, provider: data.provider, model: data.model };
  };

  const timeoutFetch = (url, opts, ms = 18000) => {
    const ctrl = new AbortController();
    const t = setTimeout(() => ctrl.abort(), ms);
    return fetch(url, { ...opts, signal: ctrl.signal }).finally(() => clearTimeout(t));
  };

  const callGemini = async (key, model, system, user) => {
    const url = "https://generativelanguage.googleapis.com/v1beta/models/" +
      encodeURIComponent(model) + ":generateContent?key=" + encodeURIComponent(key);
    const res = await timeoutFetch(url, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        system_instruction: { parts: [{ text: system }] },
        contents: [{ role: "user", parts: [{ text: user }] }],
        generationConfig: { temperature: 0.55, maxOutputTokens: 512 }
      })
    });
    const data = await res.json().catch(() => ({}));
    if (!res.ok) {
      const err = new Error((data.error && data.error.message) || ("Gemini " + res.status));
      err.status = res.status;
      throw err;
    }
    const parts = ((((data.candidates || [])[0] || {}).content || {}).parts) || [];
    const text = parts.map((p) => p.text || "").join("").trim();
    if (!text) {
      const err = new Error("Gemini returned empty");
      err.status = 503;
      throw err;
    }
    return { text, provider: "gemini", model };
  };

  const callGroq = async (key, model, system, user) => {
    const res = await timeoutFetch("https://api.groq.com/openai/v1/chat/completions", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: "Bearer " + key
      },
      body: JSON.stringify({
        model,
        temperature: 0.55,
        max_tokens: 512,
        messages: [
          { role: "system", content: system },
          { role: "user", content: user }
        ]
      })
    });
    const data = await res.json().catch(() => ({}));
    if (!res.ok) {
      const err = new Error((data.error && (data.error.message || data.error)) || ("Groq " + res.status));
      err.status = res.status;
      throw err;
    }
    const text = String((((data.choices || [])[0] || {}).message || {}).content || "").trim();
    if (!text) {
      const err = new Error("Groq returned empty");
      err.status = 503;
      throw err;
    }
    return { text, provider: "groq", model };
  };

  const retryable = (e) => {
    const s = e && e.status;
    const m = String((e && e.message) || "").toLowerCase();
    if (e && e.name === "AbortError") return true;
    if (s === 429 || s === 404 || s === 400 || s === 503 || s === 500 || s === 502) return true;
    if (m.includes("not found") || m.includes("decommission") || m.includes("unavailable")) return true;
    if (m.includes("failed to fetch") || m.includes("network") || m.includes("load failed")) return true;
    return false;
  };

  const tryProvider = async (label, fn, models, key, system, user) => {
    if (!key) {
      const err = new Error("no-key");
      err.code = "no-key";
      throw err;
    }
    let last = null;
    for (const model of models) {
      try {
        return await fn(key, model, system, user);
      } catch (e) {
        last = e;
        if (e && (e.status === 401 || e.status === 403)) throw e;
        if (retryable(e)) continue;
        continue;
      }
    }
    throw last || new Error(label + " failed");
  };

  const hasKeys = () => {
    const k = keysOf();
    if (k.gemini || k.groq || server.ready) return true;
    return !server.checked;
  };

  const ask = async ({ prompt, context, extraSystem }) => {
    const keys = keysOf();
    const system = [BASE, extraSystem || "", context || ""].filter(Boolean).join("\n\n");
    const prefer = keys.prefer;

    if (!server.checked) await probe();

    try {
      const res = await callServer(system, prompt, prefer);
      lastOk = { provider: res.provider, model: res.model };
      server.ready = true;
      if (res.provider === "gemini") server.gemini = true;
      if (res.provider === "groq") server.groq = true;
      return res;
    } catch (e) {
      if (!keys.gemini && !keys.groq) {
        const msg = (e && e.message) ? e.message : "ALIGN AI is not reachable. Check Vercel keys and redeploy.";
        const err = new Error(msg);
        err.code = "no-keys";
        throw err;
      }
    }

    let order;
    if (prefer === "groq") order = ["groq", "gemini"];
    else if (prefer === "gemini") order = ["gemini", "groq"];
    else order = lastOk && lastOk.provider === "groq" ? ["groq", "gemini"] : ["gemini", "groq"];

    let lastErr = null;
    for (const p of order) {
      try {
        const res = p === "gemini"
          ? await tryProvider("Gemini", callGemini, GEMINI_MODELS, keys.gemini, system, prompt)
          : await tryProvider("Groq", callGroq, GROQ_MODELS, keys.groq, system, prompt);
        lastOk = { provider: res.provider, model: res.model };
        return res;
      } catch (e) {
        if (e && e.code === "no-key") continue;
        lastErr = e;
      }
    }
    throw lastErr || new Error("Both Gemini and Groq are unavailable.");
  };

  const label = (res) => {
    if (!res) return "";
    const p = res.provider === "groq" ? "Groq" : "Gemini";
    return p + " · " + (res.model || "");
  };

  return { load, save, keysOf, hasKeys, ask, probe, server: () => server, last: () => lastOk, label, BASE };
})();
