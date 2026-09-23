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

  const upsertProfile = async (displayName) => {
    const sb = client();
    if (!sb) return fail("Not connected");
    const { data: u } = await sb.auth.getUser();
    if (!u || !u.user) return fail("Not signed in");
    const { error } = await sb.from("profiles").upsert({
      id: u.user.id,
      display_name: displayName || "",
      updated_at: new Date().toISOString()
    });
    if (error) return fail(error);
    return ok(true);
  };

  const fetchProfile = async () => {
    const sb = client();
    if (!sb) return ok(null);
    const { data: u } = await sb.auth.getUser();
    if (!u || !u.user) return ok(null);
    const { data, error } = await sb.from("profiles").select("*").eq("id", u.user.id).maybeSingle();
    if (error) return fail(error);
    return ok(data);
  };

  const saveWorkout = async (row, opts) =>
    queueAndFlush("workout", (row.date || "") + "|" + (row.dayId || ""), row, opts && opts.now);

  const fetchWorkouts = async () => {
    const sb = client();
    if (!sb) return ok([]);
    const { data: u } = await sb.auth.getUser();
    if (!u || !u.user) return ok([]);
    const { data, error } = await sb
      .from("workouts")
      .select("date, day_id, minutes, completed, total, log, created_at")
      .eq("user_id", u.user.id)
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
    const { data: u } = await sb.auth.getUser();
    if (!u || !u.user) return fail("Not signed in");
    const json = sub.toJSON();
    const { error } = await sb.from("push_subscriptions").upsert({
      user_id: u.user.id,
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
    localStorage.setItem(LS_PREFS, JSON.stringify(prefs));
    const sb = client();
    if (!sb) return ok(prefs);
    const { data: u } = await sb.auth.getUser();
    if (!u || !u.user) return ok(prefs);
    const { error } = await sb.from("notification_prefs").upsert({
      user_id: u.user.id,
      enabled: !!prefs.enabled,
      reminder_hour: Number(prefs.hour) || 7,
      reminder_minute: Number(prefs.minute) || 0,
      updated_at: new Date().toISOString()
    });
    if (error) return fail(error);
    return ok(prefs);
  };

  const fetchPrefs = async () => {
    const local = (() => {
      try { return JSON.parse(localStorage.getItem(LS_PREFS) || "null"); } catch { return null; }
    })() || { enabled: false, hour: 5, minute: 0 };
    const sb = client();
    if (!sb) return ok(local);
    const { data: u } = await sb.auth.getUser();
    if (!u || !u.user) return ok(local);
    const { data, error } = await sb.from("notification_prefs").select("*").eq("user_id", u.user.id).maybeSingle();
    if (error) return fail(error);
    if (!data) return ok(local);
    const prefs = { enabled: data.enabled, hour: data.reminder_hour, minute: data.reminder_minute };
    localStorage.setItem(LS_PREFS, JSON.stringify(prefs));
    return ok(prefs);
  };

  const uidOf = async () => {
    const sb = client();
    if (!sb) return null;
    try {
      const { data } = await sb.auth.getSession();
      const id = data && data.session && data.session.user && data.session.user.id;
      if (id) return id;
    } catch { /* fall through */ }
    return null;
  };

  const LS_OUT = "align-outbox";
  const readOut = () => {
    try { return JSON.parse(localStorage.getItem(LS_OUT) || "[]") || []; } catch { return []; }
  };
  const writeOut = (arr) => {
    try { localStorage.setItem(LS_OUT, JSON.stringify((arr || []).slice(-80))); } catch { /* quota */ }
  };
  const missingTable = (err) => /does not exist|schema cache|Could not find the table/i.test((err && err.message) || String(err || ""));
  const enqueue = (kind, key, payload) => {
    const q = readOut().filter((x) => !(x.kind === kind && x.key === key));
    q.push({ kind, key, payload, t: Date.now() });
    writeOut(q);
  };
  const pendingCount = () => readOut().length;

  let flushing = false;
  let flushTimer = null;
  let lastErr = "";
  let lastOkAt = 0;
  const scheduleFlush = (ms = 400) => {
    clearTimeout(flushTimer);
    flushTimer = setTimeout(() => { flush(); }, ms);
  };

  const authToken = async () => {
    const sb = client();
    if (!sb) return "";
    try {
      const { data } = await sb.auth.getSession();
      return (data && data.session && data.session.access_token) || "";
    } catch {
      return "";
    }
  };

  const restUpsert = async (table, row, conflict) => {
    const c = readCfg();
    if (!c.url || !c.anonKey) return { message: "Supabase is not configured" };
    const token = await authToken();
    if (!token) return { message: "Sign in to save to the cloud" };
    const base = String(c.url).replace(/\/$/, "");
    const qs = conflict ? ("?on_conflict=" + encodeURIComponent(conflict)) : "";
    let r;
    try {
      r = await fetch(base + "/rest/v1/" + table + qs, {
        method: "POST",
        headers: {
          apikey: c.anonKey,
          Authorization: "Bearer " + token,
          "Content-Type": "application/json",
          Prefer: "resolution=merge-duplicates,return=minimal"
        },
        body: JSON.stringify(row)
      });
    } catch (e) {
      return { message: (e && e.message) || "Network failed" };
    }
    if (r.status === 200 || r.status === 201 || r.status === 204) return null;
    let msg = "HTTP " + r.status;
    try {
      const j = await r.json();
      msg = (j && (j.message || j.error_description || j.error || j.hint)) || msg;
    } catch { /* keep msg */ }
    return { message: String(msg) };
  };

  const pushRow = async (item) => {
    const userId = await uidOf();
    if (!userId) return { keep: true, error: "Sign in to save to the cloud" };
    const now = new Date().toISOString();
    const p = item.payload || {};
    let err = null;
    if (item.kind === "morning") {
      err = await restUpsert("mornings", {
        user_id: userId, date: p.iso, steps: p.steps || {}, updated_at: now
      }, "user_id,date");
    } else if (item.kind === "plan") {
      err = await restUpsert("day_plans", {
        user_id: userId, date: p.iso, payload: p.plan || {}, updated_at: now
      }, "user_id,date");
    } else if (item.kind === "journal") {
      err = await restUpsert("journals", {
        user_id: userId, date: p.iso, payload: p.payload || {}, updated_at: now
      }, "user_id,date");
    } else if (item.kind === "bible") {
      err = await restUpsert("bible_state", {
        user_id: userId,
        book: p.book || "Genesis",
        chapter: p.chapter || 1,
        log: p.log || [],
        updated_at: now
      }, "user_id");
    } else if (item.kind === "scripture") {
      err = await restUpsert("app_state", {
        user_id: userId, scripture: p || {}, updated_at: now
      }, "user_id");
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
        }
      }
    } else {
      return { keep: false };
    }
    if (!err) return { keep: false };
    return { keep: true, error: err.message };
  };

  const flush = async () => {
    if (flushing) return ok(true);
    const q = readOut();
    if (!q.length) return ok(true);
    if (!window.supabase || !window.supabase.createClient) {
      lastErr = "Database library did not load";
      return fail(lastErr);
    }
    if (!configured()) {
      lastErr = "Supabase is not configured";
      return fail(lastErr);
    }
    const token = await authToken();
    if (!token) {
      lastErr = "Sign in to save to the cloud";
      return fail(lastErr);
    }
    flushing = true;
    const left = [];
    let err = null;
    for (const item of q) {
      try {
        const res = await pushRow(item);
        if (res.keep) {
          left.push(item);
          if (res.error) err = res.error;
        }
      } catch (e) {
        left.push(item);
        err = e && e.message ? e.message : String(e);
      }
    }
    writeOut(left);
    flushing = false;
    if (left.length) {
      lastErr = err || "Waiting to sync";
      return fail(lastErr);
    }
    lastErr = "";
    lastOkAt = Date.now();
    return ok(true);
  };

  const queueAndFlush = (kind, key, payload) => {
    enqueue(kind, key, payload);
    return flush();
  };

  const syncNow = async (bundle) => {
    if (bundle && bundle.iso) {
      if (bundle.morning) enqueue("morning", bundle.iso, { iso: bundle.iso, steps: bundle.morning });
      if (bundle.plan) enqueue("plan", bundle.iso, { iso: bundle.iso, plan: bundle.plan });
      if (bundle.journal) enqueue("journal", bundle.iso, { iso: bundle.iso, payload: bundle.journal });
      if (bundle.bible) enqueue("bible", "bible", bundle.bible);
      if (bundle.scripture) enqueue("scripture", "scripture", bundle.scripture);
    }
    return flush();
  };

  const saveMorning = async (iso, steps, opts) =>
    queueAndFlush("morning", iso, { iso, steps }, opts && opts.now);

  const saveDayPlan = async (iso, plan, opts) =>
    queueAndFlush("plan", iso, { iso, plan }, opts && opts.now);

  const saveJournal = async (iso, payload, opts) =>
    queueAndFlush("journal", iso, { iso, payload }, opts && opts.now);

  const saveBible = async (cursor, opts) =>
    queueAndFlush("bible", "bible", cursor || {}, opts && opts.now);

  const saveScripture = async (payload, opts) =>
    queueAndFlush("scripture", "scripture", payload || {}, opts && opts.now);

  const status = () => ({
    pending: pendingCount(),
    error: lastErr,
    lastOk: lastOkAt,
    signed: false
  });

  const pullLife = async () => {
    const sb = client();
    const userId = await uidOf();
    if (!sb || !userId) return ok(null);
    const [m, p, j, b, a] = await Promise.all([
      sb.from("mornings").select("date, steps, updated_at").eq("user_id", userId),
      sb.from("day_plans").select("date, payload, updated_at").eq("user_id", userId),
      sb.from("journals").select("date, payload, updated_at").eq("user_id", userId),
      sb.from("bible_state").select("book, chapter, log, updated_at").eq("user_id", userId).maybeSingle(),
      sb.from("app_state").select("scripture, updated_at").eq("user_id", userId).maybeSingle()
    ]);
    if (m.error && missingTable(m.error)) return ok(null);
    return ok({
      mornings: (m.data || []).map((r) => ({ date: r.date, steps: r.steps, updated_at: r.updated_at })),
      plans: (p.data || []).map((r) => ({ date: r.date, payload: r.payload, updated_at: r.updated_at })),
      journals: (j.data || []).map((r) => ({ date: r.date, payload: r.payload, updated_at: r.updated_at })),
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
    const sb = client();
    const userId = await uidOf();
    if (!sb || !userId) return ok(null);
    const row = {
      id: book.id,
      user_id: userId,
      title: book.title,
      author: book.author || "",
      filename: book.filename || "",
      storage_path: book.storage_path || "",
      bytes: book.bytes || 0,
      pages: book.pages || 0,
      current_page: book.current_page || 1,
      slot: book.slot || "evening",
      days: book.days || [1, 2, 3, 4, 5, 6],
      pages_per_day: book.pages_per_day || 8,
      enabled: book.enabled !== false,
      updated_at: new Date().toISOString()
    };
    const { error } = await sb.from("books").upsert(row);
    if (error) return fail(error);
    return ok(true);
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

  const saveReadingLog = async (iso, bookId, fromPage, toPage) => {
    const sb = client();
    const userId = await uidOf();
    if (!sb || !userId) return ok(null);
    const { error } = await sb.from("reading_log").upsert({
      user_id: userId,
      book_id: bookId,
      date: iso,
      from_page: fromPage,
      to_page: toPage,
      updated_at: new Date().toISOString()
    });
    if (error) return fail(error);
    return ok(true);
  };

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
    const sb = client();
    const userId = await uidOf();
    if (!sb || !userId) return ok(null);
    const rec = {
      id: row.id,
      user_id: userId,
      title: row.title,
      artist: row.artist || "",
      source: row.source || "upload",
      license: row.license || "",
      mood: row.mood || "still",
      source_url: row.source_url || null,
      storage_path: row.storage_path || null,
      filename: row.filename || "",
      mime: row.mime || "",
      bytes: row.bytes || 0,
      is_public: false,
      updated_at: new Date().toISOString()
    };
    const { error } = await sb.from("sounds").upsert(rec);
    if (error) return fail(error);
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
    saveMorning, saveDayPlan, saveJournal, saveBible, saveScripture, pullLife,
    fetchBooks, fetchReadingLog, upsertBookMeta, uploadBookFile,
    downloadBookFile, deleteBookRemote, saveReadingLog,
    fetchSounds, upsertSoundMeta, uploadSoundFile, soundUrl, deleteSoundRemote,
    flush, pendingCount, status, syncNow
  };
})();

if (typeof window !== "undefined") {
  const kickFlush = () => { try { if (window.AlignDB) window.AlignDB.flush(); } catch { /* ignore */ } };
  window.addEventListener("online", kickFlush);
  document.addEventListener("visibilitychange", () => { if (!document.hidden) kickFlush(); });
  setInterval(kickFlush, 20000);
}
