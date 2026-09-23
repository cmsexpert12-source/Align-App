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
  const cronSecret = Deno.env.get("CRON_SECRET") || "align-cron-v1-sqwwjrdd";
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
  const { data: rows, error } = await admin.rpc("align_due_push", { _secret: cronSecret });
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
