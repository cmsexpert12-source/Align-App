/* ALIGN AI — Gemini + Groq with automatic failover */
window.ALIGN_AI = (() => {
  const LS = "align-ai-keys";
  const GEMINI_MODELS = [
    "gemini-3.5-flash-lite",
    "gemini-3.6-flash"
  ];
  const GROQ_MODELS = [
    "llama-3.1-8b-instant",
    "openai/gpt-oss-20b"
  ];

  const BASE = [
    "You are ALIGN, the in-app assistant for ALIGN — a consumer morning operating system (planner, tracker, and dashboard). It is not a gym app. Today and Word are equal to Move.",
    "PRODUCT (never contradict; never invent other screens or rules):",
    "Nav is Today, Move, Word, Journal, You. Overlays (pray, devotion, Scripture, memory, sprint, affirm, begin, reader) hide the nav.",
    "Morning path is sequential — only the next incomplete step can be marked done: Rise → Train → Pray → Devotion → Memory → Scripture → Sprint → Affirm → Plan → Get ready → Recite (verse again) → Begin. Evening Word, night sprint, and lights are ungated.",
    "Clocks (Lagos): Sunday rise 4:00 AM, train ~12 min, one Bible chapter, leave for church by 5:45 AM, lights midnight. Mon–Sat rise 5:00 AM, fuller bodyweight training, 3–4 chapters, lights 1:00 AM. Push: 5 minutes before wake and 10 minutes before lights. Title ALIGN · body Five minutes. or Ten minutes.",
    "Train is bodyweight, seven days, energy not hypertrophy. After exercise, Save & continue. If training is already logged today, keep the longest minutes and go home — do not overwrite a longer session.",
    "Word: Spurgeon devotion is in the app. The memory verse is THAT devotion verse, not the day's chapters, shown in full KJV. After devotion: two minutes on the line, then Hide the words (SRS). Scripture reading is KJV by default, or WEB if they switch on the chapter screen. Sprint is 2 minutes, 30 questions on the day's text — meaning, not verse-ID; morning and night. Affirmation is written by the user and syncs. Recite the same devotion verse before Begin and at lights.",
    "Plan: Top 3 are markable, plus Also. Unmarked items roll to the next day at the same priority. Journal is a free notepad, not the devotion takeaway, and it is not on the dashboard.",
    "Books: PDFs read in ALIGN. Shelves (Scripture, Devotional, Study, Growth, Other, or a typed shelf). Schedule morning or evening. Page progress and titles sync even if the PDF is not on this device yet.",
    "Time shows after today's path is done: each task has an ideal time vs actual. Do not advise cutting Word or prayer to look fast.",
    "Accounts use Supabase. Mornings, plans, notes, workouts, books, reading page, sounds, profile, and affirmation sync. PWA with push.",
    "ACCURACY: Use only PRODUCT facts plus LIVE FACTS in the user message. If a verse, page, time, name, or count is not there, say you do not have it. Never invent Scripture text or references, exercise numbers, app screens, or a different memory verse. Do not write a full prayer to recite. Do not replace the Bible. Answer how-the-app-works questions from PRODUCT. Be deep when the question needs it; no filler, no emojis, no medical claims. Short paragraphs or a numbered list. Bold labels only. No code fences, no markdown headings."
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
  let probing = null;

  const timeoutFetch = (url, opts, ms = 12000) => {
    const ctrl = new AbortController();
    const t = setTimeout(() => ctrl.abort(), ms);
    return fetch(url, { ...opts, signal: ctrl.signal }).finally(() => clearTimeout(t));
  };

  const probe = async () => {
    if (probing) return probing;
    probing = (async () => {
      try {
        const r = await timeoutFetch("/api/ai", { method: "GET", cache: "no-store" }, 4000);
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
      probing = null;
      return server;
    })();
    return probing;
  };

  let lastOk = null;

  const callServer = async (system, user, prefer) => {
    const tok = (window.AlignDB && AlignDB.token && AlignDB.token()) || "";
    const headers = { "Content-Type": "application/json" };
    if (tok) headers.Authorization = "Bearer " + tok;
    const res = await timeoutFetch("/api/ai", {
      method: "POST",
      headers,
      body: JSON.stringify({ prompt: user, context: String(system || "").slice(0, 8000), prefer })
    }, 16000);
    const data = await res.json().catch(() => ({}));
    if (!res.ok || !data.text) {
      const err = new Error(data.error || ("AI " + res.status));
      err.status = res.status;
      throw err;
    }
    return { text: data.text, provider: data.provider, model: data.model };
  };

  const callGemini = async (key, model, system, user) => {
    const url = "https://generativelanguage.googleapis.com/v1beta/models/" +
      encodeURIComponent(model) + ":generateContent?key=" + encodeURIComponent(key);
    const payload = {
      system_instruction: { parts: [{ text: system }] },
      contents: [{ role: "user", parts: [{ text: user }] }],
      generationConfig: {
        temperature: 0.25,
        maxOutputTokens: 700,
        thinkingConfig: { thinkingBudget: 0 }
      }
    };
    let res = await timeoutFetch(url, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(payload)
    }, 10000);
    let data = await res.json().catch(() => ({}));
    if (!res.ok && /thinking|unknown name|invalid/i.test(JSON.stringify(data))) {
      delete payload.generationConfig.thinkingConfig;
      res = await timeoutFetch(url, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload)
      }, 10000);
      data = await res.json().catch(() => ({}));
    }
    if (!res.ok) {
      const err = new Error((data.error && data.error.message) || ("Gemini " + res.status));
      err.status = res.status;
      throw err;
    }
    const parts = ((((data.candidates || [])[0] || {}).content || {}).parts) || [];
    const text = parts.filter((p) => !p.thought).map((p) => p.text || "").join("").trim();
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
        temperature: 0.25,
        max_tokens: 700,
        messages: [
          { role: "system", content: system },
          { role: "user", content: user }
        ]
      })
    }, 10000);
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
    if (m.includes("failed to fetch") || m.includes("network") || m.includes("load failed") || m.includes("empty")) return true;
    return false;
  };

  const tryProvider = async (label, fn, models, key, system, user) => {
    if (!key) {
      const err = new Error("no-key");
      err.code = "no-key";
      throw err;
    }
    const list = lastOk && lastOk.provider === label.toLowerCase()
      ? [lastOk.model, ...models.filter((m) => m !== lastOk.model)]
      : models;
    let last = null;
    for (const model of list) {
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

  const friendly = (e) => {
    if (e && e.name === "AbortError") return "That took too long. Try again.";
    const m = String((e && e.message) || "");
    if (/abort|timed out|timeout/i.test(m)) return "That took too long. Try again.";
    if (/503|not reachable|no-keys/i.test(m)) return "ALIGN AI is not reachable. Check Vercel keys and redeploy.";
    return m || "Both Gemini and Groq failed.";
  };

  const ask = async ({ prompt, context, extraSystem }) => {
    const keys = keysOf();
    const system = [BASE, extraSystem || "", context || ""].filter(Boolean).join("\n\n").slice(0, 6000);
    const user = String(prompt || "").trim().slice(0, 4000);
    const prefer = keys.prefer;

    if (!server.checked) {
      try { await probe(); } catch { /* ignore */ }
    }

    try {
      const live = [extraSystem || "", context || ""].filter(Boolean).join("\n\n").slice(0, 8000);
      const res = await callServer(live, user, prefer);
      lastOk = { provider: res.provider, model: res.model };
      server.ready = true;
      if (res.provider === "gemini") server.gemini = true;
      if (res.provider === "groq") server.groq = true;
      return res;
    } catch (e) {
      if (!keys.gemini && !keys.groq) {
        const err = new Error(friendly(e));
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
          ? await tryProvider("Gemini", callGemini, GEMINI_MODELS, keys.gemini, system, user)
          : await tryProvider("Groq", callGroq, GROQ_MODELS, keys.groq, system, user);
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
