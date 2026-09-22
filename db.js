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

  const saveWorkout = async (row) => {
    const sb = client();
    if (!sb) return ok(null);
    const { data: u } = await sb.auth.getUser();
    if (!u || !u.user) return ok(null);
    const { error } = await sb.from("workouts").insert({
      user_id: u.user.id,
      date: row.date,
      day_id: row.dayId,
      minutes: row.minutes,
      completed: row.completed,
      total: row.total,
      log: row.log || []
    });
    if (error) return fail(error);
    return ok(true);
  };

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
    const { data: u } = await sb.auth.getUser();
    return (u && u.user && u.user.id) || null;
  };

  const saveMorning = async (iso, steps) => {
    const sb = client();
    const userId = await uidOf();
    if (!sb || !userId) return ok(null);
    const { error } = await sb.from("mornings").upsert({
      user_id: userId, date: iso, steps: steps || {}, updated_at: new Date().toISOString()
    });
    if (error) return fail(error);
    return ok(true);
  };

  const saveDayPlan = async (iso, plan) => {
    const sb = client();
    const userId = await uidOf();
    if (!sb || !userId) return ok(null);
    const { error } = await sb.from("day_plans").upsert({
      user_id: userId, date: iso, payload: plan || {}, updated_at: new Date().toISOString()
    });
    if (error) return fail(error);
    return ok(true);
  };

  const saveJournal = async (iso, payload) => {
    const sb = client();
    const userId = await uidOf();
    if (!sb || !userId) return ok(null);
    const { error } = await sb.from("journals").upsert({
      user_id: userId, date: iso, payload: payload || {}, updated_at: new Date().toISOString()
    });
    if (error) return fail(error);
    return ok(true);
  };

  const saveBible = async (cursor) => {
    const sb = client();
    const userId = await uidOf();
    if (!sb || !userId) return ok(null);
    const { error } = await sb.from("bible_state").upsert({
      user_id: userId,
      book: cursor.book || "Genesis",
      chapter: cursor.chapter || 1,
      log: cursor.log || [],
      updated_at: new Date().toISOString()
    });
    if (error) return fail(error);
    return ok(true);
  };

  const pullLife = async () => {
    const sb = client();
    const userId = await uidOf();
    if (!sb || !userId) return ok(null);
    const [m, p, j, b] = await Promise.all([
      sb.from("mornings").select("date, steps").eq("user_id", userId),
      sb.from("day_plans").select("date, payload").eq("user_id", userId),
      sb.from("journals").select("date, payload").eq("user_id", userId),
      sb.from("bible_state").select("book, chapter, log").eq("user_id", userId).maybeSingle()
    ]);
    if (m.error && /does not exist|schema cache/i.test(m.error.message || "")) return ok(null);
    return ok({
      mornings: (m.data || []).map((r) => ({ date: r.date, steps: r.steps })),
      plans: (p.data || []).map((r) => ({ date: r.date, payload: r.payload })),
      journals: (j.data || []).map((r) => ({ date: r.date, payload: r.payload })),
      bible: b.data || null
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
    saveMorning, saveDayPlan, saveJournal, saveBible, pullLife,
    fetchBooks, fetchReadingLog, upsertBookMeta, uploadBookFile,
    downloadBookFile, deleteBookRemote, saveReadingLog
  };
})();
