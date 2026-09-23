/* ALIGN timed push — 5 min before rise, 10 min before lights out.
   Called every 5 minutes from pg_cron (sql/push-alarms.sql).
   Test from the phone: POST { mode: "test" } with the user JWT. */

import webpush from "web-push";

const SUPABASE_URL = (process.env.SUPABASE_URL || "https://sqwwjrddpjkenkhpyntg.supabase.co").replace(/\/$/, "");
const ANON = process.env.SUPABASE_ANON_KEY
  || "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InNxd3dqcmRkcGprZW5raHB5bnRnIiwicm9sZSI6ImFub24iLCJpYXQiOjE3OTAwNTc1NDcsImV4cCI6MjEwNTYzMzU0N30.IwDv1jIlxKZB2sP4IFP1YsjhqfOlHHSfx0XvN-cCJ0U";
const CRON = process.env.CRON_SECRET || "align-cron-v1-sqwwjrdd";
const VAPID_PUBLIC = process.env.VAPID_PUBLIC_KEY
  || "BHQs0Wo3QmVAFpW5a7raJqABOk98BLfrBH_4eRUOAUgIHxIybOFlotKQlwLsST-JYfHtx7klDmNNJMchJpcUYBo";
const VAPID_PRIVATE = process.env.VAPID_PRIVATE_KEY
  || "rbWSjDuf3YgHsdVyD0dzK8IrkspvCqFs2sZ6Pa1j_nc";
const VAPID_SUBJECT = process.env.VAPID_SUBJECT || "mailto:align@localhost";

const WAKE_NOTES = [
  [
    ["ALIGN · Church morning", "Rise at 4:00. Walk the light path. One chapter. Out by 5:45 — the first appointment is His."],
    ["ALIGN · The house is waiting", "This hour is already decided. Twelve minutes. One chapter. Leave on time. Go to church."]
  ],
  [
    ["ALIGN · Begin again", "A new week does not need a new you. It needs the same order. Rise. Train. Pray. Word. Go."],
    ["ALIGN · The day is a gift", "You are up. Body first, while the mind is quiet. Then prayer. Then the Word. Then the day."]
  ],
  [
    ["ALIGN · Quiet strength", "Strength is built in the dark, before anyone is watching. Walk the path. Stay here until you step out."],
    ["ALIGN · Don't skip the quiet", "Train. Pray. Open Scripture. Three true priorities. The rest of the day will take its place."]
  ],
  [
    ["ALIGN · Midweek, still yours", "The week does not own this hour. You do. One faithful morning is worth more than a late start."],
    ["ALIGN · Keep the order", "Rise. Move. Pray. Word. Plan. Ready. Go. Don't decide the morning twice."]
  ],
  [
    ["ALIGN · Faithfulness before sunrise", "What you repeat in the dark becomes who you are in the light. Open ALIGN. Walk the path."],
    ["ALIGN · Guard this hour", "The Word is waiting. So is the work. Start with the body, then the soul, then the plan."]
  ],
  [
    ["ALIGN · Finish the week well", "One more morning in order. Don't let Friday steal the quiet. Train. Pray. Read. Then go."],
    ["ALIGN · End as you began", "Awake. Trained. In the Word. Ready. Finish the work week the way you started it."]
  ],
  [
    ["ALIGN · Recover, don't drift", "Rest is part of the path — not a skip. Move gently. Pray. Read. Keep the morning."],
    ["ALIGN · Still a morning", "Saturday is still a gift. Rise. Recover well. Stay with the Word. Don't give the hour away."]
  ]
];

const LIGHTS_NOTES = [
  [
    ["ALIGN · Guard the night", "Ten minutes. Lights out at midnight. Rise is 4:00. The first appointment is His."],
    ["ALIGN · Sleep is part of the path", "Put it down. Four hours. Church morning is already decided."]
  ],
  [
    ["ALIGN · The morning is decided", "Ten minutes. Lights out at 1:00. What you protect tonight, you walk at 5:00."],
    ["ALIGN · Close it well", "The feed will still be there. Your 5:00 will not, if you steal from it now."]
  ],
  [
    ["ALIGN · Quiet strength starts now", "Ten minutes. Lights out at 1:00. Strength is built in the dark — including sleep."],
    ["ALIGN · Don't bargain", "One more hour costs the morning. Lights out. Rise is 5:00."]
  ],
  [
    ["ALIGN · Midweek, still yours", "Ten minutes. Lights out at 1:00. The week does not own this sleep. You do."],
    ["ALIGN · Keep the order", "Rest is not a skip. It is how tomorrow's path stays possible."]
  ],
  [
    ["ALIGN · Guard this hour", "Ten minutes. Lights out at 1:00. What you repeat in the dark becomes who you are in the light."],
    ["ALIGN · Don't give it away", "The morning is waiting. Sleep like it matters — because it does."]
  ],
  [
    ["ALIGN · Finish the week well", "Ten minutes. Lights out at 1:00. Don't let Friday steal the quiet of Saturday's rise."],
    ["ALIGN · End as you began", "The work week is not owed your sleep. Lights out. Recover."]
  ],
  [
    ["ALIGN · Recover, don't drift", "Ten minutes. Lights out at 1:00. Rest is part of the path. Keep the morning."],
    ["ALIGN · Still a night that matters", "Saturday sleep still belongs to 5:00. Put the phone down."]
  ]
];

const cors = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type, x-cron-secret",
  "Access-Control-Allow-Methods": "POST, OPTIONS"
};

function send(res, status, body) {
  res.statusCode = status;
  Object.entries({ ...cors, "Content-Type": "application/json" }).forEach(([k, v]) => res.setHeader(k, v));
  res.end(JSON.stringify(body));
}

function dowOf(iso) {
  const [y, m, d] = String(iso).split("-").map(Number);
  return new Date(Date.UTC(y, m - 1, d, 12, 0, 0)).getUTCDay();
}

function pick(bank, iso) {
  const dow = dowOf(iso);
  const rows = bank[dow] || bank[1];
  const day = Number(String(iso).slice(-2)) || 1;
  const pair = rows[day % rows.length];
  return { title: pair[0], body: pair[1] };
}

function payloadFor(kind, morning) {
  if (kind === "lights") {
    const n = pick(LIGHTS_NOTES, morning);
    return { title: n.title, body: n.body, tag: "align-lights", url: "./index.html" };
  }
  const n = pick(WAKE_NOTES, morning);
  const body = /^Five minutes/i.test(n.body) ? n.body : "Five minutes. " + n.body;
  return { title: n.title, body, tag: "align-wake", url: "./index.html" };
}

function todayInTz(tz) {
  try {
    const parts = new Intl.DateTimeFormat("en-CA", {
      timeZone: tz || "Africa/Lagos",
      year: "numeric",
      month: "2-digit",
      day: "2-digit"
    }).formatToParts(new Date());
    const get = (t) => parts.find((p) => p.type === t).value;
    return get("year") + "-" + get("month") + "-" + get("day");
  } catch {
    const d = new Date();
    return d.toISOString().slice(0, 10);
  }
}

async function rest(path, { method = "GET", token, body } = {}) {
  const headers = {
    apikey: ANON,
    Authorization: "Bearer " + (token || ANON),
    "Content-Type": "application/json",
    Accept: "application/json"
  };
  const r = await fetch(SUPABASE_URL + path, {
    method,
    headers,
    body: body ? JSON.stringify(body) : undefined
  });
  const text = await r.text();
  let json = null;
  try { json = text ? JSON.parse(text) : null; } catch { json = { raw: text }; }
  return { ok: r.ok, status: r.status, json };
}

async function sendAll(subs, payload) {
  webpush.setVapidDetails(VAPID_SUBJECT, VAPID_PUBLIC, VAPID_PRIVATE);
  const data = JSON.stringify(payload);
  let sent = 0;
  let failed = 0;
  for (const s of subs || []) {
    if (!s || !s.endpoint || !s.p256dh || !s.auth) { failed++; continue; }
    try {
      await webpush.sendNotification(
        { endpoint: s.endpoint, keys: { p256dh: s.p256dh, auth: s.auth } },
        data
      );
      sent++;
    } catch {
      failed++;
    }
  }
  return { sent, failed };
}

export default async function handler(req, res) {
  if (req.method === "OPTIONS") {
    res.statusCode = 200;
    Object.entries(cors).forEach(([k, v]) => res.setHeader(k, v));
    return res.end("ok");
  }
  if (req.method !== "POST") return send(res, 405, { error: "POST only" });
  if (!VAPID_PUBLIC || !VAPID_PRIVATE) return send(res, 500, { error: "VAPID keys missing" });

  const body = req.body && typeof req.body === "object" ? req.body : {};
  const mode = body.mode === "test" ? "test" : "tick";

  if (mode === "test") {
    const auth = String(req.headers.authorization || "");
    const jwt = auth.replace(/^Bearer\s+/i, "");
    if (!jwt) return send(res, 401, { error: "Sign in first" });
    const user = await rest("/auth/v1/user", { token: jwt });
    if (!user.ok || !user.json || !user.json.id) return send(res, 401, { error: "Invalid session" });
    const uid = user.json.id;
    const subs = await rest("/rest/v1/push_subscriptions?select=endpoint,p256dh,auth&user_id=eq." + encodeURIComponent(uid), { token: jwt });
    if (!subs.ok) return send(res, 500, { error: "Could not read subscriptions" });
    const morning = todayInTz("Africa/Lagos");
    const payload = payloadFor("wake", morning);
    payload.tag = "align-test";
    const results = await sendAll(subs.json || [], payload);
    return send(res, 200, { ok: true, ...results, title: payload.title });
  }

  const cronHeader = String(req.headers["x-cron-secret"] || "");
  if (!CRON || cronHeader !== CRON) return send(res, 401, { error: "Unauthorized cron" });

  const due = await rest("/rest/v1/rpc/align_due_push", {
    method: "POST",
    body: { _secret: CRON }
  });
  if (!due.ok) {
    const msg = (due.json && (due.json.message || due.json.hint || due.json.error)) || ("HTTP " + due.status);
    return send(res, due.status === 404 ? 503 : 500, {
      error: msg,
      hint: "Run sql/push-alarms.sql in Supabase → SQL Editor."
    });
  }

  const rows = Array.isArray(due.json) ? due.json : [];
  if (!rows.length) return send(res, 200, { ok: true, sent: 0, note: "none due" });

  let sent = 0;
  let failed = 0;
  const titles = [];
  for (const row of rows) {
    const payload = payloadFor(row.kind, row.morning);
    titles.push(payload.title);
    const r = await sendAll([row], payload);
    sent += r.sent;
    failed += r.failed;
  }
  return send(res, 200, { ok: true, sent, failed, n: rows.length, titles: titles.slice(0, 4) });
}

export const config = { maxDuration: 30 };
