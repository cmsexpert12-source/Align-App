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
| Wake-up push (optional) | Supabase Edge Function `send-push` |
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

Dashboard → **SQL Editor** → New query. Open **`sql/align.sql`**, paste the whole file, **Run**. That is the only script. It is safe to run again.

It creates accounts, mornings, Word, plans, books, sound, Storage buckets `reading` and `sounds`, and the public sound library.

If a policy “already exists” warning appears, ignore it. Real errors (red) mean stop and read the message.

Confirm after Run:

- **Table Editor** shows `mornings`, `app_state`, `books`, `sounds`
- **Storage** shows private buckets `reading` and `sounds`

---

## 5. Use the app

1. Open the Vercel URL on your phone.
2. **You → Create account** (or sign in).
3. **You → Wake nudge** if you want the 4am / 5am call (needs notifications allowed).
4. **AI keys on Vercel** (not on the phone). In the Vercel project: **Settings → Environment Variables**. Add:
   - `GEMINI_API_KEY` from [Google AI Studio](https://aistudio.google.com/apikey)
   - `GROQ_API_KEY` from [Groq Console](https://console.groq.com/keys)
   
   Environment: Production and Preview. Then **Redeploy**. One key is enough; two gives failover. Open **You → Intelligence → Test connection**.
5. **Word → Books** — upload a PDF. After the first save it reads offline.
6. **You → Sound** — play the open library (public-domain field recordings), a station, or upload audio from your profile to your account.
7. iPhone: Share → **Add to Home Screen**. Android: the install banner, or Chrome → Add to Home screen.

---

## 6. Optional — edge functions (push + server AI)

Only if you want server-sent wake-ups, or AI keys kept off the phone.

Install the [Supabase CLI](https://supabase.com/docs/guides/cli) and log in:

```bash
npm i -g supabase
supabase login
supabase link --project-ref sqwwjrddpjkenkhpyntg
```

### Push (`send-push`)

Secrets from `supabase/.env.example` (do not put these in Vercel or `config.js`):

```bash
supabase secrets set VAPID_PUBLIC_KEY="BHQs0Wo3QmVAFpW5a7raJqABOk98BLfrBH_4eRUOAUgIHxIybOFlotKQlwLsST-JYfHtx7klDmNNJMchJpcUYBo"
supabase secrets set VAPID_PRIVATE_KEY="YOUR_PRIVATE_FROM_ENV_EXAMPLE"
supabase secrets set VAPID_SUBJECT="mailto:you@yourdomain.com"
supabase functions deploy send-push
```

Then Dashboard → Edge Functions → `send-push` → **Schedules**: POST hourly with `{ "mode": "daily" }`.

The app still works without this. The wake toggle on the phone uses a local notification if the function isn’t deployed.

### Server AI (`ai`)

```bash
supabase secrets set GEMINI_API_KEY="your_gemini_key"
supabase secrets set GROQ_API_KEY="your_groq_key"
supabase functions deploy ai
```

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
