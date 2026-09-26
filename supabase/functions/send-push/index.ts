// ALIGN timed / test web-push sender.
// Prefer Vercel /api/cron-push + sql/push-alarms.sql (every 5 min).
// This edge function is optional. Deploy: supabase functions deploy send-push
// Secrets: VAPID_PUBLIC_KEY VAPID_PRIVATE_KEY VAPID_SUBJECT CRON_SECRET
//
// Test from the app (logged-in user JWT):
//   POST { "mode": "test" }
// Cron:
//   POST { "mode": "tick" }   header x-cron-secret

import { createClient } from "npm:@supabase/supabase-js@2";
import webpush from "npm:web-push@3.6.7";

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

function dowOf(iso: string) {
  const [y, m, d] = String(iso).split("-").map(Number);
  return new Date(Date.UTC(y, m - 1, d, 12, 0, 0)).getUTCDay();
}

function pick(bank: string[][][], iso: string) {
  const dow = dowOf(iso);
  const rows = bank[dow] || bank[1];
  const day = Number(String(iso).slice(-2)) || 1;
  const pair = rows[day % rows.length];
  return { title: pair[0], body: pair[1] };
}

function payloadFor(kind: string, morning: string) {
  if (kind === "lights") {
    const n = pick(LIGHTS_NOTES, morning);
    return { title: n.title, body: n.body, tag: "align-lights", url: "./index.html" };
  }
  const n = pick(WAKE_NOTES, morning);
  const body = /^Five minutes/i.test(n.body) ? n.body : "Five minutes. " + n.body;
  return { title: n.title, body, tag: "align-wake", url: "./index.html" };
}

const cors = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type, x-cron-secret",
  "Access-Control-Allow-Methods": "POST, OPTIONS"
};

function json(body: unknown, status = 200) {
  return new Response(JSON.stringify(body), {
    status,
    headers: { ...cors, "Content-Type": "application/json" }
  });
}

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: cors });
  if (req.method !== "POST") return json({ error: "POST only" }, 405);

  const vapidPublic = Deno.env.get("VAPID_PUBLIC_KEY") || "";
  const vapidPrivate = Deno.env.get("VAPID_PRIVATE_KEY") || "";
  const vapidSubject = Deno.env.get("VAPID_SUBJECT") || "mailto:align@localhost";
  const supabaseUrl = Deno.env.get("SUPABASE_URL") || "";
  const serviceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") || "";
  const cronSecret = Deno.env.get("CRON_SECRET") || "";
  const anon = Deno.env.get("SUPABASE_ANON_KEY") || "";

  if (!vapidPublic || !vapidPrivate) return json({ error: "VAPID keys missing" }, 500);

  webpush.setVapidDetails(vapidSubject, vapidPublic, vapidPrivate);

  let body: { mode?: string } = {};
  try { body = await req.json(); } catch { /* empty */ }
  const mode = body.mode === "test" ? "test" : "tick";

  if (mode === "test") {
    const auth = req.headers.get("Authorization") || "";
    const jwt = auth.replace(/^Bearer\s+/i, "");
    if (!jwt) return json({ error: "Sign in first" }, 401);
    const userClient = createClient(supabaseUrl, anon, {
      global: { headers: { Authorization: `Bearer ${jwt}` } }
    });
    const { data: userData, error: userErr } = await userClient.auth.getUser();
    if (userErr || !userData.user) return json({ error: "Invalid session" }, 401);

    const admin = serviceKey ? createClient(supabaseUrl, serviceKey) : userClient;
    const { data: subs } = await admin
      .from("push_subscriptions")
      .select("endpoint, p256dh, auth")
      .eq("user_id", userData.user.id);

    const morning = new Date().toISOString().slice(0, 10);
    const payload = payloadFor("wake", morning);
    payload.tag = "align-test";
    const results = await sendAll(subs || [], JSON.stringify(payload));
    return json({ ok: true, sent: results.sent, failed: results.failed });
  }

  const cronHeader = req.headers.get("x-cron-secret") || "";
  const bearer = (req.headers.get("Authorization") || "").replace(/^Bearer\s+/i, "");
  const allowed = (cronSecret && cronHeader === cronSecret) || (serviceKey && bearer === serviceKey);
  if (!allowed) return json({ error: "Unauthorized cron" }, 401);

  const admin = createClient(supabaseUrl, serviceKey || anon);
  const { data: rows, error } = await admin.rpc("align_due_push");
  if (error) return json({ error: error.message }, 500);
  const list = rows || [];
  if (!list.length) return json({ ok: true, sent: 0, note: "none due" });

  let sent = 0;
  let failed = 0;
  for (const row of list) {
    const payload = payloadFor(row.kind, row.morning);
    const r = await sendAll([row], JSON.stringify(payload));
    sent += r.sent;
    failed += r.failed;
  }
  return json({ ok: true, sent, failed, n: list.length });
});

async function sendAll(
  subs: Array<{ endpoint: string; p256dh: string; auth: string }>,
  payload: string
) {
  let sent = 0;
  let failed = 0;
  for (const s of subs) {
    try {
      await webpush.sendNotification(
        { endpoint: s.endpoint, keys: { p256dh: s.p256dh, auth: s.auth } },
        payload
      );
      sent++;
    } catch {
      failed++;
    }
  }
  return { sent, failed };
}
