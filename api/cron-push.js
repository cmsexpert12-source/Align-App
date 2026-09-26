/* ALIGN timed push — 5 min before rise, 10 min before lights out.
   Called every 5 minutes from pg_cron (sql/push-alarms.sql).
   Test from the phone: POST { mode: "test" } with the user JWT. */

import webpush from "web-push";

const SUPABASE_URL = (process.env.SUPABASE_URL || "https://sqwwjrddpjkenkhpyntg.supabase.co").replace(/\/$/, "");
const ANON = process.env.SUPABASE_ANON_KEY || "";
const SERVICE = process.env.SUPABASE_SERVICE_ROLE_KEY || "";
const CRON = process.env.CRON_SECRET || "";
const VAPID_PUBLIC = process.env.VAPID_PUBLIC_KEY || "";
const VAPID_PRIVATE = process.env.VAPID_PRIVATE_KEY || "";
const VAPID_SUBJECT = process.env.VAPID_SUBJECT || "mailto:realoneade8@gmail.com";

const WAKE_NOTES = [
  [
    ["ALIGN · Go to Him first", "4:00. Twelve minutes. One chapter. Out by 5:45. The first appointment of the week is His — keep it."],
    ["ALIGN · The house is waiting", "This hour is already holy. Rise. Walk the light path. Leave on time. Be the first one faithful."],
    ["ALIGN · Sunday is a vow", "Don't give this morning to delay. One chapter. Dressed. Out. Church is where the week begins."]
  ],
  [
    ["ALIGN · Become who you said", "A new week does not need a new you. It needs you awake, in the Word, already in motion."],
    ["ALIGN · Win the morning", "You are up. The quiet is a gift. Body. Prayer. Scripture. Then the day cannot steal you."],
    ["ALIGN · Fire, not feeling", "Rise. Train. Pray. Open the Word. Go. The man who wins Monday does not negotiate the rest of the week."]
  ],
  [
    ["ALIGN · Built in the dark", "Strength is made before anyone is watching. Get up. Walk the path. The man you want is forged in this hour."],
    ["ALIGN · Don't skip the quiet", "The world can wait. Train. Pray. Open Scripture. Three true things. Everything else finds its place."],
    ["ALIGN · Stay in the fight", "This is how lives change — not in public, in the dark, on a Tuesday, when no one claps."]
  ],
  [
    ["ALIGN · Midweek, still yours", "The week does not own you. This hour does. One faithful morning outweighs a late start and a loud day."],
    ["ALIGN · Don't decide twice", "Rise. Move. Pray. Word. Plan. Ready. Go. The path is already chosen. Walk it like it is life."],
    ["ALIGN · Keep the flame", "Halfway is where most men fade. Not you. Open ALIGN. Finish the morning. Become."]
  ],
  [
    ["ALIGN · What you repeat, you become", "What you do in the dark becomes who you are in the light. Don't break the streak of your soul."],
    ["ALIGN · Guard this hour", "The Word is waiting. So is the work. Body, then soul, then the plan — and you will stand."],
    ["ALIGN · Faithfulness looks like this", "No audience. No mood. Just 5:00, the path, and the God who meets you here."]
  ],
  [
    ["ALIGN · Finish like you began", "One more morning in order. Don't let Friday steal the quiet. Train. Pray. Read. Then go and finish well."],
    ["ALIGN · End on the path", "Awake. Trained. In the Word. Ready. Close the work week the same way you opened it — faithful."],
    ["ALIGN · Don't coast", "The last weekday still belongs to Him. Rise. Walk it. Leave nothing lazy on the table."]
  ],
  [
    ["ALIGN · Recover on purpose", "Rest is not a skip. It is strength. Rise. Move gently. Pray. Stay with the Word. Don't drift."],
    ["ALIGN · Saturday still counts", "This morning is still a gift. Keep it. The man who is faithful on Saturday is ready for Sunday."],
    ["ALIGN · Don't give it away", "Sleep was for last night. This hour is for the soul. Open ALIGN. Keep the vow."]
  ]
];

const LIGHTS_NOTES = [
  [
    ["ALIGN · Guard midnight", "Ten minutes. Lights out. Rise is 4:00. Church is already on the path. Sleep like the first appointment is His."],
    ["ALIGN · Put heaven first", "Put it down. Four hours. Tomorrow's faithfulness starts with this yes. The house is waiting."],
    ["ALIGN · Close it for Him", "Sunday morning is a vow. Protect 4:00. Phone down. Lights out. Go to Him first."]
  ],
  [
    ["ALIGN · Protect 5:00", "Ten minutes. Lights out at 1:00. What you refuse tonight, you become at sunrise."],
    ["ALIGN · The feed can wait", "The feed will still be there. Your 5:00 will not. Close it. Sleep. Win tomorrow before it starts."],
    ["ALIGN · Choose the man", "One more scroll costs the morning. Lights out. Be the man who keeps the hour."]
  ],
  [
    ["ALIGN · Strength sleeps too", "Ten minutes. Lights out at 1:00. The dark is where strength is built — including the courage to stop."],
    ["ALIGN · Don't steal sunrise", "One more hour costs the man you're becoming. Lights out. Rise is 5:00. Keep the vow."],
    ["ALIGN · Lay it down", "The fight for tomorrow is won in bed, on time. Put the phone down. Rest like it is holy."]
  ],
  [
    ["ALIGN · This sleep is yours", "Ten minutes. Lights out at 1:00. The week does not get this hour. You do. Guard it."],
    ["ALIGN · Tomorrow is calling", "Rest is not a skip. It is how a faithful morning stays possible. Put it down."],
    ["ALIGN · Midweek, still a vow", "Don't bargain. 1:00. Sleep. 5:00 will make you if you let it."]
  ],
  [
    ["ALIGN · Become in the dark", "Ten minutes. Lights out at 1:00. What you repeat tonight becomes who you are at 5:00. Choose well."],
    ["ALIGN · Don't give it away", "The morning is waiting to make you. Sleep like it is holy — because it is."],
    ["ALIGN · Keep the streak", "Faithfulness is a night and a morning. Close the day. Don't leak the hour."]
  ],
  [
    ["ALIGN · Don't let Friday win", "Ten minutes. Lights out at 1:00. Don't spend Saturday's rise on tonight's noise. Close it. Recover."],
    ["ALIGN · Finish the night well", "The work week is not owed your sleep. Lights out. Tomorrow you rise on purpose."],
    ["ALIGN · Protect the rest", "Friday wants one more hour. The path wants 5:00. Choose the path."]
  ],
  [
    ["ALIGN · Recover, don't drift", "Ten minutes. Lights out at 1:00. Rest is part of the path. Keep 5:00. Keep Sunday."],
    ["ALIGN · Still a holy night", "Saturday sleep still belongs to the morning. Put the phone down. Keep the vow."],
    ["ALIGN · Don't leak Sunday", "What you watch now, you carry at 4:00. Lights out. Be ready for Him."]
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
  const key = token || ANON;
  const headers = {
    apikey: key,
    Authorization: "Bearer " + key,
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
  if (!VAPID_PUBLIC || !VAPID_PRIVATE) return send(res, 500, { error: "VAPID keys missing. Set VAPID_PUBLIC_KEY and VAPID_PRIVATE_KEY on Vercel." });

  const body = req.body && typeof req.body === "object" ? req.body : {};
  const mode = body.mode === "test" ? "test" : "tick";

  if (mode === "test") {
    if (req.method !== "POST") return send(res, 405, { error: "POST only" });
    const auth = String(req.headers.authorization || "");
    const jwt = auth.replace(/^Bearer\s+/i, "");
    if (!jwt) return send(res, 401, { error: "Sign in first" });
    if (!ANON) return send(res, 500, { error: "Set SUPABASE_ANON_KEY on Vercel." });
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

  if (req.method !== "POST" && req.method !== "GET") return send(res, 405, { error: "GET or POST" });
  const cronHeader = String(req.headers["x-cron-secret"] || "");
  const bearer = String(req.headers.authorization || "").replace(/^Bearer\s+/i, "");
  if (!CRON || (cronHeader !== CRON && bearer !== CRON)) return send(res, 401, { error: "Unauthorized cron" });
  if (!SERVICE) return send(res, 500, { error: "Set SUPABASE_SERVICE_ROLE_KEY on Vercel." });

  const due = await rest("/rest/v1/rpc/align_due_push", {
    method: "POST",
    token: SERVICE,
    body: {}
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
