# ALIGN — go live

Frontend on **Vercel** via **GitHub**. Backend stays on **Supabase**.

You already have a Supabase project:

- URL: `https://sqwwjrddpjkenkhpyntg.supabase.co`
- Dashboard: [sqwwjrddpjkenkhpyntg](https://supabase.com/dashboard/project/sqwwjrddpjkenkhpyntg)

The anon key is already in `config.js`. Never put the **service role** key in the app.

---

## What talks to what

| Piece | Where it lives |
| --- | --- |
| The app (HTML/CSS/JS, PWA) | GitHub → Vercel |
| Accounts, workouts, mornings, books metadata | Supabase database |
| PDF files | Supabase Storage bucket `reading` |
| Timed reminders (5 min before rise, 10 min before lights) | Vercel `/api/cron-push` + `sql/push-alarms.sql` |
| Server-side AI (optional) | Supabase Edge Function `ai` |
| Gemini / Groq keys for in-app AI | **Vercel env vars** `GEMINI_API_KEY` / `GROQ_API_KEY` (route `/api/ai`) |

No Node build. Vercel just serves this folder.

---

## 1. Put the app on GitHub

On your computer, in this project folder:

```bash
git init
git add .
git commit -m "ALIGN — morning OS"
```

Then on GitHub: **New repository** (private is fine). Do not tick “add a README”. Copy the remote URL and:

```bash
git remote add origin https://github.com/YOUR_USER/align.git
git branch -M main
git push -u origin main
```

---

## 2. Host the frontend on Vercel

1. Go to [vercel.com](https://vercel.com) and sign in with **GitHub**.
2. **Add New… → Project** → import the `align` repo.
3. Settings:
   - **Framework Preset:** Other
   - **Root Directory:** `.` (the folder with `index.html`)
   - **Build Command:** leave empty
   - **Output Directory:** leave empty
4. **Deploy**.

You get a URL like `https://align-xxxxx.vercel.app`.

Open it. You should see ALIGN. Accounts will work after the SQL and Auth steps below.

**Custom domain (optional):** Vercel → Project → Settings → Domains.

---

## 3. Point Supabase Auth at Vercel

Dashboard → **Authentication** → **URL Configuration**:

1. **Site URL:** `https://YOUR-APP.vercel.app`  
   (your real Vercel URL, no trailing slash)
2. **Redirect URLs** — add all of these:

```
https://YOUR-APP.vercel.app/**
https://YOUR-APP.vercel.app/
http://localhost:8080/**
http://localhost:8080/
```

3. **Authentication → Providers → Email:** on.  
   For easier testing, turn **Confirm email** off.

Without the Vercel URL in Redirect URLs, magic links and sign-up will bounce.

---

## 4. Run the SQL (backend tables)

Dashboard → **SQL Editor** → New query. Open **`sql/align.sql`**, paste the whole file, **Run**. That is the only script. It is safe to run again (includes table grants so the app can write).

It creates accounts, mornings, Word, plans, books, sound, Storage buckets `reading` and `sounds`, and the public sound library.

If a policy “already exists” warning appears, ignore it. Real errors (red) mean stop and read the message.

Confirm after Run:

- **Table Editor** shows `mornings`, `app_state`, `books`, `sounds`
- **Storage** shows private buckets `reading` and `sounds`

---

## 5. Use the app

1. Open the Vercel URL on your phone.
2. **You → Create account** (or sign in). Confirm-email can be off in Auth → Providers → Email so you get a session immediately. While signed in, ALIGN saves to Supabase on its own (and retries if you were offline). Check Table Editor as the project owner.
3. **You → Reminders** — 5 minutes before rise (3:55 Sunday / 4:55 else) and 10 minutes before lights out (11:50 Saturday night / 12:50 AM other nights). Allow notifications. Stay signed in so they still arrive when ALIGN is closed.
4. **AI keys on Vercel** (not on the phone). In the Vercel project: **Settings → Environment Variables**. Add:
   - `GEMINI_API_KEY` from [Google AI Studio](https://aistudio.google.com/apikey)
   - `GROQ_API_KEY` from [Groq Console](https://console.groq.com/keys)
   
   Environment: Production and Preview. Then **Redeploy**. One key is enough; two gives failover. Open **You → Intelligence → Test connection**.
5. **Word → Books** — upload a PDF. After the first save it reads offline.
6. **You → Sound** — play the open library (public-domain field recordings), a station, or upload audio from your profile to your account.
7. iPhone: Share → **Add to Home Screen**. Android: the install banner, or Chrome → Add to Home screen.

---

## 6. Timed reminders (closed-app push)

The phone toggle plus **Send a test** work immediately. Closed-app delivery needs one SQL run so Postgres can ping Vercel every 5 minutes:

Dashboard → **SQL Editor** → paste **`sql/push-alarms.sql`** → **Run**.

Enable **pg_cron** and **pg_net** first if the notice says they are missing (Dashboard → Database → Extensions).

Then **You → Reminders** on, while signed in, and allow notifications. iPhone: Add to Home Screen.

Vercel `/api/cron-push` sends the two reminders in the phone’s timezone (default Africa/Lagos):

- 5 minutes before rise — Sunday 3:55, Mon–Sat 4:55
- 10 minutes before lights out — Saturday 23:50 (midnight), other nights 00:50 (1:00)

Copy is about the whole morning, not a gym ping. The old `send-push` edge function is optional.

---

## 6b. Optional — server AI edge function

You do **not** need this if keys are already on Vercel (`/api/ai`).

---

## 7. Local preview (optional)

From this folder:

```bash
python3 -m http.server 8080
```

Open `http://localhost:8080`. Same Supabase backend.

---

## Checklist

- [ ] Code on GitHub
- [ ] Vercel deploy succeeds (ALIGN splash / Today)
- [ ] Auth Site URL + Redirect URLs include the Vercel domain
- [ ] `sql/align.sql` run (tables + Storage buckets `reading` and `sounds`)
- [ ] Create account from the live URL
- [ ] `GEMINI_API_KEY` and/or `GROQ_API_KEY` set in Vercel, then redeploy
- [ ] You → Intelligence → Test connection
- [ ] You → Sound plays a station
- [ ] Add to Home Screen on the phone

That’s the whole setup. GitHub holds the app. Vercel serves it. Supabase is the backend.
