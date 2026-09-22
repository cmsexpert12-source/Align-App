// ALIGN daily / test web-push sender.
// Deploy:  supabase functions deploy send-push
// Secrets: supabase secrets set VAPID_PUBLIC_KEY=... VAPID_PRIVATE_KEY=... VAPID_SUBJECT=mailto:you@domain.com
//
// Cron (Dashboard → Edge Functions → send-push → Schedules, or pg_net):
//   POST /functions/v1/send-push   { "mode": "daily" }
//   Authorization: Bearer <service_role>   OR header x-cron-secret
//
// Test from the app (logged-in user JWT):
//   POST { "mode": "test" }

import { createClient } from "npm:@supabase/supabase-js@2";
import webpush from "npm:web-push@3.6.7";

const DAYS = [
  { id: "sun-push", name: "Push Engine", minutes: 28 },
  { id: "mon-core", name: "Core & Hips", minutes: 26 },
  { id: "tue-pull", name: "Pull & Posture", minutes: 28 },
  { id: "wed-legs", name: "Legs Found", minutes: 30 },
  { id: "thu-core", name: "Core Control", minutes: 24 },
  { id: "fri-upper", name: "Upper Mix", minutes: 28 },
  { id: "sat-recover", name: "Recover & Move", minutes: 16 }
];

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

function todayWorkout() {
  const dow = new Date().getDay();
  return DAYS[dow];
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

  if (!vapidPublic || !vapidPrivate) return json({ error: "VAPID keys missing" }, 500);

  webpush.setVapidDetails(vapidSubject, vapidPublic, vapidPrivate);

  let body: { mode?: string } = {};
  try { body = await req.json(); } catch { /* empty */ }
  const mode = body.mode === "test" ? "test" : "daily";

  const admin = createClient(supabaseUrl, serviceKey);

  if (mode === "test") {
    const auth = req.headers.get("Authorization") || "";
    const jwt = auth.replace(/^Bearer\s+/i, "");
    if (!jwt) return json({ error: "Sign in first" }, 401);
    const userClient = createClient(supabaseUrl, Deno.env.get("SUPABASE_ANON_KEY") || "", {
      global: { headers: { Authorization: `Bearer ${jwt}` } }
    });
    const { data: userData, error: userErr } = await userClient.auth.getUser();
    if (userErr || !userData.user) return json({ error: "Invalid session" }, 401);

    const { data: subs } = await admin
      .from("push_subscriptions")
      .select("endpoint, p256dh, auth")
      .eq("user_id", userData.user.id);

    const day = todayWorkout();
    const payload = JSON.stringify({
      title: "ALIGN",
      body: `Test ping. Today is ${day.name} · ${day.minutes} min.`,
      tag: "align-test"
    });
    const results = await sendAll(subs || [], payload);
    return json({ ok: true, sent: results.sent, failed: results.failed });
  }

  const cronHeader = req.headers.get("x-cron-secret") || "";
  const bearer = (req.headers.get("Authorization") || "").replace(/^Bearer\s+/i, "");
  const allowed = (cronSecret && cronHeader === cronSecret) || (serviceKey && bearer === serviceKey);
  if (!allowed) return json({ error: "Unauthorized cron" }, 401);

  const now = new Date();
  const hour = now.getUTCHours(); // pair with a timezone-aware cron if you need local time

  const { data: prefs, error: prefErr } = await admin
    .from("notification_prefs")
    .select("user_id, reminder_hour, reminder_minute")
    .eq("enabled", true);

  if (prefErr) return json({ error: prefErr.message }, 500);

  const dueIds = (prefs || [])
    .filter((p) => p.reminder_hour === hour)
    .map((p) => p.user_id);

  if (!dueIds.length) return json({ ok: true, sent: 0, note: "no users due this hour" });

  const { data: subs } = await admin
    .from("push_subscriptions")
    .select("endpoint, p256dh, auth, user_id")
    .in("user_id", dueIds);

  const day = todayWorkout();
  const payload = JSON.stringify({
    title: "ALIGN · " + day.name,
    body: `It's training time. ${day.minutes} minutes. Open the app and start.`,
    tag: "align-daily"
  });

  const results = await sendAll(subs || [], payload);
  return json({ ok: true, ...results, workout: day.name });
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
