/* ALIGN — Supabase client, auth, sync, push subscriptions */
window.AlignDB = (() => {
  const LS_CFG = "align-supabase-cfg";
  const LS_PREFS = "align-notif-prefs";

  const readCfg = () => {
    try {
      const saved = JSON.parse(localStorage.getItem(LS_CFG) || "null");
      if (saved && saved.url && saved.anonKey) return saved;
    } catch { /* ignore */ }
    const c = window.ALIGN_CONFIG || {};
    return { url: c.supabaseUrl || "", anonKey: c.supabaseAnonKey || "" };
  };

  const writeCfg = (url, anonKey) => {
    localStorage.setItem(LS_CFG, JSON.stringify({ url: url.trim(), anonKey: anonKey.trim() }));
  };

  const configured = () => {
    const c = readCfg();
    return !!(c.url && c.anonKey);
  };

  let _client = null;
  let _cfgStamp = "";
  let cachedToken = "";
  let cachedUid = "";
  let cachedAt = 0;
  let lastErr = "";
  let lastOkAt = 0;
  let flushing = false;
  let dirty = false;
  let flushTimer = null;
  let retryTimer = null;
  let backoffMs = 2000;
  let hydrated = false;
  const statusListeners = [];

  const client = () => {
    if (!configured()) return null;
    if (!window.supabase || !window.supabase.createClient) return null;
    const c = readCfg();
    const stamp = c.url + c.anonKey;
    if (!_client || _cfgStamp !== stamp) {
      _client = window.supabase.createClient(c.url, c.anonKey, {
        auth: { persistSession: true, autoRefreshToken: true, detectSessionInUrl: true }
      });
      _cfgStamp = stamp;
      try {
        _client.auth.onAuthStateChange((event, sess) => {
          if (sess && sess.access_token && sess.user) {
            cachedToken = sess.access_token;
            cachedUid = sess.user.id;
            cachedAt = Date.now();
            if (lastErr === "Sign in to save to the cloud") lastErr = "";
            if (hydrated && (event === "SIGNED_IN" || event === "INITIAL_SESSION" || event === "TOKEN_REFRESHED")) {
              scheduleFlush(400);
            }
          } else if (event === "SIGNED_OUT") {
            cachedToken = "";
            cachedUid = "";
            cachedAt = 0;
          }
          emitStatus();
        });
      } catch { /* auth listener optional */ }
    }
    return _client;
  };

  const ok = (data) => ({ ok: true, data, error: null });
  const fail = (error) => ({ ok: false, data: null, error: error && error.message ? error.message : String(error || "Unknown error") });

  const session = async () => {
    const sb = client();
    if (!sb) return ok(null);
    const { data, error } = await sb.auth.getSession();
    if (error) return fail(error);
    return ok(data.session || null);
  };

  const onAuth = (fn) => {
    const sb = client();
    if (!sb) return () => {};
    const { data } = sb.auth.onAuthStateChange((_event, sess) => fn(sess));
    return () => data.subscription.unsubscribe();
  };

  const signUp = async (email, password, displayName) => {
    const sb = client();
    if (!sb) return fail("Supabase is not connected.");
    const { data, error } = await sb.auth.signUp({
      email: email.trim(),
      password,
      options: { data: { display_name: displayName || "" } }
    });
    if (error) return fail(error);
    return ok(data);
  };

  const signIn = async (email, password) => {
    const sb = client();
    if (!sb) return fail("Supabase is not connected.");
    const { data, error } = await sb.auth.signInWithPassword({ email: email.trim(), password });
    if (error) return fail(error);
    return ok(data);
  };

  const magicLink = async (email) => {
    const sb = client();
    if (!sb) return fail("Supabase is not connected.");
    const redirectTo = window.location.origin + window.location.pathname;
    const { data, error } = await sb.auth.signInWithOtp({
      email: email.trim(),
      options: { emailRedirectTo: redirectTo }
    });
    if (error) return fail(error);
    return ok(data);
  };

  const resetPassword = async (email) => {
    const sb = client();
    if (!sb) return fail("Supabase is not connected.");
    const redirectTo = window.location.origin + window.location.pathname;
    const { data, error } = await sb.auth.resetPasswordForEmail(email.trim(), { redirectTo });
    if (error) return fail(error);
    return ok(data);
  };

  const signOut = async () => {
    const sb = client();
    if (!sb) return ok(true);
    const { error } = await sb.auth.signOut();
    if (error) return fail(error);
    return ok(true);
  };

  const upsertProfile = async (displayName) =>
    queueAndFlush("profile", "profile", { display_name: displayName || "" }, { delay: 0 });

  const fetchProfile = async () => {
    const sb = client();
    if (!sb) return ok(null);
    const userId = await uidOf();
    if (!userId) return ok(null);
    const { data, error } = await sb.from("profiles").select("*").eq("id", userId).maybeSingle();
    if (error) return fail(error);
    return ok(data);
  };

  const saveWorkout = async (row, opts) =>
    queueAndFlush("workout", (row.date || "") + "|" + (row.dayId || ""), row, opts || { delay: 0 });

  const fetchWorkouts = async () => {
    const sb = client();
    if (!sb) return ok([]);
    const userId = await uidOf();
    if (!userId) return ok([]);
    const { data, error } = await sb
      .from("workouts")
      .select("date, day_id, minutes, completed, total, log, created_at")
      .eq("user_id", userId)
      .order("date", { ascending: true });
    if (error) return fail(error);
    const mapped = (data || []).map((r) => ({
      date: r.date,
      dayId: r.day_id,
      minutes: r.minutes,
      completed: r.completed,
      total: r.total,
      log: r.log || []
    }));
    return ok(mapped);
  };

  const savePushSub = async (sub) => {
    const sb = client();
    if (!sb) return fail("Not connected");
    const userId = await uidOf();
    if (!userId) return fail("Not signed in");
    const json = sub.toJSON();
    const { error } = await sb.from("push_subscriptions").upsert({
      user_id: userId,
      endpoint: json.endpoint,
      p256dh: json.keys.p256dh,
      auth: json.keys.auth,
      user_agent: navigator.userAgent
    }, { onConflict: "endpoint" });
    if (error) return fail(error);
    return ok(true);
  };

  const deletePushSub = async (endpoint) => {
    const sb = client();
    if (!sb) return ok(true);
    const { error } = await sb.from("push_subscriptions").delete().eq("endpoint", endpoint);
    if (error) return fail(error);
    return ok(true);
  };

  const savePrefs = async (prefs) => {
    const next = Object.assign({}, prefs || {});
    if (!next.timezone) {
      try { next.timezone = Intl.DateTimeFormat().resolvedOptions().timeZone || "Africa/Lagos"; }
      catch { next.timezone = "Africa/Lagos"; }
    }
    localStorage.setItem(LS_PREFS, JSON.stringify(next));
    queueAndFlush("prefs", "prefs", next, { delay: 0 });
    return ok(next);
  };

  const fetchPrefs = async () => {
    const local = (() => {
      try { return JSON.parse(localStorage.getItem(LS_PREFS) || "null"); } catch { return null; }
    })() || { enabled: false, hour: 5, minute: 0 };
    const sb = client();
    if (!sb) return ok(local);
    const userId = await uidOf();
    if (!userId) return ok(local);
    const { data, error } = await sb.from("notification_prefs").select("*").eq("user_id", userId).maybeSingle();
    if (error) return fail(error);
    if (!data) return ok(local);
    const prefs = {
      enabled: data.enabled,
      hour: data.reminder_hour,
      minute: data.reminder_minute,
      timezone: data.timezone || local.timezone || "Africa/Lagos"
    };
    localStorage.setItem(LS_PREFS, JSON.stringify(prefs));
    return ok(prefs);
  };

  const LS_OUT = "align-outbox";
  const LS_OK = "align-sync-ok";
  try { lastOkAt = Number(localStorage.getItem(LS_OK) || 0) || 0; } catch { /* ignore */ }

  const readJSON = (k, fb) => {
    try { return JSON.parse(localStorage.getItem(k) || "null") || fb; } catch { return fb; }
  };

  const sessionFromStorage = () => {
    try {
      for (let i = 0; i < localStorage.length; i++) {
        const k = localStorage.key(i);
        if (!k || k.indexOf("sb-") !== 0 || k.indexOf("auth-token") === -1) continue;
        const raw = JSON.parse(localStorage.getItem(k) || "null");
        if (!raw) continue;
        const sess = raw.currentSession || raw.session || raw;
        if (sess && sess.access_token && sess.user && sess.user.id) return sess;
      }
    } catch { /* ignore */ }
    return null;
  };

  const status = () => ({
    pending: pendingCount(),
    error: lastErr,
    lastOk: lastOkAt,
    signed: !!(cachedUid || (sessionFromStorage() && sessionFromStorage().user)),
    syncing: flushing
  });

  const emitStatus = () => {
    const st = status();
    statusListeners.forEach((fn) => { try { fn(st); } catch { /* ignore */ } });
  };

  const onStatus = (fn) => {
    if (typeof fn === "function") statusListeners.push(fn);
    return () => {
      const i = statusListeners.indexOf(fn);
      if (i >= 0) statusListeners.splice(i, 1);
    };
  };

  const setErr = (msg) => { lastErr = msg || ""; emitStatus(); };
  const setOk = () => {
    lastErr = "";
    lastOkAt = Date.now();
    try { localStorage.setItem(LS_OK, String(lastOkAt)); } catch { /* ignore */ }
    emitStatus();
  };

  const withTimeout = (promise, ms, label) => new Promise((resolve, reject) => {
    const timer = setTimeout(() => reject(new Error(label || "timeout")), ms);
    Promise.resolve(promise).then(
      (v) => { clearTimeout(timer); resolve(v); },
      (e) => { clearTimeout(timer); reject(e); }
    );
  });

  const refreshAuth = async (force) => {
    if (!force && cachedToken && cachedUid && (Date.now() - cachedAt) < 25000) {
      return { token: cachedToken, uid: cachedUid };
    }
    const stored = sessionFromStorage();
    if (stored && stored.access_token && stored.user) {
      const exp = Number(stored.expires_at || 0) * 1000;
      if (!exp || exp > Date.now() + 20000) {
        cachedToken = stored.access_token;
        cachedUid = stored.user.id;
        cachedAt = Date.now();
        if (!force) return { token: cachedToken, uid: cachedUid };
      }
    }
    const sb = client();
    if (sb) {
      try {
        const { data } = await withTimeout(sb.auth.getSession(), 8000, "session timeout");
        const sess = data && data.session;
        if (sess && sess.access_token && sess.user) {
          cachedToken = sess.access_token;
          cachedUid = sess.user.id;
          cachedAt = Date.now();
        }
      } catch { /* keep cache */ }
    }
    return { token: cachedToken, uid: cachedUid };
  };

  const uidOf = async () => (await refreshAuth(false)).uid || null;
  const authToken = async () => (await refreshAuth(false)).token || "";

  const readOut = () => {
    try { return JSON.parse(localStorage.getItem(LS_OUT) || "[]") || []; } catch { return []; }
  };
  const writeOut = (arr) => {
    try { localStorage.setItem(LS_OUT, JSON.stringify((arr || []).slice(-100))); } catch { /* quota */ }
  };
  const pendingCount = () => readOut().length;
  const missingTable = (err) =>
    /does not exist|schema cache|Could not find the table/i.test((err && err.message) || String(err || ""));

  const requestBgSync = () => {
    try {
      if (navigator.serviceWorker && navigator.serviceWorker.ready) {
        navigator.serviceWorker.ready.then((reg) => {
          if (reg.sync) reg.sync.register("align-sync").catch(() => {});
        }).catch(() => {});
      }
    } catch { /* unsupported */ }
  };

  const enqueue = (kind, key, payload) => {
    const q = readOut().filter((x) => !(x.kind === kind && x.key === key));
    q.push({ kind, key, payload, t: Date.now() });
    writeOut(q);
  };

  const scheduleFlush = (ms) => {
    clearTimeout(flushTimer);
    flushTimer = setTimeout(() => { flush(); }, Math.max(0, ms == null ? 280 : ms));
  };

  const scheduleRetry = (ms) => {
    clearTimeout(retryTimer);
    retryTimer = setTimeout(() => { flush(); }, Math.max(800, ms || 2000));
  };

  const retryable = (msg) =>
    /network|failed to fetch|timeout|offline|HTTP 429|HTTP 5|Load failed|abort|Failed to fetch|TypeError/i.test(String(msg || ""));

  const restSelect = async (table, query) => {
    const c = readCfg();
    if (!c.url || !c.anonKey) return [];
    const auth = await refreshAuth(false);
    if (!auth.token) return [];
    const base = String(c.url).replace(/\/$/, "");
    try {
      const r = await fetch(base + "/rest/v1/" + table + "?" + query, {
        headers: {
          apikey: c.anonKey,
          Authorization: "Bearer " + auth.token,
          Accept: "application/json"
        }
      });
      if (!r.ok) return [];
      const data = await r.json().catch(() => []);
      return Array.isArray(data) ? data : [];
    } catch {
      return [];
    }
  };

  const restUpsert = async (table, row, conflict) => {
    const c = readCfg();
    if (!c.url || !c.anonKey) return { message: "Supabase is not configured" };
    const auth = await refreshAuth(false);
    if (!auth.token) return { message: "Sign in to save to the cloud" };
    const base = String(c.url).replace(/\/$/, "");
    const qs = conflict ? ("?on_conflict=" + String(conflict).replace(/\s+/g, "")) : "";
    const once = async (tok) => {
      const ctrl = typeof AbortController !== "undefined" ? new AbortController() : null;
      const timer = setTimeout(() => { try { if (ctrl) ctrl.abort(); } catch { /* ignore */ } }, 12000);
      try {
        const r = await fetch(base + "/rest/v1/" + table + qs, {
          method: "POST",
          headers: {
            apikey: c.anonKey,
            Authorization: "Bearer " + tok,
            "Content-Type": "application/json",
            Accept: "application/json",
            Prefer: "resolution=merge-duplicates,return=minimal"
          },
          body: JSON.stringify(row),
          signal: ctrl ? ctrl.signal : undefined
        });
        clearTimeout(timer);
        return r;
      } catch (e) {
        clearTimeout(timer);
        const aborted = e && (e.name === "AbortError" || /abort/i.test(e.message || ""));
        return { _err: { message: aborted ? "timeout" : ((e && e.message) || "Network failed") } };
      }
    };
    let r = await once(auth.token);
    if (r && r._err) return r._err;
    if (r && r.status === 401) {
      const fresh = await refreshAuth(true);
      if (fresh.token && fresh.token !== auth.token) {
        r = await once(fresh.token);
        if (r && r._err) return r._err;
      }
    }
    if (!r || r._err) return (r && r._err) || { message: "Network failed" };
    if (r.status === 200 || r.status === 201 || r.status === 204) return null;
    let msg = "HTTP " + r.status;
    try {
      const j = await r.json();
      msg = (j && (j.message || j.error_description || j.error || j.hint)) || msg;
      if (r.status >= 400 && r.status !== 401) msg = msg;
    } catch { /* keep msg */ }
    if (r.status === 401) return { message: "Sign in to save to the cloud" };
    return { message: table + ": " + String(msg) };
  };

  const restDelete = async (table, query) => {
    const c = readCfg();
    if (!c.url || !c.anonKey) return { message: "Supabase is not configured" };
    const auth = await refreshAuth(false);
    if (!auth.token) return { message: "Sign in to save to the cloud" };
    const base = String(c.url).replace(/\/$/, "");
    const ctrl = typeof AbortController !== "undefined" ? new AbortController() : null;
    const timer = setTimeout(() => { try { if (ctrl) ctrl.abort(); } catch { /* ignore */ } }, 12000);
    try {
      const r = await fetch(base + "/rest/v1/" + table + "?" + query, {
        method: "DELETE",
        headers: {
          apikey: c.anonKey,
          Authorization: "Bearer " + auth.token,
          Prefer: "return=minimal"
        },
        signal: ctrl ? ctrl.signal : undefined
      });
      clearTimeout(timer);
      if (r.status === 200 || r.status === 204) return null;
      let msg = "HTTP " + r.status;
      try {
        const j = await r.json();
        msg = (j && (j.message || j.error || j.hint)) || msg;
      } catch { /* keep */ }
      return { message: table + ": " + msg };
    } catch (e) {
      clearTimeout(timer);
      return { message: (e && e.message) || "Network failed" };
    }
  };

  const clientUpsert = async (table, row, conflict) => {
    const sb = client();
    if (!sb) return restUpsert(table, row, conflict);
    try {
      const opts = conflict ? { onConflict: conflict } : {};
      const { error } = await withTimeout(sb.from(table).upsert(row, opts), 12000, "write timeout");
      if (!error) return null;
      const restErr = await restUpsert(table, row, conflict);
      if (!restErr) return null;
      return { message: table + ": " + (error.message || restErr.message) };
    } catch (e) {
      const restErr = await restUpsert(table, row, conflict);
      if (!restErr) return null;
      return { message: table + ": " + ((e && e.message) || restErr.message) };
    }
  };

  const pushRow = async (item) => {
    const userId = (await refreshAuth(false)).uid;
    if (!userId) return { keep: true, error: "Sign in to save to the cloud" };
    const now = new Date().toISOString();
    const p = item.payload || {};
    let err = null;
    if (item.kind === "morning") {
      let remoteSteps = {};
      try {
        const got = await restSelect("mornings", "select=steps&date=eq." + encodeURIComponent(p.iso));
        remoteSteps = (got && got[0] && got[0].steps) || {};
      } catch { remoteSteps = {}; }
      const localSteps = p.steps || {};
      const merged = Object.assign({}, remoteSteps, localSteps);
      Object.keys(merged).forEach((k) => { merged[k] = !!(remoteSteps[k] || localSteps[k]); });
      err = await restUpsert("mornings", {
        user_id: userId, date: p.iso, steps: merged, updated_at: now
      }, "user_id,date");
    } else if (item.kind === "plan") {
      err = await restUpsert("day_plans", {
        user_id: userId, date: p.iso, payload: p.plan || {}, updated_at: now
      }, "user_id,date");
    } else if (item.kind === "journal") {
      err = await restUpsert("journals", {
        user_id: userId, date: p.iso, payload: p.payload || {}, updated_at: now
      }, "user_id,date");
    } else if (item.kind === "note") {
      if (!p.id) err = null;
      else {
        err = await restUpsert("notes", {
          user_id: userId,
          id: p.id,
          date: p.date,
          title: p.title || "",
          body: p.body || "",
          created_at: p.created_at || now,
          updated_at: now
        }, "user_id,id");
        if (err && missingTable(err)) err = null;
      }
    } else if (item.kind === "note-del") {
      err = await restDelete("notes", "id=eq." + encodeURIComponent(p.id) + "&user_id=eq." + userId);
      if (err && missingTable(err)) err = null;
    } else if (item.kind === "bible") {
      let book = p.book || "Genesis";
      let chapter = p.chapter || 1;
      let log = Array.isArray(p.log) ? p.log.slice() : [];
      try {
        const got = await restSelect("bible_state", "select=book,chapter,log");
        const remote = got && got[0];
        if (remote) {
          const rlog = Array.isArray(remote.log) ? remote.log : [];
          const seen = new Set(log.map((x) => String((x && x.id) || "") + "|" + String((x && x.date) || "")));
          rlog.forEach((x) => {
            const k = String((x && x.id) || "") + "|" + String((x && x.date) || "");
            if (!seen.has(k)) { log.push(x); seen.add(k); }
          });
          if (rlog.length > (p.log || []).length) {
            book = remote.book || book;
            chapter = remote.chapter || chapter;
          }
        }
      } catch { /* keep local */ }
      err = await restUpsert("bible_state", {
        user_id: userId,
        book,
        chapter,
        log,
        updated_at: now
      }, "user_id");
    } else if (item.kind === "scripture") {
      err = await restUpsert("app_state", {
        user_id: userId, scripture: p || {}, updated_at: now
      }, "user_id");
    } else if (item.kind === "prefs") {
      const row = {
        user_id: userId,
        enabled: !!p.enabled,
        reminder_hour: p.hour != null ? p.hour : 5,
        reminder_minute: p.minute != null ? p.minute : 0,
        timezone: p.timezone || "Africa/Lagos",
        updated_at: now
      };
      err = await restUpsert("notification_prefs", row, "user_id");
      if (err && /timezone|schema cache|column/i.test(err.message || "")) {
        delete row.timezone;
        err = await restUpsert("notification_prefs", row, "user_id");
      }
    } else if (item.kind === "workout") {
      err = await restUpsert("workouts", {
        user_id: userId,
        date: p.date,
        day_id: p.dayId,
        minutes: p.minutes,
        completed: p.completed,
        total: p.total,
        log: p.log || []
      }, "user_id,date,day_id");
      if (err && /on conflict|unique|constraint|no unique/i.test(err.message || "")) {
        const sb = client();
        if (sb) {
          try {
            const ins = await sb.from("workouts").insert({
              user_id: userId,
              date: p.date,
              day_id: p.dayId,
              minutes: p.minutes,
              completed: p.completed,
              total: p.total,
              log: p.log || []
            });
            err = ins.error ? { message: ins.error.message } : null;
          } catch (e) {
            err = { message: (e && e.message) || "Workout insert failed" };
          }
        }
      }
    } else {
      return { keep: false };
    }
    if (!err) return { keep: false };
    return { keep: true, error: err.message };
  };

  const flush = async () => {
    if (flushing) { dirty = true; return ok(true); }
    const q = readOut();
    if (!q.length) return ok(true);
    if (!window.supabase || !window.supabase.createClient) {
      setErr("Database library did not load");
      scheduleRetry(backoffMs);
      return fail(lastErr);
    }
    if (!configured()) {
      setErr("Supabase is not configured");
      return fail(lastErr);
    }
    client();
    const auth = await refreshAuth(false);
    if (!auth.token || !auth.uid) {
      setErr("Sign in to save to the cloud");
      return fail(lastErr);
    }
    if (!hydrated) {
      scheduleFlush(1200);
      return ok(true);
    }
    flushing = true;
    dirty = false;
    emitStatus();
    const left = [];
    let err = null;
    for (let i = 0; i < q.length; i += 4) {
      const chunk = q.slice(i, i + 4);
      const results = await Promise.all(chunk.map(async (item) => {
        try {
          return { item, res: await pushRow(item) };
        } catch (e) {
          return { item, res: { keep: true, error: e && e.message ? e.message : String(e) } };
        }
      }));
      results.forEach(({ item, res }) => {
        if (res.keep) {
          left.push(item);
          if (res.error) err = res.error;
        }
      });
    }
    writeOut(left);
    flushing = false;
    if (dirty) scheduleFlush(60);
    if (left.length) {
      setErr(err || "Waiting to sync");
      if (err !== "Sign in to save to the cloud") {
        scheduleRetry(backoffMs);
        backoffMs = Math.min(Math.round(backoffMs * 1.8), 60000);
      }
      return fail(lastErr);
    }
    backoffMs = 2000;
    setOk();
    return ok(true);
  };

  const queueAndFlush = (kind, key, payload, opts) => {
    enqueue(kind, key, payload);
    requestBgSync();
    emitStatus();
    const o = opts === true ? { now: true } : (opts || {});
    if (o.now) return flush();
    scheduleFlush(o.delay != null ? o.delay : 280);
    return Promise.resolve(ok(true));
  };

  const isoDays = (n) => {
    const out = [];
    const now = new Date();
    for (let i = 0; i < n; i++) {
      const x = new Date(now.getFullYear(), now.getMonth(), now.getDate() - i);
      const m = String(x.getMonth() + 1).padStart(2, "0");
      const d = String(x.getDate()).padStart(2, "0");
      out.push(x.getFullYear() + "-" + m + "-" + d);
    }
    return out;
  };

  const seedLocal = () => {
    const days = isoDays(16);
    const mornings = readJSON("align-morning", {});
    const plans = readJSON("align-plans", {});
    const journals = readJSON("align-journal", {});
    days.forEach((iso) => {
      const st = mornings[iso];
      if (st && typeof st === "object" && Object.keys(st).some((k) => k !== "updated_at" && st[k])) {
        enqueue("morning", iso, { iso, steps: st });
      }
      if (plans[iso]) enqueue("plan", iso, { iso, plan: plans[iso] });
    });
    Object.keys(journals || {}).forEach((iso) => {
      if (journals[iso]) enqueue("journal", iso, { iso, payload: journals[iso] });
    });
    const bible = readJSON("align-bible", null);
    if (bible) enqueue("bible", "bible", bible);
    const scripture = readJSON("align-scripture", null);
    if (scripture) enqueue("scripture", "scripture", scripture);
    try {
      const v1 = readJSON("align-v1", null);
      const hist = (v1 && v1.history) || [];
      hist.slice(-24).forEach((row) => {
        if (row && row.date) enqueue("workout", (row.date || "") + "|" + (row.dayId || ""), row);
      });
      enqueue("profile", "profile", { display_name: (v1 && v1.profile && v1.profile.name) || "" });
    } catch { /* ignore */ }
    const prefs = readJSON("align-notif-prefs", null);
    if (prefs) enqueue("prefs", "prefs", prefs);
    try {
      const books = readJSON("align-books", []);
      (books || []).slice(0, 40).forEach((b) => {
        if (b && b.id) enqueue("book", b.id, b);
      });
      const log = readJSON("align-reading-log", {});
      Object.keys(log || {}).slice(0, 40).forEach((key) => {
        const row = log[key];
        const parts = String(key).split("|");
        const iso = parts[0];
        const bookId = parts.slice(1).join("|");
        if (iso && bookId) enqueue("reading", iso + "|" + bookId, {
          iso, bookId, fromPage: row && (row.from || row.from_page), toPage: row && (row.to || row.to_page)
        });
      });
    } catch { /* ignore */ }
  };

  const syncNow = async (bundle) => {
    hydrated = true;
    seedLocal();
    if (bundle && bundle.iso) {
      if (bundle.morning) enqueue("morning", bundle.iso, { iso: bundle.iso, steps: bundle.morning });
      if (bundle.plan) enqueue("plan", bundle.iso, { iso: bundle.iso, plan: bundle.plan });
      if (bundle.journal) enqueue("journal", bundle.iso, { iso: bundle.iso, payload: bundle.journal });
      if (bundle.bible) enqueue("bible", "bible", bundle.bible);
      if (bundle.scripture) enqueue("scripture", "scripture", bundle.scripture);
    } else {
      seedLocal();
    }
    requestBgSync();
    return flush();
  };

  const saveMorning = async (iso, steps, opts) =>
    queueAndFlush("morning", iso, { iso, steps }, opts || { delay: 0 });

  const saveDayPlan = async (iso, plan, opts) =>
    queueAndFlush("plan", iso, { iso, plan }, opts || { delay: 450 });

  const saveJournal = async (iso, payload, opts) =>
    queueAndFlush("journal", iso, { iso, payload }, opts || { delay: 450 });

  const saveNote = async (note, opts) =>
    queueAndFlush("note", note && note.id, note || {}, opts || { delay: 450 });

  const deleteNoteRemote = async (id, opts) =>
    queueAndFlush("note-del", "del-" + id, { id }, opts || { now: true });

  const saveBible = async (cursor, opts) =>
    queueAndFlush("bible", "bible", cursor || {}, opts || { delay: 0 });

  const saveScripture = async (payload, opts) =>
    queueAndFlush("scripture", "scripture", payload || {}, opts || { delay: 400 });

  const pullLife = async () => {
    const sb = client();
    const userId = await uidOf();
    if (!sb || !userId) return ok(null);
    const [m, p, j, b, a, n] = await Promise.all([
      sb.from("mornings").select("date, steps, updated_at").eq("user_id", userId),
      sb.from("day_plans").select("date, payload, updated_at").eq("user_id", userId),
      sb.from("journals").select("date, payload, updated_at").eq("user_id", userId),
      sb.from("bible_state").select("book, chapter, log, updated_at").eq("user_id", userId).maybeSingle(),
      sb.from("app_state").select("scripture, updated_at").eq("user_id", userId).maybeSingle(),
      sb.from("notes").select("id, date, title, body, created_at, updated_at").eq("user_id", userId)
    ]);
    if (m.error && missingTable(m.error)) return ok(null);
    const notes = (!n || (n.error && missingTable(n.error))) ? [] : (n.data || []);
    return ok({
      mornings: (m.data || []).map((r) => ({ date: r.date, steps: r.steps, updated_at: r.updated_at })),
      plans: (p.data || []).map((r) => ({ date: r.date, payload: r.payload, updated_at: r.updated_at })),
      journals: (j.data || []).map((r) => ({ date: r.date, payload: r.payload, updated_at: r.updated_at })),
      notes,
      bible: b.data || null,
      scripture: (a.data && a.data.scripture) || null,
      scriptureAt: (a.data && a.data.updated_at) || null
    });
  };

  const fetchBooks = async () => {
    const sb = client();
    const userId = await uidOf();
    if (!sb || !userId) return ok([]);
    const { data, error } = await sb.from("books").select("*").eq("user_id", userId).order("updated_at", { ascending: false });
    if (error) {
      if (/does not exist|schema cache/i.test(error.message || "")) return ok([]);
      return fail(error);
    }
    return ok(data || []);
  };

  const fetchReadingLog = async () => {
    const sb = client();
    const userId = await uidOf();
    if (!sb || !userId) return ok([]);
    const { data, error } = await sb.from("reading_log").select("*").eq("user_id", userId);
    if (error) return fail(error);
    return ok(data || []);
  };

  const upsertBookMeta = async (book) => {
    if (!book || !book.id) return ok(null);
    return queueAndFlush("book", book.id, book, { delay: 0 });
  };

  const uploadBookFile = async (bookId, blob) => {
    const sb = client();
    const userId = await uidOf();
    if (!sb || !userId) return ok(null);
    const path = userId + "/" + bookId + ".pdf";
    const { error } = await sb.storage.from("reading").upload(path, blob, {
      contentType: "application/pdf",
      upsert: true
    });
    if (error) return fail(error);
    return ok(path);
  };

  const downloadBookFile = async (storagePath) => {
    const sb = client();
    if (!sb || !storagePath) return ok(null);
    const { data, error } = await sb.storage.from("reading").download(storagePath);
    if (error) return fail(error);
    return ok(data);
  };

  const deleteBookRemote = async (book) => {
    const sb = client();
    const userId = await uidOf();
    if (!sb || !userId) return ok(null);
    if (book.storage_path) {
      await sb.storage.from("reading").remove([book.storage_path]);
    }
    const { error } = await sb.from("books").delete().eq("id", book.id).eq("user_id", userId);
    if (error) return fail(error);
    return ok(true);
  };

  const saveReadingLog = async (iso, bookId, fromPage, toPage) =>
    queueAndFlush("reading", iso + "|" + bookId, { iso, bookId, fromPage, toPage }, { delay: 0 });

  const fetchSounds = async () => {
    const sb = client();
    if (!sb) return ok([]);
    const userId = await uidOf();
    let q = sb.from("sounds").select("*").eq("is_public", true);
    const { data: pub, error: e1 } = await q;
    if (e1) {
      if (/does not exist|schema cache/i.test(e1.message || "")) return ok([]);
      return fail(e1);
    }
    let mine = [];
    if (userId) {
      const { data, error } = await sb.from("sounds").select("*").eq("user_id", userId).eq("is_public", false);
      if (!error) mine = data || [];
    }
    return ok([].concat(pub || [], mine));
  };

  const upsertSoundMeta = async (row) => {
    if (!row || !row.id) return ok(null);
    const rec = {
      id: row.id,
      title: row.title,
      artist: row.artist || "",
      source: row.source || "upload",
      license: row.license || "",
      mood: row.mood || "still",
      source_url: row.source_url || null,
      storage_path: row.storage_path || null,
      filename: row.filename || "",
      mime: row.mime || "",
      bytes: row.bytes || 0
    };
    queueAndFlush("sound", row.id, rec, { delay: 0 });
    return ok(rec);
  };

  const uploadSoundFile = async (soundId, blob, mime) => {
    const sb = client();
    const userId = await uidOf();
    if (!sb || !userId) return ok(null);
    const ext = (mime || "").includes("mpeg") || (mime || "").includes("mp3") ? "mp3"
      : (mime || "").includes("wav") ? "wav"
      : (mime || "").includes("ogg") ? "ogg"
      : (mime || "").includes("mp4") || (mime || "").includes("m4a") || (mime || "").includes("aac") ? "m4a"
      : "bin";
    const path = userId + "/" + soundId + "." + ext;
    const { error } = await sb.storage.from("sounds").upload(path, blob, {
      contentType: mime || "application/octet-stream",
      upsert: true
    });
    if (error) return fail(error);
    return ok(path);
  };

  const soundUrl = async (storagePath) => {
    const sb = client();
    if (!sb || !storagePath) return ok(null);
    const { data, error } = await sb.storage.from("sounds").createSignedUrl(storagePath, 60 * 60 * 24 * 7);
    if (error) return fail(error);
    return ok(data && data.signedUrl);
  };

  const deleteSoundRemote = async (row) => {
    const sb = client();
    const userId = await uidOf();
    if (!sb || !userId || !row) return ok(null);
    if (row.storage_path) {
      await sb.storage.from("sounds").remove([row.storage_path]);
    }
    const { error } = await sb.from("sounds").delete().eq("id", row.id).eq("user_id", userId);
    if (error) return fail(error);
    return ok(true);
  };

  const testConnection = async (url, anonKey) => {
    if (!window.supabase) return fail("Supabase library failed to load.");
    try {
      const sb = window.supabase.createClient(url.trim(), anonKey.trim());
      const { error } = await sb.auth.getSession();
      if (error) return fail(error);
      writeCfg(url, anonKey);
      _client = null;
      return ok(true);
    } catch (e) {
      return fail(e);
    }
  };

  return {
    readCfg, writeCfg, configured, client,
    session, onAuth, signUp, signIn, magicLink, resetPassword, signOut,
    upsertProfile, fetchProfile, saveWorkout, fetchWorkouts,
    savePushSub, deletePushSub, savePrefs, fetchPrefs, testConnection,
    saveMorning, saveDayPlan, saveJournal, saveNote, deleteNoteRemote, saveBible, saveScripture, pullLife,
    fetchBooks, fetchReadingLog, upsertBookMeta, uploadBookFile,
    downloadBookFile, deleteBookRemote, saveReadingLog,
    fetchSounds, upsertSoundMeta, uploadSoundFile, soundUrl, deleteSoundRemote,
    flush, pendingCount, status, syncNow, onStatus, seedLocal, markHydrated: () => { hydrated = true; scheduleFlush(0); }
  };
})();

if (typeof window !== "undefined") {
  const kickFlush = () => { try { if (window.AlignDB) window.AlignDB.flush(); } catch { /* ignore */ } };
  window.addEventListener("online", kickFlush);
  document.addEventListener("visibilitychange", () => { if (!document.hidden) kickFlush(); });
  setInterval(kickFlush, 20000);
}
