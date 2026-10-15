/* ALIGN timed push — four a day: rise, midday plan, evening book, night devotion.
   Called every 5 minutes from pg_cron (sql/push-alarms.sql).
   Test from the phone: POST { mode: "test" } with the user JWT. */

import webPushPkg from "web-push";

const webpush = (webPushPkg && webPushPkg.sendNotification)
  ? webPushPkg
  : ((webPushPkg && webPushPkg.default) || webPushPkg);

const cleanEnv = (s) => String(s || "").trim().replace(/^["']|["']$/g, "");
const asMailto = (s) => {
  const v = cleanEnv(s);
  if (!v) return "mailto:realoneade8@gmail.com";
  if (/^mailto:/i.test(v) || /^https?:\/\//i.test(v)) return v;
  if (/^[^@\s]+@[^@\s]+\.[^@\s]+$/.test(v)) return "mailto:" + v;
  return "mailto:realoneade8@gmail.com";
};
const SUPABASE_URL = cleanEnv(process.env.SUPABASE_URL || "https://sqwwjrddpjkenkhpyntg.supabase.co").replace(/\/$/, "");
const ANON = cleanEnv(process.env.SUPABASE_ANON_KEY);
const SERVICE = cleanEnv(process.env.SUPABASE_SERVICE_ROLE_KEY);
const CRON = cleanEnv(process.env.CRON_SECRET);
const VAPID_PUBLIC = cleanEnv(process.env.VAPID_PUBLIC_KEY);
const VAPID_PRIVATE = cleanEnv(process.env.VAPID_PRIVATE_KEY);
const VAPID_SUBJECT = asMailto(process.env.VAPID_SUBJECT);

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

const PLAN_NOTES = [
  [
    ["ALIGN · Write the three", "Sunday still has a shape. Name what matters before the house fills."],
    ["ALIGN · The day is a vow", "Three lines. Then church. Don't let the morning end unnamed."],
    ["ALIGN · Keep it light", "One or two true things. The light path still needs a plan."]
  ],
  [
    ["ALIGN · Name the three", "The day already has a shape. Write the three. The rest can wait."],
    ["ALIGN · Don't carry twelve", "Three that matter. The man who names them owns the afternoon."],
    ["ALIGN · Monday on paper", "If it is not written, the noise will write it for you."]
  ],
  [
    ["ALIGN · Still three", "Midweek wants more. Give it three. Finish those. Become."],
    ["ALIGN · Cut it down", "What you will not do is as holy as what you will. Write the three."],
    ["ALIGN · The afternoon is watching", "Name them now. 2 o'clock is how the morning stays true."]
  ],
  [
    ["ALIGN · Halfway, still yours", "Three lines. Not a new life — the one you already chose."],
    ["ALIGN · Don't renegotiate", "The path is chosen. Write today's three like it is life."],
    ["ALIGN · Own the middle", "Wednesday eats the unplanned. Don't be eaten."]
  ],
  [
    ["ALIGN · What you name, you do", "Three. Written. Then the rest of Thursday cannot steal you."],
    ["ALIGN · Guard the list", "The feed has plans for you. Write yours first."],
    ["ALIGN · Faithful looks like this", "No mood. Three lines. Then go."]
  ],
  [
    ["ALIGN · Finish on paper", "Close the work week with three true things. Don't coast."],
    ["ALIGN · Friday still counts", "Name them. Then finish well. The weekend does not get this hour."],
    ["ALIGN · Don't leak it", "Three. Written. Then you can rest without guilt."]
  ],
  [
    ["ALIGN · Saturday has a shape", "Rest is not drift. Name one or two. Keep the vow."],
    ["ALIGN · Light, not empty", "A short list. A holy afternoon. Write it."],
    ["ALIGN · Ready for Sunday", "What you name today, you don't carry into church."]
  ]
];

const READ_NOTES = [
  [
    ["ALIGN · Open the book", "Sunday's sitting is still yours. One chapter is obedience. Open it."],
    ["ALIGN · The page is waiting", "Church was the morning. The book is the evening. Sit."],
    ["ALIGN · Don't skip the sitting", "A short page still counts. Open it before the night takes you."]
  ],
  [
    ["ALIGN · The book is waiting", "One sitting. Not a mood. Open the page you said you would."],
    ["ALIGN · Monday still reads", "The morning made you. The evening keeps you. Open the book."],
    ["ALIGN · Sit down", "The feed can wait. One page is how a man stays in the Word twice."]
  ],
  [
    ["ALIGN · Keep the sitting", "Tuesday night belongs to the page. Open it."],
    ["ALIGN · Don't drift", "You walked the morning. Finish the day in the book."],
    ["ALIGN · The same vow", "Body. Prayer. Scripture. And tonight, the sitting. Open it."]
  ],
  [
    ["ALIGN · Midweek page", "Halfway is where most men close the book. Not you."],
    ["ALIGN · Still on the page", "One sitting. The man you want reads when no one claps."],
    ["ALIGN · Open it anyway", "Tired is not a reason. The book is waiting."]
  ],
  [
    ["ALIGN · What you repeat", "A Thursday sitting becomes who you are. Open the book."],
    ["ALIGN · Guard this hour", "Seven o'clock is for the page. Don't give it to the feed."],
    ["ALIGN · Sit, don't scroll", "The Word in the morning. The book at night. Keep both."]
  ],
  [
    ["ALIGN · Finish in the book", "Close the work week on the page. One sitting. Then rest."],
    ["ALIGN · Friday still reads", "Don't coast. Open it. The weekend is not owed this hour."],
    ["ALIGN · Keep the streak", "A sitting tonight is how Saturday stays holy."]
  ],
  [
    ["ALIGN · Saturday sitting", "Rest includes the page. Open the book. Stay with it."],
    ["ALIGN · Don't give it away", "The house can wait ten minutes. The book cannot."],
    ["ALIGN · Ready the soul", "Tonight's page is Sunday morning's strength. Open it."]
  ]
];

function payloadFor(kind, iso) {
  const day = iso || todayInTz("Africa/Lagos");
  if (kind === "lights") {
    const n = pick(LIGHTS_NOTES, day);
    return { title: n.title, body: n.body, tag: "align-lights", url: "./index.html" };
  }
  if (kind === "plan") {
    const n = pick(PLAN_NOTES, day);
    return { title: n.title, body: n.body, tag: "align-plan", url: "./index.html" };
  }
  if (kind === "read") {
    const n = pick(READ_NOTES, day);
    return { title: n.title, body: n.body, tag: "align-read", url: "./index.html" };
  }
  const n = pick(WAKE_NOTES, day);
  const body = /^Five minutes/i.test(n.body) ? n.body : ("Five minutes. " + n.body);
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
  const auth = token || ANON;
  const apiKey = (SERVICE && token === SERVICE) ? SERVICE : (ANON || auth);
  const headers = {
    apikey: apiKey,
    Authorization: "Bearer " + auth,
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

async function dropSubs(endpoints) {
  for (const endpoint of endpoints || []) {
    if (!endpoint) continue;
    await rest("/rest/v1/push_subscriptions?endpoint=eq." + encodeURIComponent(endpoint), {
      method: "DELETE",
      token: SERVICE
    });
  }
}

async function unmark(userId, kind) {
  if (!userId || !SERVICE) return;
  const patch = kind === "lights" ? { last_lights_sent: null }
    : kind === "plan" ? { last_plan_sent: null }
    : kind === "read" ? { last_read_sent: null }
    : { last_wake_sent: null };
  await rest("/rest/v1/notification_prefs?user_id=eq." + encodeURIComponent(userId), {
    method: "PATCH",
    token: SERVICE,
    body: patch
  });
}

function readBody(req) {
  const b = req.body;
  if (b == null || b === "") return {};
  if (typeof b === "string") {
    try { return JSON.parse(b); } catch { return {}; }
  }
  if (typeof Buffer !== "undefined" && Buffer.isBuffer(b)) {
    try { return JSON.parse(b.toString("utf8") || "{}"); } catch { return {}; }
  }
  if (typeof b === "object") return b;
  return {};
}

function errText(e) {
  if (!e) return "fail";
  const body = e.body;
  if (body == null) return String(e.message || e).slice(0, 160);
  if (typeof body === "string") return body.slice(0, 160);
  if (typeof Buffer !== "undefined" && Buffer.isBuffer(body)) return body.toString("utf8").slice(0, 160);
  try { return JSON.stringify(body).slice(0, 160); } catch { return String(e.message || "fail").slice(0, 160); }
}

function addDay(iso) {
  const [y, m, d] = String(iso).split("-").map(Number);
  const dt = new Date(Date.UTC(y, (m || 1) - 1, (d || 1) + 1));
  return dt.toISOString().slice(0, 10);
}

function localClock(tz, d) {
  const fmt = new Intl.DateTimeFormat("en-US", {
    timeZone: tz || "Africa/Lagos",
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
    hour: "2-digit",
    minute: "2-digit",
    weekday: "short",
    hour12: false
  });
  const map = {};
  fmt.formatToParts(d).forEach((p) => { map[p.type] = p.value; });
  const date = map.year + "-" + map.month + "-" + map.day;
  let hr = Number(map.hour);
  if (map.hour === "24") hr = 0;
  const mn = Number(map.minute) || 0;
  const wd = { Sun: 0, Mon: 1, Tue: 2, Wed: 3, Thu: 4, Fri: 5, Sat: 6 };
  return {
    date,
    nextDate: addDay(date),
    dow: wd[map.weekday] != null ? wd[map.weekday] : 1,
    mins: (Number.isFinite(hr) ? hr : 0) * 60 + mn
  };
}

function nInt(v, fb) {
  const n = Number(v);
  return Number.isFinite(n) ? n : fb;
}

function slotsOf(p, now) {
  const clk = localClock(p.timezone || "Africa/Lagos", now);
  const sun = clk.dow === 0;
  const tomSun = ((clk.dow + 1) % 7) === 0;
  const minsOf = (h, m) => nInt(h, 0) * 60 + nInt(m, 0);
  const wake = minsOf(sun ? p.sun_wake_h : p.wk_wake_h, sun ? p.sun_wake_m : p.wk_wake_m) - 5;
  const wakeTom = minsOf(tomSun ? p.sun_wake_h : p.wk_wake_h, tomSun ? p.sun_wake_m : p.wk_wake_m) - 5;
  const lights = minsOf(sun ? p.sun_lights_h : p.wk_lights_h, sun ? p.sun_lights_m : p.wk_lights_m) - 10;
  const lightsTom = minsOf(tomSun ? p.sun_lights_h : p.wk_lights_h, tomSun ? p.sun_lights_m : p.wk_lights_m) - 10;
  const plan = minsOf(p.plan_h != null ? p.plan_h : 14, p.plan_m != null ? p.plan_m : 0);
  const read = minsOf(p.read_h != null ? p.read_h : 19, p.read_m != null ? p.read_m : 0);
  const WIN = 6 * 60;
  const inWin = (start) => {
    if (!(start >= 0)) return false;
    const end = start + WIN;
    if (clk.mins >= start && clk.mins < Math.min(1440, end)) return true;
    return false;
  };
  const wrap = (start) => start < 0 && clk.mins >= (1440 + start) && clk.mins < Math.min(1440, 1440 + start + WIN);
  const day = (iso) => (iso ? String(iso).slice(0, 10) : "");
  const out = [];
  if (inWin(wake) && day(p.last_wake_sent) !== clk.date) out.push({ kind: "wake", morn: clk.date });
  if (wrap(wakeTom) && day(p.last_wake_sent) !== clk.nextDate) out.push({ kind: "wake", morn: clk.nextDate });
  if (inWin(plan) && day(p.last_plan_sent) !== clk.date) out.push({ kind: "plan", morn: clk.date });
  if (inWin(read) && day(p.last_read_sent) !== clk.date) out.push({ kind: "read", morn: clk.date });
  if (inWin(lights) && day(p.last_lights_sent) !== clk.date) out.push({ kind: "lights", morn: clk.date });
  if (wrap(lightsTom) && day(p.last_lights_sent) !== clk.nextDate) out.push({ kind: "lights", morn: clk.nextDate });
  return out;
}

async function markKind(userId, kind, morn) {
  if (!userId || !SERVICE) return;
  const patch = kind === "lights" ? { last_lights_sent: morn }
    : kind === "plan" ? { last_plan_sent: morn }
    : kind === "read" ? { last_read_sent: morn }
    : { last_wake_sent: morn };
  await rest("/rest/v1/notification_prefs?user_id=eq." + encodeURIComponent(userId), {
    method: "PATCH",
    token: SERVICE,
    body: patch
  });
}

async function dueFromPrefs() {
  const prefsR = await rest("/rest/v1/notification_prefs?enabled=eq.true&select=*", { token: SERVICE });
  if (!prefsR.ok) throw new Error((prefsR.json && (prefsR.json.message || prefsR.json.error)) || ("prefs " + prefsR.status));
  const prefs = Array.isArray(prefsR.json) ? prefsR.json : [];
  if (!prefs.length) return [];
  const subsR = await rest("/rest/v1/push_subscriptions?select=user_id,endpoint,p256dh,auth", { token: SERVICE });
  if (!subsR.ok) throw new Error((subsR.json && (subsR.json.message || subsR.json.error)) || ("subs " + subsR.status));
  const subs = Array.isArray(subsR.json) ? subsR.json : [];
  const byUser = {};
  subs.forEach((s) => {
    if (!s || !s.user_id || !s.endpoint) return;
    (byUser[s.user_id] || (byUser[s.user_id] = [])).push(s);
  });
  const now = new Date();
  const out = [];
  for (const p of prefs) {
    const hits = slotsOf(p, now);
    if (!hits.length) continue;
    const list = byUser[p.user_id] || [];
    if (!list.length) continue;
    for (const hit of hits) {
      await markKind(p.user_id, hit.kind, hit.morn);
      list.forEach((s) => {
        out.push({
          user_id: p.user_id,
          endpoint: s.endpoint,
          p256dh: s.p256dh,
          auth: s.auth,
          kind: hit.kind,
          morning: hit.morn,
          timezone: p.timezone
        });
      });
    }
  }
  return out;
}

async function sendAll(subs, payload) {
  try {
    webpush.setVapidDetails(VAPID_SUBJECT, VAPID_PUBLIC, VAPID_PRIVATE);
  } catch (e) {
    return { sent: 0, failed: (subs || []).length || 1, gone: [], errors: [{ code: 0, msg: "VAPID: " + errText(e) }] };
  }
  const data = JSON.stringify(payload);
  const opts = {
    TTL: 60 * 60,
    headers: { Urgency: "high", Topic: String((payload && payload.tag) || "align") }
  };
  let sent = 0;
  let failed = 0;
  const gone = [];
  const errors = [];
  for (const s of subs || []) {
    if (!s || !s.endpoint || !s.p256dh || !s.auth) { failed++; continue; }
    try {
      await webpush.sendNotification(
        { endpoint: s.endpoint, keys: { p256dh: s.p256dh, auth: s.auth } },
        data,
        opts
      );
      sent++;
    } catch (e) {
      failed++;
      const code = e && (e.statusCode || e.status);
      if (code === 404 || code === 410) gone.push(s.endpoint);
      if (errors.length < 4) errors.push({ code: code || 0, msg: errText(e) });
    }
  }
  return { sent, failed, gone, errors };
}

export default async function handler(req, res) {
  try {
    return await handle(req, res);
  } catch (e) {
    return send(res, 500, { error: String((e && e.message) || e || "sender failed").slice(0, 200) });
  }
}

async function handle(req, res) {
  if (req.method === "OPTIONS") {
    res.statusCode = 200;
    Object.entries(cors).forEach(([k, v]) => res.setHeader(k, v));
    return res.end("ok");
  }
  if (!VAPID_PUBLIC || !VAPID_PRIVATE) return send(res, 500, { error: "VAPID keys missing. Set VAPID_PUBLIC_KEY and VAPID_PRIVATE_KEY on Vercel." });

  const body = readBody(req);
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
    const list = Array.isArray(subs.json) ? subs.json : [];
    if (!list.length) {
      return send(res, 200, { ok: false, sent: 0, n: 0, error: "No push subscription saved. Turn reminders on from the Home Screen." });
    }
    const payload = payloadFor("wake");
    payload.tag = "align-test";
    const results = await sendAll(list, payload);
    if (results.gone && results.gone.length) await dropSubs(results.gone);
    return send(res, 200, {
      ok: results.sent > 0,
      sent: results.sent,
      failed: results.failed,
      n: list.length,
      title: payload.title,
      errors: results.errors,
      error: results.sent > 0 ? undefined : ((results.errors && results.errors[0] && results.errors[0].msg) || "Push did not reach this phone. Turn reminders off and on from the Home Screen.")
    });
  }

  if (req.method !== "POST" && req.method !== "GET") return send(res, 405, { error: "GET or POST" });
  const cronHeader = String(req.headers["x-cron-secret"] || "");
  const bearer = String(req.headers.authorization || "").replace(/^Bearer\s+/i, "");
  if (!CRON || (cronHeader !== CRON && bearer !== CRON)) return send(res, 401, { error: "Unauthorized cron" });
  if (!SERVICE) return send(res, 500, { error: "Set SUPABASE_SERVICE_ROLE_KEY on Vercel." });

  let rows = [];
  let via = "js";
  try {
    rows = await dueFromPrefs();
  } catch (e) {
    via = "rpc";
    const due = await rest("/rest/v1/rpc/align_due_push", {
      method: "POST",
      token: SERVICE,
      body: {}
    });
    if (!due.ok) {
      const msg = (due.json && (due.json.message || due.json.hint || due.json.error)) || ("HTTP " + due.status);
      return send(res, due.status === 404 ? 503 : 500, {
        error: msg,
        js: String((e && e.message) || e).slice(0, 160),
        hint: "Run sql/push-alarms.sql in Supabase → SQL Editor."
      });
    }
    rows = Array.isArray(due.json) ? due.json : [];
  }
  if (!rows.length) return send(res, 200, { ok: true, sent: 0, note: "none due", via });

  let sent = 0;
  let failed = 0;
  const titles = [];
  const errors = [];
  for (const row of rows) {
    const payload = payloadFor(row.kind, row.morning);
    titles.push(payload.title);
    const r = await sendAll([row], payload);
    sent += r.sent;
    failed += r.failed;
    if (r.gone && r.gone.length) await dropSubs(r.gone);
    if (r.sent === 0 && row.user_id) await unmark(row.user_id, row.kind);
    if (r.errors && r.errors.length && errors.length < 6) errors.push(...r.errors);
  }
  return send(res, 200, { ok: true, sent, failed, n: rows.length, titles: titles.slice(0, 4), errors, via });
}

export const config = { maxDuration: 30 };
