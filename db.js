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

  const sinceIso = (days) => {
    const d = new Date();
    d.setDate(d.getDate() - Math.max(1, Number(days) || 30));
    const y = d.getFullYear();
    const m = String(d.getMonth() + 1).padStart(2, "0");
    const day = String(d.getDate()).padStart(2, "0");
    return y + "-" + m + "-" + day;
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
      .gte("date", sinceIso(400))
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

  const localIsoToday = () => {
    const d = new Date();
    const y = d.getFullYear();
    const m = String(d.getMonth() + 1).padStart(2, "0");
    const day = String(d.getDate()).padStart(2, "0");
    return y + "-" + m + "-" + day;
  };

  const summarizeSchedule = (plan) => {
    const items = [];
    ((plan && plan.priorities) || []).forEach((p, i) => {
      const text = p && typeof p === "object" ? String(p.text || "").trim() : String(p || "").trim();
      if (!text) return;
      items.push({ text: text.slice(0, 80), done: !!(p && p.done) });
    });
    ((plan && plan.tasks) || []).forEach((t) => {
      const text = String((t && t.text) || "").trim();
      if (!text) return;
      items.push({ text: text.slice(0, 80), done: !!(t && t.done) });
    });
    return items;
  };

  const bookSnap = () => {
    try {
      const books = readJSON("align-books", []) || [];
      const on = books.filter((b) => b && b.enabled !== false);
      if (!on.length) return { title: "", page: 0, pages: 0 };
      on.sort((a, b) => (Date.parse(b.updated_at || 0) || 0) - (Date.parse(a.updated_at || 0) || 0));
      const b = on[0];
      return {
        title: String(b.title || "Untitled").slice(0, 80),
        page: Math.max(1, Number(b.current_page) || 1),
        pages: Math.max(0, Number(b.pages) || 0)
      };
    } catch {
      return { title: "", page: 0, pages: 0 };
    }
  };

  const readMsOf = (iso) => {
    try {
      const t = (readJSON("align-timing", {}) || {})[iso] || {};
      const read = t.read && typeof t.read === "object" ? t.read : {};
      return Math.max(0, Number(read.ms) || 0);
    } catch { return 0; }
  };

  const clockIsoOf = (iso, id, times) => {
    try {
      const fromT = times && times[id] && typeof times[id] === "object" ? times[id] : null;
      const local = ((readJSON("align-timing", {}) || {})[iso] || {})[id];
      const row = fromT || (local && typeof local === "object" ? local : null) || {};
      const at = Number(row.at || row.close || 0) || 0;
      if (!at) return null;
      return new Date(at).toISOString();
    } catch { return null; }
  };

  const patchPathDay = async (userId, iso, extra) => {
    if (!userId || !iso) return null;
    const now = new Date().toISOString();
    let prev = {};
    try {
      const got = await restSelect("path_days", "select=*&user_id=eq." + encodeURIComponent(userId) + "&date=eq." + encodeURIComponent(iso));
      prev = (got && got[0]) || {};
    } catch { prev = {}; }
    const row = Object.assign({
      user_id: userId,
      date: iso,
      done: Number(prev.done) || 0,
      total: Number(prev.total) || 12,
      go: !!prev.go,
      path_done: !!prev.path_done,
      sched: Array.isArray(prev.sched) ? prev.sched : [],
      sched_done: Number(prev.sched_done) || 0,
      sched_total: Number(prev.sched_total) || 0,
      book_title: prev.book_title || "",
      book_page: Number(prev.book_page) || 0,
      book_pages: Number(prev.book_pages) || 0,
      read_ms: Number(prev.read_ms) || 0,
      wake_at: prev.wake_at || null,
      lights_at: prev.lights_at || null,
      updated_at: now
    }, extra || {});
    if (prev.wake_at) row.wake_at = prev.wake_at;
    if (prev.lights_at) row.lights_at = prev.lights_at;
    if (!row.wake_at) delete row.wake_at;
    if (!row.lights_at) delete row.lights_at;
    let err = await restUpsert("path_days", row, "user_id,date");
    if (err && /column|schema cache|PGRST204/i.test(err.message || "")) {
      const noClock = Object.assign({}, row);
      delete noClock.wake_at;
      delete noClock.lights_at;
      err = await restUpsert("path_days", noClock, "user_id,date");
    }
    if (err && (missingTable(err) || /column|schema cache|PGRST204/i.test(err.message || ""))) {
      err = await restUpsert("path_days", {
        user_id: userId,
        date: iso,
        done: row.done,
        total: row.total,
        go: row.go,
        path_done: row.path_done,
        updated_at: now
      }, "user_id,date");
      if (err && missingTable(err)) return null;
    }
    return err;
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
      const merged = {};
      const keys = new Set([].concat(Object.keys(remoteSteps || {}), Object.keys(localSteps || {})));
      keys.forEach((k) => {
        if (!k || k.charAt(0) === "_") return;
        merged[k] = !!(remoteSteps[k] || localSteps[k]);
      });
      const a = (remoteSteps && remoteSteps._times) || {};
      const b = (localSteps && localSteps._times) || {};
      const times = Object.assign({}, a);
      Object.keys(b).forEach((k) => {
        const y = b[k];
        if (!y || typeof y !== "object") return;
        const x = times[k];
        if (!x || typeof x !== "object") { times[k] = y; return; }
        const at = [x.at, y.at].filter((n) => n > 0);
        times[k] = {
          open: Math.min(x.open || y.open || 0, y.open || x.open || 0) || x.open || y.open,
          close: Math.max(x.close || 0, y.close || 0) || x.close || y.close,
          ms: Math.max(x.ms || 0, y.ms || 0),
          at: at.length ? Math.min.apply(null, at) : (x.at || y.at)
        };
        if (!times[k].at) delete times[k].at;
      });
      if (Object.keys(times).length) merged._times = times;
      err = await restUpsert("mornings", {
        user_id: userId, date: p.iso, steps: merged, updated_at: now
      }, "user_id,date");
      if (!err) {
        const ids = ["rise", "move", "pray", "devotion", "verse", "word", "drill", "affirm", "plan", "ready", "recite", "go"];
        let doneN = 0;
        ids.forEach((id) => { if (merged[id]) doneN += 1; });
        const go = !!merged.go;
        const snap = bookSnap();
        const items = summarizeSchedule((readJSON("align-plans", {}) || {})[p.iso] || {});
        const clocks = {};
        const wakeIso = clockIsoOf(p.iso, "rise", merged._times);
        const bedIso = clockIsoOf(p.iso, "lights", merged._times);
        if (wakeIso) clocks.wake_at = wakeIso;
        if (bedIso) clocks.lights_at = bedIso;
        await patchPathDay(userId, p.iso, Object.assign({
          done: doneN,
          total: ids.length,
          go,
          path_done: go,
          sched: items,
          sched_done: items.filter((x) => x.done).length,
          sched_total: items.length,
          book_title: snap.title,
          book_page: snap.page,
          book_pages: snap.pages,
          read_ms: Math.max(readMsOf(p.iso), (merged._times && merged._times.read && merged._times.read.ms) || 0)
        }, clocks));
      }
    } else if (item.kind === "plan") {
      err = await restUpsert("day_plans", {
        user_id: userId, date: p.iso, payload: p.plan || {}, updated_at: now
      }, "user_id,date");
      if (!err) {
        const items = summarizeSchedule(p.plan || {});
        await patchPathDay(userId, p.iso, {
          sched: items,
          sched_done: items.filter((x) => x.done).length,
          sched_total: items.length
        });
      }
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
      let sc = Object.assign({}, p || {});
      try {
        const localA = JSON.parse(localStorage.getItem("align-affirm") || "null") || {};
        if (localA && localA.text != null && String(localA.text).trim()) {
          const lAt = Date.parse(localA.updated_at || "") || 0;
          const sAt = Date.parse(sc._affirmationAt || "") || 0;
          if (sc._affirmation == null || lAt >= sAt) {
            sc._affirmation = localA.text;
            sc._affirmationAt = localA.updated_at || now;
          }
        }
      } catch { /* ignore */ }
      if (sc._affirmation == null) {
        try {
          const got = await restSelect("app_state", "select=scripture");
          const remote = (got && got[0] && got[0].scripture) || {};
          if (remote._affirmation != null) {
            sc._affirmation = remote._affirmation;
            sc._affirmationAt = remote._affirmationAt;
          }
        } catch { /* keep local */ }
      }
      err = await restUpsert("app_state", {
        user_id: userId, scripture: sc, updated_at: now
      }, "user_id");
    } else if (item.kind === "affirm") {
      const text = String((p && p.text) || "");
      let sc = {};
      try {
        const got = await restSelect("app_state", "select=scripture");
        sc = (got && got[0] && got[0].scripture) || {};
      } catch { sc = {}; }
      if (!sc || typeof sc !== "object") sc = {};
      sc._affirmation = text;
      sc._affirmationAt = now;
      err = await restUpsert("app_state", {
        user_id: userId, scripture: sc, updated_at: now
      }, "user_id");
    } else if (item.kind === "prefs") {
      let routine = {};
      try { routine = (window.ALIGN_LIFE && ALIGN_LIFE.loadRoutine && ALIGN_LIFE.loadRoutine()) || {}; } catch { routine = {}; }
      const row = {
        user_id: userId,
        enabled: !!p.enabled,
        reminder_hour: p.hour != null ? p.hour : (routine.wkWakeH != null ? routine.wkWakeH : 5),
        reminder_minute: p.minute != null ? p.minute : (routine.wkWakeM != null ? routine.wkWakeM : 0),
        timezone: p.timezone || "Africa/Lagos",
        sun_wake_h: routine.sunWakeH,
        sun_wake_m: routine.sunWakeM,
        wk_wake_h: routine.wkWakeH,
        wk_wake_m: routine.wkWakeM,
        sun_lights_h: routine.sunLightsH,
        sun_lights_m: routine.sunLightsM,
        wk_lights_h: routine.wkLightsH,
        wk_lights_m: routine.wkLightsM,
        updated_at: now
      };
      err = await restUpsert("notification_prefs", row, "user_id");
      if (err && /timezone|schema cache|column/i.test(err.message || "")) {
        delete row.timezone;
        delete row.sun_wake_h; delete row.sun_wake_m;
        delete row.wk_wake_h; delete row.wk_wake_m;
        delete row.sun_lights_h; delete row.sun_lights_m;
        delete row.wk_lights_h; delete row.wk_lights_m;
        err = await restUpsert("notification_prefs", row, "user_id");
      }
    } else if (item.kind === "routine") {
      const routine = p.routine || p;
      err = await restUpsert("app_state", {
        user_id: userId, routine, updated_at: now
      }, "user_id");
      if (err && /routine|schema cache|column/i.test(err.message || "")) {
        let sc = {};
        try {
          const got = await restSelect("app_state", "select=scripture");
          sc = (got && got[0] && got[0].scripture) || {};
        } catch { sc = {}; }
        if (!sc || typeof sc !== "object") sc = {};
        sc._routine = routine;
        err = await restUpsert("app_state", {
          user_id: userId, scripture: sc, updated_at: now
        }, "user_id");
      }
      let tz = "Africa/Lagos";
      try {
        const pr = readJSON("align-notif-prefs", {}) || {};
        if (pr.timezone) tz = pr.timezone;
      } catch { /* ignore */ }
      const clocks = {
        user_id: userId,
        timezone: tz,
        sun_wake_h: routine.sunWakeH,
        sun_wake_m: routine.sunWakeM,
        wk_wake_h: routine.wkWakeH,
        wk_wake_m: routine.wkWakeM,
        sun_lights_h: routine.sunLightsH,
        sun_lights_m: routine.sunLightsM,
        wk_lights_h: routine.wkLightsH,
        wk_lights_m: routine.wkLightsM,
        reminder_hour: routine.wkWakeH,
        reminder_minute: routine.wkWakeM,
        updated_at: now
      };
      const clockErr = await restUpsert("notification_prefs", clocks, "user_id");
      if (clockErr && /column|schema cache/i.test(clockErr.message || "")) {
        /* hours SQL not applied yet — local alarms still work */
      }
    } else if (item.kind === "workout") {
      let minutes = Number(p.minutes) || 0;
      let completed = Number(p.completed) || 0;
      let total = Number(p.total) || 0;
      let log = p.log || [];
      let dayId = p.dayId;
      try {
        const got = await restSelect(
          "workouts",
          "select=minutes,completed,total,log,day_id&date=eq." + encodeURIComponent(p.date) + "&day_id=eq." + encodeURIComponent(p.dayId)
        );
        const remote = got && got[0];
        if (remote) {
          const rMin = Number(remote.minutes) || 0;
          const rDone = Number(remote.completed) || 0;
          if (rMin > minutes) {
            minutes = rMin;
            log = remote.log || log;
            dayId = remote.day_id || dayId;
          }
          if (rDone > completed) completed = rDone;
          if ((Number(remote.total) || 0) > total) total = Number(remote.total) || total;
        }
      } catch { /* keep local */ }
      err = await restUpsert("workouts", {
        user_id: userId,
        date: p.date,
        day_id: dayId,
        minutes,
        completed,
        total,
        log
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
    } else if (item.kind === "profile") {
      err = await restUpsert("profiles", {
        id: userId,
        display_name: p.display_name || "",
        updated_at: now
      }, "id");
      if (err && missingTable(err)) err = null;
    } else if (item.kind === "book") {
      if (!p.id) err = null;
      else {
        const bookRow = {
          id: p.id,
          user_id: userId,
          title: p.title || "Untitled",
          author: p.author || "",
          filename: p.filename || "",
          storage_path: p.storage_path || "",
          bytes: Number(p.bytes) || 0,
          pages: Number(p.pages) || 0,
          current_page: Number(p.current_page) || 1,
          slot: p.slot || "evening",
          days: Array.isArray(p.days) ? p.days : [1, 2, 3, 4, 5, 6],
          pages_per_day: Number(p.pages_per_day) || 8,
          enabled: p.enabled !== false,
          category: String(p.category || "").trim().slice(0, 40),
          updated_at: now
        };
        err = await restUpsert("books", bookRow, "id");
        if (err && /category|PGRST204|schema cache|column/i.test(err.message || "")) {
          delete bookRow.category;
          err = await restUpsert("books", bookRow, "id");
        }
        if (err && missingTable(err)) err = null;
        const snap = bookSnap();
        const iso = localIsoToday();
        await patchPathDay(userId, iso, {
          book_title: snap.title || bookRow.title,
          book_page: snap.page || bookRow.current_page,
          book_pages: snap.pages || bookRow.pages,
          read_ms: readMsOf(iso)
        });
      }
    } else if (item.kind === "reading") {
      if (!p.bookId || !p.iso) err = null;
      else {
        err = await restUpsert("reading_log", {
          user_id: userId,
          book_id: p.bookId,
          date: p.iso,
          from_page: p.fromPage != null ? p.fromPage : (p.from || 1),
          to_page: p.toPage != null ? p.toPage : (p.to || 1),
          updated_at: now
        }, "user_id,book_id,date");
        if (err && missingTable(err)) err = null;
        const snap = bookSnap();
        await patchPathDay(userId, p.iso, {
          book_title: snap.title,
          book_page: snap.page,
          book_pages: snap.pages,
          read_ms: readMsOf(p.iso)
        });
      }
    } else if (item.kind === "sound") {
      if (!p.id) err = null;
      else {
        err = await restUpsert("sounds", {
          id: p.id,
          user_id: userId,
          title: p.title || "Sound",
          artist: p.artist || "",
          source: p.source || "upload",
          license: p.license || "",
          mood: p.mood || "still",
          source_url: p.source_url || null,
          storage_path: p.storage_path || null,
          filename: p.filename || "",
          mime: p.mime || "",
          bytes: Number(p.bytes) || 0,
          is_public: !!p.is_public,
          updated_at: now
        }, "id");
        if (err && missingTable(err)) err = null;
      }
    } else {
      return { keep: false };
    }
    if (!err) return { keep: false };
    return { keep: true, error: err.message };
  };

  const flush = async () => {
    if (flushing) { dirty = true; return ok(true); }
    const rank = (k) => {
      if (k === "book" || k === "sound" || k === "profile") return 0;
      if (k === "reading") return 2;
      if (k === "note-del") return 3;
      return 1;
    };
    const q = readOut().slice().sort((a, b) => rank(a.kind) - rank(b.kind));
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
    const timing = readJSON("align-timing", {});
    days.forEach((iso) => {
      const st = mornings[iso];
      if (st && typeof st === "object" && Object.keys(st).some((k) => k !== "updated_at" && k !== "_times" && st[k])) {
        const payload = Object.assign({}, st);
        const t = timing[iso];
        if (t && typeof t === "object") {
          const times = {};
          Object.keys(t).forEach((k) => {
            if (k !== "updated_at" && t[k] && typeof t[k] === "object") times[k] = t[k];
          });
          if (Object.keys(times).length) payload._times = times;
        }
        enqueue("morning", iso, { iso, steps: payload });
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
    const routine = readJSON("align-routine", null);
    if (routine && routine.updated_at) enqueue("routine", "routine", { routine });
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

  const saveRoutineCloud = async (row, opts) =>
    queueAndFlush("routine", "routine", { routine: row || {} }, opts || { delay: 0 });

  const saveMorning = async (iso, steps, opts) => {
    const row = Object.assign({}, steps || {});
    if (!row._times) {
      try {
        const tAll = readJSON("align-timing", {});
        const t = tAll[iso] || {};
        const times = {};
        Object.keys(t).forEach((k) => {
          if (k !== "updated_at" && t[k] && typeof t[k] === "object") times[k] = t[k];
        });
        if (Object.keys(times).length) row._times = times;
      } catch { /* local times optional */ }
    }
    return queueAndFlush("morning", iso, { iso, steps: row }, opts || { delay: 0 });
  };

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
    const from = sinceIso(120);
    const [m, p, j, b, a0, n] = await Promise.all([
      sb.from("mornings").select("date, steps, updated_at").eq("user_id", userId).gte("date", from),
      sb.from("day_plans").select("date, payload, updated_at").eq("user_id", userId).gte("date", from),
      sb.from("journals").select("date, payload, updated_at").eq("user_id", userId).gte("date", from),
      sb.from("bible_state").select("book, chapter, log, updated_at").eq("user_id", userId).maybeSingle(),
      sb.from("app_state").select("scripture, routine, updated_at").eq("user_id", userId).maybeSingle(),
      sb.from("notes").select("id, date, title, body, created_at, updated_at").eq("user_id", userId).order("updated_at", { ascending: false }).limit(80)
    ]);
    if (m.error && missingTable(m.error)) return ok(null);
    let a = a0;
    if (a && a.error && /routine|column|schema cache/i.test(a.error.message || "")) {
      a = await sb.from("app_state").select("scripture, updated_at").eq("user_id", userId).maybeSingle();
    }
    const notes = (!n || (n.error && missingTable(n.error))) ? [] : (n.data || []);
    const scripture = (a.data && a.data.scripture) || null;
    const routine = (a.data && a.data.routine && Object.keys(a.data.routine).length)
      ? a.data.routine
      : (scripture && scripture._routine) || null;
    return ok({
      mornings: (m.data || []).map((r) => ({ date: r.date, steps: r.steps, updated_at: r.updated_at })),
      plans: (p.data || []).map((r) => ({ date: r.date, payload: r.payload, updated_at: r.updated_at })),
      journals: (j.data || []).map((r) => ({ date: r.date, payload: r.payload, updated_at: r.updated_at })),
      notes,
      bible: b.data || null,
      scripture,
      scriptureAt: (a.data && a.data.updated_at) || null,
      routine,
      affirmation: (scripture && scripture._affirmation != null)
        ? { text: scripture._affirmation, updated_at: scripture._affirmationAt || (a.data && a.data.updated_at) }
        : null
    });
  };

  const fetchBooks = async () => {
    const userId = await uidOf();
    if (!userId) return ok([]);
    const viaRest = await restSelect("books", "select=*&user_id=eq." + encodeURIComponent(userId) + "&order=updated_at.desc");
    if (viaRest.length) return ok(viaRest);
    const sb = client();
    if (!sb) return ok(viaRest);
    const { data, error } = await sb.from("books").select("*").eq("user_id", userId).order("updated_at", { ascending: false });
    if (error) {
      if (/does not exist|schema cache/i.test(error.message || "")) return ok(viaRest);
      return viaRest.length ? ok(viaRest) : fail(error);
    }
    return ok(data || viaRest || []);
  };

  const fetchReadingLog = async () => {
    const userId = await uidOf();
    if (!userId) return ok([]);
    const viaRest = await restSelect("reading_log", "select=*&user_id=eq." + encodeURIComponent(userId));
    if (viaRest.length) return ok(viaRest);
    const sb = client();
    if (!sb) return ok(viaRest);
    const { data, error } = await sb.from("reading_log").select("*").eq("user_id", userId);
    if (error) return viaRest.length ? ok(viaRest) : fail(error);
    return ok(data || viaRest || []);
  };

  const upsertBookMeta = async (book, opts) => {
    if (!book || !book.id) return ok(null);
    return queueAndFlush("book", book.id, book, opts || { delay: 0 });
  };

  const ACCOUNT_CAP = 50 * 1024 * 1024;
  const fmtQuota = (n) => {
    const x = Number(n) / (1024 * 1024);
    if (x < 0.1) return Math.max(1, Math.round(Number(n) / 1024)) + " KB";
    return (Math.round(x * 10) / 10) + " MB";
  };
  const localUploadBytes = (exclude) => {
    let n = 0;
    try {
      (window.ALIGN_BOOKS && ALIGN_BOOKS.list() || []).forEach((b) => {
        if (exclude && exclude.bookId && b.id === exclude.bookId) return;
        n += Number(b.bytes) || 0;
      });
    } catch { /* optional */ }
    try {
      const tracks = (window.ALIGN_SOUND && ALIGN_SOUND.snapshot && ALIGN_SOUND.snapshot().tracks) || [];
      tracks.forEach((t) => {
        if (exclude && exclude.soundId && t.id === exclude.soundId) return;
        n += Number(t.bytes) || 0;
      });
    } catch { /* optional */ }
    return n;
  };
  const remoteUploadBytes = async (userId, exclude) => {
    if (!userId) return 0;
    const books = await restSelect("books", "select=id,bytes&user_id=eq." + encodeURIComponent(userId));
    const sounds = await restSelect("sounds", "select=id,bytes&user_id=eq." + encodeURIComponent(userId) + "&is_public=eq.false");
    let n = 0;
    (books || []).forEach((r) => {
      if (exclude && exclude.bookId && r.id === exclude.bookId) return;
      n += Number(r.bytes) || 0;
    });
    (sounds || []).forEach((r) => {
      if (exclude && exclude.soundId && r.id === exclude.soundId) return;
      n += Number(r.bytes) || 0;
    });
    return n;
  };
  const assertQuota = async (addBytes, exclude) => {
    const add = Number(addBytes) || 0;
    if (add <= 0) return ok(true);
    if (add > ACCOUNT_CAP) return fail("This account can hold 50 MB.");
    const userId = await uidOf();
    let used = localUploadBytes(exclude);
    if (userId) {
      try {
        const remote = await remoteUploadBytes(userId, exclude);
        if (remote > used) used = remote;
      } catch { /* stay on local */ }
    }
    if (used + add > ACCOUNT_CAP) {
      const left = Math.max(0, ACCOUNT_CAP - used);
      return fail("This account can hold 50 MB. You’re using " + fmtQuota(used) + " · " + fmtQuota(left) + " left.");
    }
    return ok(true);
  };

  const uploadBookFile = async (bookId, blob) => {
    const sb = client();
    const userId = await uidOf();
    if (!sb || !userId) return ok(null);
    const size = blob && blob.size ? blob.size : 0;
    const q = await assertQuota(size, { bookId });
    if (!q.ok) return q;
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

  const saveReadingLog = async (iso, bookId, fromPage, toPage, opts) =>
    queueAndFlush("reading", iso + "|" + bookId, { iso, bookId, fromPage, toPage }, opts || { delay: 0 });

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
    const size = blob && blob.size ? blob.size : 0;
    const q = await assertQuota(size, { soundId });
    if (!q.ok) return q;
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

  const circleCode = () => {
    const a = "ABCDEFGHJKLMNPQRSTUVWXYZ23456789";
    const buf = new Uint8Array(8);
    if (crypto && crypto.getRandomValues) crypto.getRandomValues(buf);
    else for (let i = 0; i < 8; i++) buf[i] = Math.floor(Math.random() * 256);
    let s = "";
    for (let i = 0; i < 8; i++) s += a.charAt(buf[i] % a.length);
    return s;
  };

  const fetchMyCircle = async () => {
    const userId = await uidOf();
    if (!userId) return ok(null);
    const mine = await restSelect("circle_members", "select=circle_id,joined_at&user_id=eq." + encodeURIComponent(userId) + "&limit=1");
    if (!mine.length) return ok(null);
    const cid = mine[0].circle_id;
    const circ = await restSelect("circles", "select=id,name,code,created_by&id=eq." + encodeURIComponent(cid));
    const circle = circ[0] || { id: cid, name: "ALIGN circle", code: "" };
    const mems = await restSelect("circle_members", "select=user_id,joined_at&circle_id=eq." + encodeURIComponent(cid));
    const ids = (mems || []).map((m) => m.user_id).filter(Boolean);
    let names = {};
    if (ids.length) {
      const profs = await restSelect("profiles", "select=id,display_name&id=in.(" + ids.join(",") + ")");
      (profs || []).forEach((p) => { names[p.id] = p.display_name || ""; });
    }
    const from = (() => {
      const d = new Date();
      d.setDate(d.getDate() - 13);
      const y = d.getFullYear();
      const m = String(d.getMonth() + 1).padStart(2, "0");
      const day = String(d.getDate()).padStart(2, "0");
      return y + "-" + m + "-" + day;
    })();
    let days = [];
    if (ids.length) {
      days = await restSelect(
        "path_days",
        "select=*&user_id=in.(" + ids.join(",") + ")&date=gte." + from + "&order=date.desc"
      );
    }
    const byUser = {};
    ids.forEach((id) => { byUser[id] = []; });
    (days || []).forEach((r) => {
      if (!byUser[r.user_id]) byUser[r.user_id] = [];
      byUser[r.user_id].push(r);
    });
    const members = ids.map((id) => ({
      id,
      name: names[id] || "ALIGN",
      days: byUser[id] || []
    }));
    return ok({
      id: circle.id,
      name: circle.name || "ALIGN circle",
      code: circle.code || "",
      created_by: circle.created_by,
      members
    });
  };

  const createCircle = async (name) => {
    const auth = await refreshAuth(false);
    if (!auth.token || !auth.uid) return fail("Sign in to start a circle");
    const have = await fetchMyCircle();
    if (have && have.ok && have.data) return fail("Leave your circle first");
    const sb = client();
    if (!sb) return fail("Cloud is not ready");
    const label = String(name || "ALIGN circle").trim().slice(0, 40) || "ALIGN circle";
    const { error } = await sb.rpc("create_circle", { p_name: label });
    if (error && (missingTable(error) || /create_circle|Could not find the function/i.test(error.message || ""))) {
      return fail("Run sql/schema-circle-start.sql in Supabase once.");
    }
    if (error) return fail(error);
    return fetchMyCircle();
  };

  const joinCircle = async (code) => {
    const auth = await refreshAuth(false);
    if (!auth.token || !auth.uid) return fail("Sign in to join a circle");
    const raw = String(code || "").replace(/[^A-Za-z0-9]/g, "").toUpperCase().slice(0, 8);
    if (raw.length < 6) return fail("Enter the circle code");
    const have = await fetchMyCircle();
    if (have && have.ok && have.data) return fail("Leave your circle first");
    const sb = client();
    if (!sb) return fail("Cloud is not ready");
    const { error } = await sb.rpc("join_circle", { p_code: raw });
    if (error && (missingTable(error) || /join_circle|Could not find the function/i.test(error.message || ""))) {
      return fail("Run sql/schema-circle.sql in Supabase once.");
    }
    if (error) return fail(error);
    return fetchMyCircle();
  };

  const leaveCircle = async () => {
    const sb = client();
    const userId = await uidOf();
    if (!sb || !userId) return ok(true);
    const { error } = await sb.from("circle_members").delete().eq("user_id", userId);
    if (error && missingTable(error)) return ok(true);
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
    saveMorning, saveDayPlan, saveJournal, saveNote, deleteNoteRemote, saveBible, saveScripture,
    saveRoutineCloud,
    saveAffirmation: (row, opts) => queueAndFlush("affirm", "affirm", row || {}, opts || { delay: 0 }),
    pullLife,
    ACCOUNT_CAP, assertQuota,
    fetchBooks, fetchReadingLog, upsertBookMeta, uploadBookFile,
    downloadBookFile, deleteBookRemote, saveReadingLog,
    fetchSounds, upsertSoundMeta, uploadSoundFile, soundUrl, deleteSoundRemote,
    token: () => cachedToken || ((sessionFromStorage() || {}).access_token) || "",
    fetchMyCircle, createCircle, joinCircle, leaveCircle,
    flush, pendingCount, status, syncNow, onStatus, seedLocal, markHydrated: () => { hydrated = true; scheduleFlush(0); }
  };
})();

if (typeof window !== "undefined") {
  const kickFlush = () => { try { if (window.AlignDB) window.AlignDB.flush(); } catch { /* ignore */ } };
  window.addEventListener("online", kickFlush);
  document.addEventListener("visibilitychange", () => { if (!document.hidden) kickFlush(); });
  setInterval(kickFlush, 20000);
}
