/* ALIGN — morning operating system */
(() => {
  const { exercises, days, insights, restAfter } = window.ALIGN_DATA;
  const DOW = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"];
  const DOW_FULL = ["Sunday", "Monday", "Tuesday", "Wednesday", "Thursday", "Friday", "Saturday"];
  const PATTERN_HEX = { push: "#ff6b4a", pull: "#5b8cff", legs: "#d6ff3f", core: "#ffb020", mobility: "#3ee0b3", warmup: "#f4f1ea" };

  const $ = (sel, el = document) => el.querySelector(sel);
  const app = $("#app");

  const load = () => {
    try { return JSON.parse(localStorage.getItem("align-v1")) || null; } catch { return null; }
  };
  const save = () => localStorage.setItem("align-v1", JSON.stringify({
    profile: state.profile, history: state.history, onboardingDone: state.onboardingDone
  }));

  const localIso = (d) => {
    const x = d instanceof Date ? d : new Date(d);
    if (Number.isNaN(x.getTime())) return "";
    const y = x.getFullYear();
    const m = String(x.getMonth() + 1).padStart(2, "0");
    const day = String(x.getDate()).padStart(2, "0");
    return y + "-" + m + "-" + day;
  };
  const today = () => {
    const d = new Date();
    return { date: d, iso: localIso(d), dow: d.getDay() };
  };

  const saved = load();
  const state = {
    view: "splash",
    onboard: 0,
    profile: saved?.profile || { name: "" },
    history: saved?.history || [],
    onboardingDone: !!saved?.onboardingDone,
    selectedDay: null,
    workout: null,
    tick: null,
    swapFor: null,
    session: null,
    authTab: "signin",
    authEmail: "",
    authPassword: "",
    authError: "",
    authInfo: "",
    authBusy: false,
    prefs: { enabled: false, hour: 5, minute: 0, timezone: "Africa/Lagos" },
    pushReady: false,
    installPrompt: null,
    setupUrl: "",
    setupKey: "",
    setupMsg: "",
    setupErr: "",
    toast: null,
    sheet: null,
    showPass: false,
    offline: typeof navigator !== "undefined" && navigator.onLine === false,
    votd: null,
    bibleData: null,
    bibleLoading: false,
    bibleErr: "",
    readBook: "",
    readCh: 0,
    prayOn: false,
    praySec: 0,
    readyOn: false,
    readySec: 0,
    spurgeonAm: null,
    spurgeonPm: null,
    odb: null,
    bookId: null,
    pdfErr: "",
    pdfBusy: false,
    pdfPage: 1,
    pdfPages: 0,
    uploadBusy: false,
    ai: { open: false, busy: false, input: "", reply: "", error: "", provider: "", model: "" },
    verseSess: null,
    drill: null,
    drillMode: "morning",
    readPacks: [],
    planJustSaved: false,
    journalIso: "",
    journalNoteId: "",
    showHow: false,
    verseSitOn: false,
    verseSitSec: 0
  };

  /* ---------- SVG poses ---------- */
  const pose = (name) => {
    const s = `fill="none" stroke="currentColor" stroke-width="2.6" stroke-linecap="round" stroke-linejoin="round"`;
    const head = (cx, cy) => `<circle cx="${cx}" cy="${cy}" r="6" ${s} />`;
    const map = {
      jacks: `${head(40,14)}<path d="M40 22 L40 44 M40 28 L18 22 M40 28 L62 22 M40 44 L22 68 M40 44 L58 68" ${s}/>`,
      arms: `${head(40,14)}<path d="M40 22 L40 48 M22 30 L58 30 M40 48 L28 70 M40 48 L52 70" ${s}/>`,
      inchworm: `${head(18,22)}<path d="M24 26 L40 32 L62 30 M40 32 L36 48 M62 30 L70 48 M24 26 L14 42" ${s}/>`,
      burpee: `${head(40,12)}<path d="M40 20 L40 40 M28 28 L52 28 M40 40 L24 58 M40 40 L56 58" ${s}/>`,
      pushup: `${head(16,28)}<path d="M22 32 L50 36 L70 34 M22 32 L12 44 M50 36 L46 50 M70 34 L74 48" ${s}/>`,
      decline: `${head(14,22)}<path d="M20 26 L52 40 L70 44 M20 26 L10 38 M52 40 L50 56 M70 44 L74 58" ${s}/>`,
      hindu: `${head(58,16)}<path d="M52 20 L40 40 L18 48 M40 40 L44 56 M18 48 L12 60 M52 20 L66 28" ${s}/>`,
      spider: `${head(16,26)}<path d="M22 30 L54 34 L72 30 M22 30 L12 42 M54 34 L42 50 M54 34 L66 52 M72 30 L76 44" ${s}/>`,
      pike: `${head(58,14)}<path d="M52 18 L40 42 L16 50 M40 42 L44 58 M16 50 L10 62" ${s}/>`,
      reverse: `${head(18,30)}<path d="M24 34 L56 30 L72 22 M24 34 L16 48 M56 30 L54 46 M72 22 L74 36" ${s}/>`,
      hover: `${head(16,24)}<path d="M22 28 L70 28 M22 28 L14 40 M40 28 L40 42 M70 28 L74 40" ${s}/>`,
      dip: `${head(40,16)}<path d="M40 24 L40 42 M24 28 L24 46 M56 28 L56 46 M40 42 L28 64 M40 42 L52 64" ${s}/>`,
      rotate: `${head(54,14)}<path d="M22 40 L50 36 L54 22 M22 40 L12 50 M50 36 L46 54 M22 40 L34 28" ${s}/>`,
      superman: `${head(18,30)}<path d="M24 32 L48 30 L70 26 M24 32 L10 28 M48 30 L44 42 M48 30 L62 42" ${s}/>`,
      yraise: `${head(40,14)}<path d="M40 22 L40 44 M40 26 L18 16 M40 26 L62 16 M40 44 L30 66 M40 44 L50 66" ${s}/>`,
      angel: `${head(18,28)}<path d="M24 32 L70 32 M24 32 L12 24 M40 32 L40 22 M58 32 L70 22 M40 32 L36 44" ${s}/>`,
      hyper: `${head(18,34)}<path d="M24 34 L50 28 L70 32 M24 34 L12 42 M50 28 L48 42" ${s}/>`,
      birddog: `${head(22,22)}<path d="M28 26 L48 32 M16 20 L28 26 M48 32 L64 20 M48 32 L60 48 M28 26 L22 42" ${s}/>`,
      row: `${head(28,16)}<path d="M28 24 L40 40 L58 36 M16 22 L28 24 M40 40 L36 58 M58 36 L70 30" ${s}/>`,
      squat: `${head(40,12)}<path d="M40 20 L40 40 M26 28 L54 28 M40 40 L24 62 M40 40 L56 62" ${s}/>`,
      lunge: `${head(36,12)}<path d="M36 20 L36 40 M24 28 L48 28 M36 40 L22 64 M36 40 L58 52 L64 68" ${s}/>`,
      bridge: `${head(16,36)}<path d="M22 36 L48 22 L70 36 M22 36 L14 48 M70 36 L74 50 M48 22 L48 36" ${s}/>`,
      wallsit: `${head(44,12)}<path d="M32 10 L32 70 M44 20 L44 40 L28 40 M44 40 L44 58 L30 58" ${s}/>`,
      calf: `${head(40,10)}<path d="M40 18 L40 48 M28 26 L52 26 M40 48 L32 62 M40 48 L52 58" ${s}/>`,
      kick: `${head(24,18)}<path d="M30 22 L46 34 M18 16 L30 22 M46 34 L62 18 M46 34 L58 50 M30 22 L24 40" ${s}/>`,
      goodmorn: `${head(28,18)}<path d="M32 24 L48 40 M20 16 L32 24 M48 40 L38 66 M48 40 L60 66" ${s}/>`,
      situp: `${head(28,22)}<path d="M32 28 L44 44 L70 44 M20 20 L32 28 M44 44 L40 58" ${s}/>`,
      crunch: `${head(22,28)}<path d="M28 32 L70 36 M16 24 L28 32 M44 34 L40 48" ${s}/>`,
      bicycle: `${head(24,20)}<path d="M28 26 L48 36 M16 18 L28 26 M48 36 L62 22 M48 36 L58 54" ${s}/>`,
      twist: `${head(40,16)}<path d="M40 24 L40 44 M22 30 L58 34 M40 44 L28 64 M40 44 L54 64" ${s}/>`,
      mountain: `${head(16,24)}<path d="M22 28 L70 28 M22 28 L14 40 M48 28 L40 50 M70 28 L74 42 M32 28 L28 48" ${s}/>`,
      legraise: `${head(16,42)}<path d="M22 42 L40 42 L66 20 M14 50 L22 42" ${s}/>`,
      vup: `${head(40,14)}<path d="M40 22 L22 52 M40 22 L58 52 M22 52 L58 52" ${s}/>`,
      plank: `${head(16,26)}<path d="M22 30 L70 30 M22 30 L14 42 M40 30 L40 42 M70 30 L74 42" ${s}/>`,
      sideplank: `${head(40,14)}<path d="M40 22 L40 50 M28 50 L52 50 M40 22 L58 22 M28 50 L20 58" ${s}/>`,
      deadbug: `${head(22,22)}<path d="M28 28 L52 28 M16 16 L28 28 M52 28 L66 16 M36 28 L36 44 M52 28 L60 48" ${s}/>`,
      hollow: `${head(22,30)}<path d="M28 32 L56 32 M16 24 L28 32 M56 32 L70 24" ${s}/>`,
      "stretch-stand": `${head(40,12)}<path d="M40 20 L40 48 M40 26 L18 18 M40 26 L58 34 M40 48 L28 70 M40 48 L52 70" ${s}/>`,
      cobra: `${head(22,22)}<path d="M26 28 L70 48 M18 34 L26 28 M42 38 L38 52" ${s}/>`,
      catcow: `${head(16,28)}<path d="M22 30 Q40 18 62 30 M22 30 L12 42 M40 24 L40 40 M62 30 L70 44" ${s}/>`,
      child: `${head(22,28)}<path d="M28 32 L48 48 L68 48 M16 36 L28 32 M48 48 L44 60" ${s}/>`,
      sidelying: `${head(18,28)}<path d="M24 30 L70 30 M12 22 L24 30 M50 30 L50 18" ${s}/>`,
      twiststretch: `${head(28,18)}<path d="M32 24 L48 40 L70 28 M20 16 L32 24 M48 40 L44 56" ${s}/>`,
      fold: `${head(28,28)}<path d="M32 34 L40 18 L52 48 M40 18 L58 12 M52 48 L48 62" ${s}/>`,
      breath: `${head(40,22)}<circle cx="40" cy="40" r="22" ${s} stroke-dasharray="4 6"/><path d="M40 32 L40 48 M32 40 L48 40" ${s}/>`
    };
    return `<svg viewBox="0 0 80 80" aria-hidden="true">${map[name] || map.pushup}</svg>`;
  };

  const fmtTarget = (ex, target, side) => {
    const sideBit = side ? ` · ${side}` : "";
    if (ex.kind === "time") {
      const m = Math.floor(target / 60);
      const s = String(target % 60).padStart(2, "0");
      return m ? `${m}:${s}${sideBit}` : `00:${s}${sideBit}`;
    }
    return `x${target}${sideBit}`;
  };

  const greet = () => {
    const h = new Date().getHours();
    if (h < 12) return "Good morning";
    if (h < 17) return "Good afternoon";
    return "Good evening";
  };

  const initials = () => {
    const n = (state.profile.name || "A").trim();
    const p = n.split(/\s+/);
    return ((p[0]?.[0] || "Y") + (p[1]?.[0] || "")).toUpperCase();
  };

  const dayByDow = (dow) => days.find(d => d.dow === dow);
  const todayDay = () => dayByDow(today().dow);
  const itemsOf = (w) => (w && w.items) || days.find(d => d.id === w.dayId).items;

  const completedOn = (iso) => state.history.find(h => h.date === iso);
  const streak = () => {
    let n = 0;
    const d = new Date();
    // if today not done, start from yesterday
    if (!completedOn(localIso(d))) d.setDate(d.getDate() - 1);
    for (let i = 0; i < 365; i++) {
      const iso = localIso(d);
      if (completedOn(iso)) { n++; d.setDate(d.getDate() - 1); }
      else break;
    }
    return n;
  };

  const weekVolume = () => {
    const acc = { push: 0, pull: 0, legs: 0, core: 0, mobility: 0, warmup: 0 };
    days.forEach(day => {
      day.items.forEach(it => {
        const ex = exercises[it.id];
        if (ex) acc[ex.pattern] = (acc[ex.pattern] || 0) + 1;
      });
    });
    return acc;
  };

  const urlBase64ToUint8Array = (base64String) => {
    const padding = "=".repeat((4 - (base64String.length % 4)) % 4);
    const base64 = (base64String + padding).replace(/-/g, "+").replace(/_/g, "/");
    const raw = atob(base64);
    const out = new Uint8Array(raw.length);
    for (let i = 0; i < raw.length; i++) out[i] = raw.charCodeAt(i);
    return out;
  };

  const registerSW = async () => {
    if (!("serviceWorker" in navigator)) return null;
    try {
      const reg = await navigator.serviceWorker.register("./sw.js");
      return reg;
    } catch (e) {
      console.warn("SW register failed", e);
      return null;
    }
  };

  const localNotify = async (title, body, tag) => {
    try {
      const reg = await navigator.serviceWorker.ready;
      await reg.showNotification(title, {
        body,
        icon: "./assets/icon-192.png",
        badge: "./assets/favicon-32.png",
        tag: tag || "align-local",
        vibrate: [80, 40, 80]
      });
      return true;
    } catch (e) {
      if (window.Notification) new Notification(title, { body });
      return true;
    }
  };

  const phoneTz = () => {
    try { return Intl.DateTimeFormat().resolvedOptions().timeZone || "Africa/Lagos"; }
    catch { return "Africa/Lagos"; }
  };

  let alarmTimer = 0;
  const tickAlarms = async () => {
    if (!state.prefs.enabled) return;
    if (!window.Notification || Notification.permission !== "granted") return;
    const Life = window.ALIGN_LIFE;
    if (!Life || !Life.dueAlarms) return;
    const due = Life.dueAlarms(new Date());
    if (!due) return;
    let fired = {};
    try { fired = JSON.parse(localStorage.getItem("align-alarm-fired") || "{}") || {}; } catch { fired = {}; }
    const key = due.kind + ":" + due.iso;
    if (fired[key]) return;
    fired[key] = Date.now();
    try { localStorage.setItem("align-alarm-fired", JSON.stringify(fired)); } catch { /* ignore */ }
    await localNotify(due.title, due.body, due.kind === "lights" ? "align-lights" : "align-wake");
  };

  const armLocalAlarms = () => {
    if (alarmTimer) { clearInterval(alarmTimer); alarmTimer = 0; }
    if (!state.prefs.enabled) return;
    tickAlarms();
    alarmTimer = setInterval(tickAlarms, 20000);
  };

  const enablePush = async () => {
    if (!("Notification" in window) || !("serviceWorker" in navigator) || !("PushManager" in window)) {
      return { ok: false, error: "This browser does not support push." };
    }
    const perm = await Notification.requestPermission();
    if (perm !== "granted") return { ok: false, error: "Notifications were blocked." };
    const reg = await navigator.serviceWorker.ready;
    const key = (window.ALIGN_CONFIG && window.ALIGN_CONFIG.vapidPublicKey) || "";
    let sub = await reg.pushManager.getSubscription();
    if (!sub) {
      sub = await reg.pushManager.subscribe({
        userVisibleOnly: true,
        applicationServerKey: urlBase64ToUint8Array(key)
      });
    }
    if (window.AlignDB && AlignDB.configured() && state.session) {
      const savedSub = await AlignDB.savePushSub(sub);
      if (!savedSub.ok) return { ok: false, error: savedSub.error };
    }
    state.pushReady = true;
    state.prefs.enabled = true;
    state.prefs.timezone = phoneTz();
    await AlignDB.savePrefs(state.prefs);
    armLocalAlarms();
    return { ok: true };
  };

  const disablePush = async () => {
    try {
      const reg = await navigator.serviceWorker.ready;
      const sub = await reg.pushManager.getSubscription();
      if (sub) {
        if (state.session) await AlignDB.deletePushSub(sub.endpoint);
        await sub.unsubscribe();
      }
    } catch { /* ignore */ }
    state.pushReady = false;
    state.prefs.enabled = false;
    await AlignDB.savePrefs(state.prefs);
    armLocalAlarms();
  };

  const sendTestPush = async () => {
    const Life = L();
    const note = Life.preWakeNote ? Life.preWakeNote(today().date) : Life.wakeNote(today().date);
    const title = note.title;
    const body = note.body;
    if (state.session && AlignDB.configured()) {
      try {
        const sb = AlignDB.client && AlignDB.client();
        let jwt = "";
        if (sb) {
          const { data: sess } = await sb.auth.getSession();
          jwt = sess.session && sess.session.access_token;
        }
        if (jwt) {
          const vercel = await fetch("/api/cron-push", {
            method: "POST",
            headers: { "Content-Type": "application/json", Authorization: "Bearer " + jwt },
            body: JSON.stringify({ mode: "test" })
          });
          if (vercel.ok) {
            const j = await vercel.json().catch(() => ({}));
            if (j && j.sent > 0) return { ok: true, via: "vercel" };
          }
          const url = AlignDB.readCfg().url.replace(/\/$/, "") + "/functions/v1/send-push";
          const res = await fetch(url, {
            method: "POST",
            headers: { "Content-Type": "application/json", Authorization: "Bearer " + jwt },
            body: JSON.stringify({ mode: "test" })
          });
          if (res.ok) return { ok: true, via: "edge" };
        }
      } catch { /* fall through to local */ }
    }
    await localNotify(title, body, "align-test");
    return { ok: true, via: "local" };
  };

  let applying = false;
  const applySession = async (session) => {
    state.session = session;
    if (!session) return;
    if (applying) return;
    applying = true;
    try {
    const emailName = (session.user.email || "").split("@")[0];
    const meta = session.user.user_metadata || {};
    if (!state.profile.name) {
      state.profile.name = meta.display_name || emailName;
      save();
    }
    const remote = await AlignDB.fetchWorkouts();
    if (remote.ok && remote.data && remote.data.length) {
      const byKey = {};
      state.history.forEach((h) => { if (h) byKey[h.date + "|" + h.dayId] = h; });
      remote.data.forEach((h) => {
        const k = h.date + "|" + h.dayId;
        const loc = byKey[k];
        if (!loc) byKey[k] = h;
        else if ((h.completed || 0) > (loc.completed || 0) || (h.minutes || 0) > (loc.minutes || 0)) byKey[k] = h;
      });
      state.history = Object.keys(byKey).map((k) => byKey[k]);
      save();
    }
    const prefs = await AlignDB.fetchPrefs();
    if (prefs.ok && prefs.data) state.prefs = prefs.data;
    armLocalAlarms();
    const prof = await AlignDB.fetchProfile();
    if (prof.ok && prof.data && prof.data.display_name) {
      state.profile.name = prof.data.display_name;
      save();
    }
    const life = await AlignDB.pullLife();
    if (life.ok && life.data) {
      const Life = window.ALIGN_LIFE;
      const mAll = JSON.parse(localStorage.getItem("align-morning") || "{}");
      (life.data.mornings || []).forEach((r) => {
        const local = mAll[r.date] || {};
        const steps = { ...local };
        Object.keys(r.steps || {}).forEach((k) => {
          if (!k || k.charAt(0) === "_") return;
          if (r.steps[k] || local[k]) steps[k] = true;
          else if (!(k in steps)) steps[k] = !!r.steps[k];
        });
        if (steps._times) delete steps._times;
        mAll[r.date] = steps;
      });
      localStorage.setItem("align-morning", JSON.stringify(mAll));
      if (Life && Life.mergeTimesRemote) {
        try { Life.mergeTimesRemote(life.data.mornings || []); } catch { /* keep local times */ }
      }
      const pAll = JSON.parse(localStorage.getItem("align-plans") || "{}");
      if (Life && Life.mergeByTime) Life.mergeByTime(pAll, life.data.plans, (r) => r.payload || {});
      else (life.data.plans || []).forEach((r) => { pAll[r.date] = r.payload || pAll[r.date]; });
      localStorage.setItem("align-plans", JSON.stringify(pAll));
      const jAll = JSON.parse(localStorage.getItem("align-journal") || "{}");
      if (Life && Life.mergeByTime) Life.mergeByTime(jAll, life.data.journals, (r) => r.payload || {});
      else (life.data.journals || []).forEach((r) => { jAll[r.date] = r.payload || jAll[r.date]; });
      localStorage.setItem("align-journal", JSON.stringify(jAll));
      if (Life && Life.mergeNotesRemote) Life.mergeNotesRemote(life.data.notes || []);
      if (life.data.bible && Life) {
        const c = Life.bibleCursor();
        const remoteLog = life.data.bible.log || [];
        const localLog = c.log || [];
        const seen = new Set();
        const log = [];
        remoteLog.concat(localLog).forEach((x) => {
          const k = String((x && x.id) || "") + "|" + String((x && x.date) || "");
          if (seen.has(k)) return;
          seen.add(k);
          log.push(x);
        });
        const useRemote = remoteLog.length >= localLog.length;
        Life.setBibleCursor({
          book: useRemote ? life.data.bible.book : c.book,
          chapter: useRemote ? life.data.bible.chapter : c.chapter,
          log
        });
      }
      if (life.data.affirmation && Life && Life.saveAffirmationPref) {
        try {
          const local = Life.affirmationRow ? Life.affirmationRow() : {};
          const lAt = Date.parse((local && local.updated_at) || "") || 0;
          const rAt = Date.parse(life.data.affirmation.updated_at || "") || 0;
          if (!String((local && local.text) || "").trim() || rAt >= lAt) {
            Life.saveAffirmationPref(life.data.affirmation.text || "", { updated_at: life.data.affirmation.updated_at });
          }
        } catch { /* keep local line */ }
      }
      if (life.data.scripture) {
        try {
          const local = JSON.parse(localStorage.getItem("align-scripture") || "null") || {};
          const rAt = Date.parse(life.data.scriptureAt || life.data.scripture.updated_at || "") || 0;
          const lAt = Date.parse(local.updated_at || "") || 0;
          if (!lAt || rAt > lAt) localStorage.setItem("align-scripture", JSON.stringify(life.data.scripture));
        } catch { /* keep local SRS */ }
      }
    }
    try {
      if (AlignDB.markHydrated) AlignDB.markHydrated();
      if (state.profile && state.profile.name) AlignDB.upsertProfile(state.profile.name);
      if (AlignDB.seedLocal) AlignDB.seedLocal();
      await AlignDB.flush();
    } catch { /* retry on next online */ }
    try {
      const remoteBooks = await AlignDB.fetchBooks();
      if (remoteBooks.ok && Array.isArray(remoteBooks.data)) {
        B().mergeRemote(remoteBooks.data);
      }
      const remoteLog = await AlignDB.fetchReadingLog();
      if (remoteLog.ok && remoteLog.data) B().mergeRemoteLog(remoteLog.data);
      try { (B().list() || []).forEach((b) => { if (b && b.id) AlignDB.upsertBookMeta(b); }); } catch { /* later flush */ }
      hydrateBooks().catch(() => {});
    } catch { /* books schema may not be applied yet */ }
    try {
      const remoteSounds = await AlignDB.fetchSounds();
      if (remoteSounds.ok && remoteSounds.data && window.ALIGN_SOUND) {
        ALIGN_SOUND.mergeRemote(remoteSounds.data);
      }
    } catch { /* sounds schema may not be applied yet */ }
    } finally { applying = false; }
  };

  const cloudCopy = (st, signed) => {
    if (!signed) return "";
    st = st || {};
    if (st.syncing) return "Cloud · saving…";
    if (st.pending) return "Cloud · saving " + st.pending + "…";
    if (st.error && /sign in/i.test(st.error)) return "Cloud · sign in to sync";
    if (st.error) return "Cloud · " + st.error + " · retrying";
    if (st.lastOk) {
      const s = Math.round((Date.now() - st.lastOk) / 1000);
      if (s < 45) return "Cloud · up to date";
      if (s < 3600) return "Cloud · saved " + Math.max(1, Math.round(s / 60)) + "m ago";
      return "Cloud · saved";
    }
    return "Cloud · on";
  };

  const paintCloud = () => {
    const el = document.querySelector("p.cloud");
    if (!el || !window.AlignDB || !AlignDB.status) return;
    const st = AlignDB.status();
    const line = cloudCopy(st, !!state.session);
    if (!line) return;
    el.textContent = line;
    el.classList.toggle("on", !st.error);
    el.classList.toggle("err", !!st.error);
  };

  let toastTimer = null;
  const toast = (msg) => {
    state.toast = msg;
    render();
    clearTimeout(toastTimer);
    toastTimer = setTimeout(() => {
      if (state.toast === msg) { state.toast = null; render(); }
    }, 2600);
  };

  const nowHidden = () => {
    const snd = window.ALIGN_SOUND && ALIGN_SOUND.snapshot();
    const live = !!(snd && (snd.playing || (snd.id && snd.kind)));
    return !live || ["splash", "onboard", "auth", "setup", "sound", "journalwrite", "affirm", "devotionlog", "go", "recite", "getready", "dayplan", "pray", "devotion", "bible", "verse", "lights", "evening"].includes(state.view);
  };

  const overlays = () => {
    const hideFab = ["splash", "onboard", "player", "rest", "auth", "setup", "drill", "journalwrite", "affirm", "verse", "go", "recite", "getready", "dayplan", "pray", "devotion", "bible", "lights", "evening"].includes(state.view);
    const withNav = ["home", "plan", "progress", "balance", "profile", "word", "library", "sound", "journal", "time"].includes(state.view);
    const chips = (typeof aiChips === "function") ? aiChips() : [];
    const snd = (window.ALIGN_SOUND && ALIGN_SOUND.snapshot()) || { playing: false, title: "Sound", volume: 0.42 };
    const hideNow = nowHidden();
    const nowBar = hideNow ? "" : `
      <div class="now-chip">
        <button class="now-play" data-act="${snd.playing ? "sound-pause" : "sound-resume"}" title="${snd.playing ? "Pause" : "Play"}">${snd.playing ? "❚❚" : "▶"}</button>
        <button class="now-meta" data-go="sound">
          <b>${escapeHtml(snd.title || "Sound")}</b>
          <span>${snd.playing ? "Playing" : "Paused"}</span>
        </button>
        <button class="now-x" data-act="sound-stop" title="Stop">×</button>
      </div>`;
    return `
    ${nowBar}
    ${state.toast ? `<div class="toast">${escapeHtml(state.toast)}</div>` : ""}
    ${state.sheet ? `
      <div class="sheet-bg" data-act="sheet-no">
        <div class="sheet" onclick="event.stopPropagation()">
          <div class="grab"></div>
          <h3>${escapeHtml(state.sheet.title)}</h3>
          <p>${escapeHtml(state.sheet.body)}</p>
          <button class="btn ${state.sheet.danger ? "danger" : ""}" data-act="sheet-yes">${escapeHtml(state.sheet.confirm || "OK")}</button>
          <button class="btn ghost" style="margin-top:10px" data-act="sheet-no">${escapeHtml(state.sheet.cancel || "Cancel")}</button>
        </div>
      </div>` : ""}
    ${!hideFab && !state.ai.open ? `<button class="ai-fab ${withNav ? "up" : "low"}" data-act="ai-open" title="Ask ALIGN">${stepIcon("spark")}</button>` : ""}
    ${state.ai.open ? `
      <div class="ai-bg" data-act="ai-close">
        <div class="ai-sheet" data-act="ai-nop">
          <div class="grab"></div>
          <div class="page-title" style="padding:0 0 8px">
            <div class="tag">ALIGN · AI</div>
            <h1 style="font-size:24px;margin:4px 0 0">Ask ALIGN</h1>
          </div>
          <div class="ai-chips">
            ${chips.map((c, i) => `<button data-act="ai-chip" data-i="${i}">${escapeHtml(c[0])}</button>`).join("")}
          </div>
          <div class="ai-reply">
            ${state.ai.busy ? `<p class="hint">Thinking…</p>` : ""}
            ${state.ai.error ? `<div class="err">${escapeHtml(state.ai.error)}</div>` : ""}
            ${state.ai.reply ? formatAiReply(state.ai.reply) : (!state.ai.busy && !state.ai.error ? `<p class="hint">Brief the morning, scale a session, or sit with the Word. Gemini first — Groq if it’s down.</p>` : "")}
          </div>
          ${state.ai.provider ? `<div class="ai-via">${escapeHtml((state.ai.provider === "groq" ? "Groq" : "Gemini") + " · " + state.ai.model)}</div>` : ""}
          <div class="ai-row">
            <textarea id="ai-input" rows="2" placeholder="Ask about this morning…">${escapeHtml(state.ai.input || "")}</textarea>
            <button class="btn" style="width:72px;height:44px" data-act="ai-send" ${state.ai.busy ? "disabled" : ""}>${state.ai.busy ? "…" : "Go"}</button>
          </div>
        </div>
      </div>` : ""}
  `;
  };

  const L = () => window.ALIGN_LIFE;
  const B = () => window.ALIGN_BOOKS;
  const S = () => window.ALIGN_SCRIPTURE;
  let pdfDoc = null;

  const pathSteps = () => {
    const t = today();
    const steps = (L().stepsFor(t.date) || L().STEPS).slice();
    const due = B().dueToday(t.iso, "morning");
    if (due.length) {
      const after = ["affirm", "verse", "drill", "word"];
      let at = steps.length;
      for (let k = 0; k < after.length; k++) {
        const i = steps.findIndex((s) => s.id === after[k]);
        if (i >= 0) { at = i + 1; break; }
      }
      const unread = due.filter((b) => !B().loggedToday(t.iso, b.id));
      const first = unread[0] || due[0];
      steps.splice(at, 0, {
        id: "read",
        title: "Read",
        icon: "read",
        sub: first.title + " · " + (first.pages_per_day || 8) + " pages"
      });
    }
    return steps;
  };

  const AI = () => window.ALIGN_AI;

  const aiChips = () => {
    const v = state.view;
    if (v === "home") return [
      ["Brief today", "Give a 4-line brief for this morning: the training, the Word, and one thing not to skip. If it is Sunday, keep church-leave-by-5:45 in mind."],
      ["Don't skip", "Name the one thing I should not skip this morning, given the schedule in context."]
    ];
    if (v === "ready" || v === "plan" || v === "exercise") return [
      ["Scale this", "Suggest how to shorten or ease today's session if time is tight, without throwing away the point of the day."],
      ["Shoulders tired", "If my shoulders are tired, what should I keep and what should I swap in today's session?"]
    ];
    if (v === "pray") return [
      ["A way in", "Give one sentence I could use to begin prayer. Do not write a full prayer for me to recite."]
    ];
    if (v === "devotion") return [
      ["One question", "Ask me one thoughtful question on this devotion. Do not summarize unless I ask."]
    ];
    if (v === "bible") return [
      ["One question", "Ask me one question on the open chapter that helps me actually read it. Do not replace the text."]
    ];
    if (v === "verse") return [
      ["Why this verse", "In two sentences, why hiding today's verse would help a spiritual life. Do not invent a different verse."]
    ];
    if (v === "drill") return [
      ["Missed one", "I missed a Scripture quiz item. Give one short fact that would help it stick. Do not lecture."]
    ];
    if (v === "dayplan") return [
      ["Three priorities", "From my notes and context, propose three true priorities for today. Short labels only, then one line each."]
    ];
    if (v === "library" || v === "book" || v === "reader") return [
      ["Today's sitting", "Give a simple aim for today's pages. One question to carry while I read."]
    ];
    if (v === "evening" || v === "lights") return [
      ["Wind down", "A short thought to close the day. No new tasks."]
    ];
    if (v === "journal" || v === "journalwrite") return [
      ["A way in", "Give me one honest question I could write about. Do not write the note for me."],
      ["Keep going", "From the open note, ask one follow-up. Short."]
    ];
    return [
      ["Help here", "Help me with whatever this screen is for. Keep it short."]
    ];
  };

  const aiContext = () => {
    const t = today();
    const day = todayDay();
    const clk = L().clocksFor(t.date);
    const lines = [
      "Today is " + DOW_FULL[t.dow] + " (" + t.iso + ").",
      "Training: " + day.name + " · " + day.minutes + " min · " + day.subtitle + ".",
      clk.sunday ? "Sunday church morning. Leave by 5:45 AM." : ("Wake " + clk.wakeLabel + "."),
      "Open screen: " + state.view + "."
    ];
    if (state.view === "bible" && state.bibleData) {
      lines.push("Scripture: " + (state.bibleData.reference || (state.readBook + " " + state.readCh)) + ".");
      const vs = ((state.bibleData.verses || []).slice(0, 10)).map((x) => x.verse + ". " + String(x.text || "").trim()).join(" ");
      if (vs) lines.push("Chapter start: " + vs.slice(0, 900));
    }
    if (state.spurgeonAm && (state.view === "devotion" || state.view === "home")) {
      lines.push("Morning devotion verse: " + (state.spurgeonAm.v || ""));
      lines.push("Devotion excerpt: " + String(state.spurgeonAm.b || "").slice(0, 600));
    }
    if (state.view === "ready" || state.view === "exercise" || state.view === "plan") {
      lines.push("Moves: " + day.items.map((it) => {
        const ex = exercises[it.id];
        return (ex ? ex.name : it.id) + " " + it.target;
      }).join(", ") + ".");
    }
    if (state.bookId) {
      const b = B().byId(state.bookId);
      if (b) lines.push("Book: " + b.title + ", page " + (state.pdfPage || b.current_page) + (b.pages ? " of " + b.pages : "") + ".");
    }
    try {
      const plan = L().planOf(t.iso);
      const pri = (plan.priorities || []).map(prioOf).map((x) => x.text).filter(Boolean);
      if (pri.length) lines.push("Priorities already set: " + pri.join(" · ") + ".");
      if (plan.note) lines.push("Day notes: " + String(plan.note).slice(0, 400));
    } catch { /* ignore */ }
    try {
      if (state.view === "journal" || state.view === "journalwrite") {
        lines.push("This is the ALIGN notepad — free writing, not the devotion takeaway.");
        const n = (L().noteById && state.journalNoteId) ? L().noteById(state.journalNoteId) : null;
        if (n && (n.title || n.body)) lines.push("Open note: " + [n.title, n.body].filter(Boolean).join("\n").slice(0, 500));
      }
    } catch { /* ignore */ }
    return lines.join("\n");
  };

  const focusAi = () => {
    const box = document.getElementById("ai-input");
    if (box) {
      box.focus();
      const n = box.value.length;
      try { box.setSelectionRange(n, n); } catch { /* ignore */ }
    }
  };

  const runAi = async (prompt) => {
    const q = String(prompt || "").trim();
    if (!q || state.ai.busy) return;
    state.ai.input = "";
    state.ai.busy = true;
    state.ai.error = "";
    state.ai.open = true;
    try { render(); } catch { /* keep sheet */ }
    focusAi();
    try {
      const res = await AI().ask({ prompt: q, context: aiContext() });
      state.ai.reply = (res && res.text) || "";
      state.ai.provider = (res && res.provider) || "";
      state.ai.model = (res && res.model) || "";
    } catch (e) {
      state.ai.reply = "";
      state.ai.provider = "";
      state.ai.model = "";
      const m = String((e && e.message) || "");
      state.ai.error = /abort|timed out|timeout/i.test(m) || (e && e.name === "AbortError")
        ? "That took too long. Try again."
        : (m || "Both Gemini and Groq failed.");
    } finally {
      state.ai.busy = false;
    }
    try { render(); } catch { /* keep sheet */ }
    focusAi();
  };

  const paintPdf = async () => {
    if (!pdfDoc || state.view !== "reader") return;
    const canvas = document.getElementById("pdf-canvas");
    if (!canvas) return;
    const page = await pdfDoc.getPage(state.pdfPage);
    const wrap = document.getElementById("pdf-wrap");
    const width = (wrap && wrap.clientWidth) || 390;
    const unscaled = page.getViewport({ scale: 1 });
    const dpr = Math.min(2, window.devicePixelRatio || 1);
    const vp = page.getViewport({ scale: (width / unscaled.width) * dpr });
    canvas.width = vp.width;
    canvas.height = vp.height;
    canvas.style.width = "100%";
    await page.render({ canvasContext: canvas.getContext("2d"), viewport: vp }).promise;
  };

  const closePdf = () => {
    if (pdfDoc) {
      try { pdfDoc.destroy(); } catch { /* ignore */ }
      pdfDoc = null;
    }
  };

  const syncBook = async (book) => {
    if (!book || !book.id) return { ok: false };
    if (!state.session || !AlignDB.configured()) return { ok: false };
    try {
      const blob = await B().getFile(book.id);
      if (blob && !book.storage_path) {
        const up = await AlignDB.uploadBookFile(book.id, blob);
        if (up.ok && up.data) {
          book = B().update(book.id, { storage_path: up.data }) || book;
        } else if (up && up.ok === false) {
          return { ok: false, error: up.error || "Could not upload the PDF" };
        }
      }
      return await AlignDB.upsertBookMeta(book, { now: true });
    } catch (e) {
      return { ok: false, error: (e && e.message) || "Could not sync this book" };
    }
  };

  const hydrateBooks = async () => {
    const books = B().list();
    for (const b of books) {
      if (!b.storage_path) continue;
      try {
        const have = await B().getFile(b.id);
        if (have) continue;
        const dl = await AlignDB.downloadBookFile(b.storage_path);
        if (dl.ok && dl.data) await B().putFile(b.id, dl.data);
      } catch { /* stay with what we have */ }
    }
  };

  const pullBooksCloud = async () => {
    if (!state.session || !AlignDB.configured()) return;
    try {
      const remoteBooks = await AlignDB.fetchBooks();
      if (remoteBooks.ok && Array.isArray(remoteBooks.data)) B().mergeRemote(remoteBooks.data);
      const remoteLog = await AlignDB.fetchReadingLog();
      if (remoteLog.ok && remoteLog.data) B().mergeRemoteLog(remoteLog.data);
      await hydrateBooks();
    } catch { /* keep local library */ }
  };

  const openReader = async (id) => {
    state.bookId = id;
    state.pdfBusy = true;
    state.pdfErr = "";
    state.pdfPage = 1;
    state.pdfPages = 0;
    state.view = "reader";
    closePdf();
    render();
    try {
      let blob = await B().getFile(id);
      const book = B().byId(id);
      if (!blob && book && book.storage_path) {
        const dl = await AlignDB.downloadBookFile(book.storage_path);
        if (dl.ok && dl.data) {
          blob = dl.data;
          await B().putFile(id, blob);
        }
      }
      if (!blob) throw new Error("This PDF isn’t on the phone yet. Open ALIGN online once to download it.");
      const lib = await B().loadPdfjs();
      if (!lib) throw new Error("The reader didn’t load. Refresh once with a connection.");
      const buf = await blob.arrayBuffer();
      pdfDoc = await lib.getDocument({ data: buf }).promise;
      state.pdfPages = pdfDoc.numPages || 0;
      const cur = B().byId(id);
      state.pdfPage = Math.min(Math.max(1, cur.current_page || 1), state.pdfPages || 1);
      if (cur && !cur.pages && state.pdfPages) B().update(id, { pages: state.pdfPages });
      state.pdfBusy = false;
      render();
    } catch (e) {
      state.pdfBusy = false;
      state.pdfErr = (e && e.message) || "Could not open this PDF.";
      render();
    }
  };

  const fmtClock = (sec) => {
    const m = Math.floor(sec / 60);
    const s = String(sec % 60).padStart(2, "0");
    return `${m}:${s}`;
  };

  const stepIsDone = (s, iso) => {
    iso = iso || today().iso;
    const id = typeof s === "string" ? s : (s && s.id);
    if (!id) return false;
    if (id === "evening" || id === "nightquiz" || id === "lights") {
      return !!L().morningOf(iso)[id];
    }
    const m = L().morningOf(iso);
    if (id === "move") return !!(m.move || completedOn(iso));
    if (id === "drill" || id === "affirm") {
      if (m[id]) return true;
      if (m[id] == null && m.word && (m.plan || m.ready || m.go)) return true;
      return false;
    }
    if (id === "verse") {
      if (m.verse) return true;
      if (m.verse == null && m.word) return true;
      return false;
    }
    if (id === "recite") {
      if (m.recite) return true;
      if (m.recite == null && m.go) return true;
      return false;
    }
    if (id === "read") {
      const due = B().dueToday(iso, "morning");
      if (!due.length) return true;
      return due.every((b) => B().loggedToday(iso, b.id));
    }
    return !!m[id];
  };

  const currentStep = () => pathSteps().find((s) => !stepIsDone(s)) || null;

  const canComplete = (id) => {
    if (!id) return false;
    if (id === "evening" || id === "nightquiz" || id === "lights") return true;
    if (stepIsDone(id)) return true;
    const cur = currentStep();
    return !!(cur && cur.id === id);
  };

  const canOpenStep = (id) => {
    if (!id) return true;
    if (id === "evening" || id === "nightquiz" || id === "lights") return true;
    if (stepIsDone(id)) return true;
    const cur = currentStep();
    return !!(cur && cur.id === id);
  };

  const gateStep = (id) => {
    if (canOpenStep(id)) return true;
    const cur = currentStep();
    toast(cur ? ("Finish " + cur.title + " first.") : "The morning path is done.");
    return false;
  };

  const goNext = () => {
    const cur = currentStep();
    if (!cur) {
      state.view = "home";
      render();
      return;
    }
    openPathStep(cur.id);
  };

  const openPathStep = (step) => {
    const iso = today().iso;
    try { if (step && L().markOpen) L().markOpen(iso, step); } catch { /* timing optional */ }
    if (step === "rise") {
      completeStep("rise");
      toast("Good morning.");
      goNext();
      return;
    }
    if (step === "move") {
      state.selectedDay = todayDay().id;
      state.view = "ready";
      render();
      return;
    }
    if (step === "pray") {
      const j = L().journalOf(iso);
      if (!state.prayOn && !state.praySec) state.praySec = j.praySeconds || 0;
      state.view = "pray";
      render();
      return;
    }
    if (step === "devotion") {
      state.view = "devotion";
      render();
      Promise.all([
        state.spurgeonAm ? Promise.resolve(state.spurgeonAm) : L().todaySpurgeon("am"),
        state.odb ? Promise.resolve(state.odb) : L().fetchODB()
      ]).then(([sp, odb]) => {
        state.spurgeonAm = sp;
        if (odb) state.odb = odb;
        if (state.view === "devotion") render();
      }).catch(() => {});
      return;
    }
    if (step === "evening") {
      state.view = "evening";
      render();
      (state.spurgeonPm ? Promise.resolve(state.spurgeonPm) : L().todaySpurgeon("pm"))
        .then((sp) => { state.spurgeonPm = sp; if (state.view === "evening") render(); })
        .catch(() => {});
      return;
    }
    if (step === "nightquiz") {
      stopDrillTick();
      state.drill = null;
      state.drillMode = "night";
      state.view = "drill";
      render();
      return;
    }
    if (step === "lights") {
      state.view = "lights";
      render();
      return;
    }
    if (step === "word") {
      const a = L().todayAssignment(iso);
      openBible(a.next.book, a.next.chapter);
      return;
    }
    if (step === "drill") {
      stopDrillTick();
      state.drill = null;
      state.drillMode = "morning";
      state.view = "drill";
      render();
      return;
    }
    if (step === "verse") {
      const run = () => openVerseTutor(true);
      if (state.spurgeonAm && state.spurgeonAm.v) run();
      else L().todaySpurgeon("am").then((sp) => { state.spurgeonAm = sp; run(); }).catch(() => run());
      return;
    }
    if (step === "recite") {
      const go = () => { state.view = "recite"; render(); };
      if (state.spurgeonAm && state.spurgeonAm.v) go();
      else L().todaySpurgeon("am").then((sp) => { state.spurgeonAm = sp; go(); }).catch(() => go());
      return;
    }
    if (step === "affirm") {
      state.view = "affirm";
      render();
      return;
    }
    if (step === "plan") {
      state.planJustSaved = false;
      state.view = "dayplan";
      render();
      return;
    }
    if (step === "ready") {
      state.view = "getready";
      render();
      return;
    }
    if (step === "go") {
      state.view = "go";
      render();
      return;
    }
    if (step === "read") {
      const due = B().dueToday(iso, "morning");
      const unread = due.filter((b) => !B().loggedToday(iso, b.id));
      const first = unread[0] || due[0];
      if (first) openReader(first.id);
      else goNext();
      return;
    }
    state.view = "home";
    render();
  };

  const seedTimesFromKnown = (iso) => {
    if (!L().markClose) return;
    iso = iso || today().iso;
    const m = L().morningOf(iso);
    const j = L().journalOf(iso) || {};
    if (j.praySeconds) L().markClose(iso, "pray", j.praySeconds * 1000);
    const mins = (state.history || []).filter((h) => h && h.date === iso).reduce((a, h) => a + (h.minutes || 0), 0);
    if (mins) L().markClose(iso, "move", mins * 60000);
    try {
      const daily = (S().load().daily || {})[iso] || {};
      if (m.verse || daily.verseDone) L().markClose(iso, "verse", Math.max(state.verseSitSec || 0, 120) * 1000);
      const sp = S().sprintOf ? S().sprintOf(iso) : null;
      if (m.drill || (sp && sp.answered)) L().markClose(iso, "drill", 2 * 60 * 1000);
    } catch { /* scripture optional */ }
    if (m.ready && state.readySec) L().markClose(iso, "ready", state.readySec * 1000);
  };

  const completeStep = (id) => {
    const iso = today().iso;
    if (!canComplete(id)) {
      const cur = currentStep();
      if (cur && cur.id !== id) toast("Finish " + cur.title + " first.");
      return L().morningOf(iso);
    }
    const steps = L().setStep(iso, id, true);
    let extra = 0;
    if (id === "pray") extra = (state.praySec || 0) * 1000;
    if (id === "ready") extra = (state.readySec || 0) * 1000;
    if (id === "verse") extra = Math.max(state.verseSitSec || 0, 120) * 1000;
    if (id === "drill") extra = 2 * 60 * 1000;
    if (id === "move") {
      extra = (state.history || []).filter((h) => h && h.date === iso).reduce((a, h) => a + (h.minutes || 0), 0) * 60000;
    }
    if (extra && L().markClose) L().markClose(iso, id, extra);
    AlignDB.saveMorning(iso, steps).catch(() => {});
    return steps;
  };

  let lifeTick = null;
  const ensureLifeTick = () => {
    if (lifeTick) return;
    lifeTick = setInterval(() => {
      if (state.prayOn) {
        state.praySec += 1;
        if (state.view === "pray") {
          const el = app.querySelector(".pray-time");
          if (el) el.textContent = fmtClock(state.praySec);
        }
      }
      if (state.readyOn) {
        state.readySec += 1;
        if (state.view === "getready") {
          const el = app.querySelector(".pray-time");
          if (el) el.textContent = fmtClock(state.readySec);
        }
      }
      if (state.verseSitOn && state.verseSitSec < 120) {
        state.verseSitSec += 1;
        if (state.view === "verse") {
          const el = app.querySelector(".verse-sit");
          if (el) el.textContent = fmtClock(state.verseSitSec);
          const hint = app.querySelector(".pray-stage .hint");
          const btn = app.querySelector("[data-act='verse-sit-done']");
          if (state.verseSitSec >= 120) {
            if (hint) hint.textContent = "Two minutes. Now hide it.";
            if (btn) { btn.disabled = false; btn.textContent = "Hide the words"; }
          }
        }
      }
    }, 1000);
  };

  const openBible = async (book, chapter) => {
    state.readBook = book;
    state.readCh = chapter;
    state.bibleLoading = true;
    state.bibleErr = "";
    state.bibleData = null;
    state.view = "bible";
    render();
    try {
      state.bibleData = await L().fetchChapter(book, chapter);
      const verses = (state.bibleData && state.bibleData.verses) || [];
      if (verses.length) {
        state.readPacks = (state.readPacks || []).filter((p) => !(p.book === book && p.chapter === chapter));
        state.readPacks.push({ book, chapter, verses });
        if (state.readPacks.length > 8) state.readPacks = state.readPacks.slice(-8);
        try { S().ingestReading(today().iso, state.readPacks); } catch { /* local quiz */ }
        S().enrichReading(today().iso, state.readPacks).catch(() => {});
      }
    } catch (e) {
      state.bibleErr = (e && e.message) || "Could not load this chapter. Check the connection.";
    }
    state.bibleLoading = false;
    render();
  };

  const lockDevotionVerse = () => {
    const iso = today().iso;
    const raw = (state.spurgeonAm && state.spurgeonAm.v)
      || ((L().journalOf(iso) || {}).anchorVerse)
      || "";
    let parsed = null;
    try { parsed = L().parseDevotionVerse && L().parseDevotionVerse(raw); } catch { parsed = null; }
    if (parsed && parsed.text && S().setTodayVerse) {
      S().setTodayVerse(iso, parsed);
      return parsed;
    }
    return S().todayVerse(iso);
  };

  const finishMemory = () => {
    const iso = today().iso;
    state.verseSitOn = false;
    try { S().markVerseDone(iso); } catch { /* local */ }
    if (!stepIsDone("verse")) {
      const steps = L().setStep(iso, "verse", true);
      AlignDB.saveMorning(iso, steps).catch(() => {});
      toast("Verse hidden.");
    }
    const a = L().todayAssignment(iso);
    openBible(a.next.book, a.next.chapter);
  };

  const openVerseTutor = (forceToday) => {
    const iso = today().iso;
    const tv = lockDevotionVerse() || S().todayVerse(iso);
    const daily = S().load().daily[iso] || {};
    if ((daily.verseDone || stepIsDone("verse")) && !forceToday) {
      finishMemory();
      return;
    }
    if (!tv || !tv.text) {
      toast("Save today’s devotion first. The verse is the line from that reading.");
      return;
    }
    const queue = [{ kind: "today", verse: tv }];
    state.verseSitOn = true;
    if (!state.verseSitSec) state.verseSitSec = 0;
    ensureLifeTick();
    state.verseSess = {
      queue, i: 0,
      phase: "sit",
      cloze: null, filled: [], chips: [], used: [], misses: 0, revealed: false
    };
    state.view = "verse";
    render();
  };

  const goAffirm = () => {
    state.view = "affirm";
    render();
  };

  const advanceVerse = () => {
    const sess = state.verseSess;
    if (!sess) return;
    sess.phase = "done";
    finishMemory();
  };

  let drillTick = null;
  const stopDrillTick = () => {
    if (drillTick) { clearInterval(drillTick); drillTick = null; }
  };

  const finishDrill = () => {
    stopDrillTick();
    if (!state.drill) return;
    state.drill.running = false;
    state.drill.done = true;
    S().markSprint(today().iso, {
      answered: state.drill.answered,
      correct: state.drill.correct,
      finished: Date.now()
    }, state.drill.mode || "morning");
    if ((state.drill.mode || "") === "night") {
      completeStep("nightquiz");
      toast((state.drill.correct || 0) + " right. Read the verse, then lights out.");
      openPathStep("lights");
      return;
    }
    completeStep("drill");
    toast((state.drill.correct || 0) + " / " + (state.drill.answered || 0) + " right");
    goNext();
  };

  const startDrill = (mode) => {
    const iso = today().iso;
    const kind = mode || state.drillMode || "morning";
    if ((state.readPacks || []).length) {
      try { S().ingestReading(iso, state.readPacks); } catch { /* ok */ }
    }
    const have = (S().readingQs(iso) || []).length;
    if (!have && !(L().todayAssignment(iso).read || []).length) {
      toast("Read today’s Scripture first. Questions are built from those chapters.");
      return;
    }
    stopDrillTick();
    const queue = S().dailyQueue(S().SPRINT_N, kind, iso);
    if (!queue.length) {
      toast("Read today’s Scripture first. Questions are built from those chapters.");
      return;
    }
    const first = queue[0];
    state.drillMode = kind;
    state.drill = {
      running: true,
      mode: kind,
      left: S().SPRINT_SEC,
      i: 0,
      queue,
      answered: 0,
      correct: 0,
      flash: null,
      picked: null,
      done: false,
      options: first ? S().optionsOf(first) : []
    };
    state.view = "drill";
    drillTick = setInterval(() => {
      if (!state.drill || !state.drill.running) return;
      state.drill.left -= 1;
      if (state.drill.left <= 0) {
        state.drill.left = 0;
        finishDrill();
        return;
      }
      const el = app.querySelector(".drill-clock");
      if (el) el.textContent = fmtClock(state.drill.left);
    }, 1000);
    render();
  };

  const answerDrill = (i) => {
    const d = state.drill;
    if (!d || !d.running || d.flash) return;
    const q = d.queue[d.i];
    if (!q) return finishDrill();
    const pick = d.options[i];
    const ok = pick === q.a;
    S().gradeQuiz(q.id, ok);
    d.answered += 1;
    if (ok) d.correct += 1;
    d.flash = ok ? "ok" : "no";
    d.picked = i;
    buzz(ok ? 12 : 28);
    sfx(ok ? "ok" : "no");
    render();
    setTimeout(() => {
      if (!state.drill || state.drill !== d) return;
      if (!d.running) return;
      d.flash = null;
      d.picked = null;
      d.i += 1;
      if (d.i >= d.queue.length || d.answered >= S().SPRINT_N) {
        finishDrill();
        return;
      }
      const nq = d.queue[d.i];
      d.options = nq ? S().optionsOf(nq) : [];
      render();
    }, 160);
  };

  const weekDoneCount = () => {
    const start = startOfWeek(today().date);
    const isoStart = localIso(start);
    return state.history.filter((h) => h.date >= isoStart).length;
  };

  const goalRing = (done, goal) => {
    const r = 24, c = 2 * Math.PI * r;
    const f = Math.max(0, Math.min(1, done / goal));
    return `<div class="ring-wrap">
      <svg viewBox="0 0 56 56">
        <circle cx="28" cy="28" r="${r}" fill="none" stroke="#1c1f28" stroke-width="6"/>
        <circle cx="28" cy="28" r="${r}" fill="none" stroke="#d6ff3f" stroke-width="6" stroke-linecap="round"
          stroke-dasharray="${c}" stroke-dashoffset="${c * (1 - f)}"/>
      </svg>
      <span>${done}/${goal}</span>
    </div>`;
  };

  const iconNav = {
    home: `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M4 11 12 4l8 7"/><path d="M6 10v9h12v-9"/></svg>`,
    move: `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><circle cx="12" cy="5" r="2.2"/><path d="M12 8.5v4.5M8 22l4-9 4 9M5 13h14"/></svg>`,
    word: `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M5 4h9a3 3 0 0 1 3 3v13H8a3 3 0 0 0-3 3V4z"/><path d="M14 4h5v16h-8"/></svg>`,
    you: `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><circle cx="12" cy="8" r="3.2"/><path d="M5 19c1.2-3.2 3.6-5 7-5s5.8 1.8 7 5"/></svg>`,
    journal: `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M6 4h9l5 5v11H6z"/><path d="M15 4v5h5"/><path d="M9 13h6M9 17h4"/></svg>`
  };

  const stepIcon = (name) => {
    const s = `fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round"`;
    const map = {
      rise: `<circle cx="12" cy="12" r="4" ${s}/><path d="M12 3v2M12 19v2M3 12h2M19 12h2M5.6 5.6l1.4 1.4M17 17l1.4 1.4M5.6 18.4l1.4-1.4M17 7l1.4-1.4" ${s}/>`,
      move: `<circle cx="12" cy="5" r="2.2" ${s}/><path d="M12 8.5v4.5M8 21l4-9 4 9M5 13h14" ${s}/>`,
      pray: `<path d="M12 5v6M9.5 8.5h5" ${s}/><path d="M8 20c0-2.8 1.8-4.5 4-4.5s4 1.7 4 4.5" ${s}/>`,
      book: `<path d="M5 5h9a3 3 0 0 1 3 3v12H8a3 3 0 0 0-3 3V5z" ${s}/><path d="M14 5h5v15h-8" ${s}/>`,
      word: `<path d="M5 5h9a3 3 0 0 1 3 3v12H8a3 3 0 0 0-3 3V5z" ${s}/><path d="M14 5h5v15h-8" ${s}/>`,
      plan: `<rect x="5" y="4" width="14" height="16" rx="2" ${s}/><path d="M8 9h8M8 13h6" ${s}/>`,
      ready: `<path d="M8 12l3 3 5-6" ${s}/><circle cx="12" cy="12" r="9" ${s}/>`,
      go: `<path d="M5 12h12M13 6l6 6-6 6" ${s}/>`,
      read: `<path d="M4 19V6a2 2 0 0 1 2-2h5v15H6a2 2 0 0 0-2 2z" ${s}/><path d="M13 4h5a2 2 0 0 1 2 2v13h-7V4z" ${s}/>`,
      spark: `<path d="M12 3l1.2 6.2L19 12l-5.8 2.8L12 21l-1.2-6.2L5 12l5.8-2.8L12 3z" ${s}/>`,
      bell: `<path d="M6 9a6 6 0 1 1 12 0c0 7 3 7 3 9H3c0-2 3-2 3-9" ${s}/><path d="M10 21h4" ${s}/>`,
      key: `<circle cx="8" cy="12" r="3" ${s}/><path d="M11 12h9l-2 2 2 2" ${s}/>`,
      verse: `<path d="M5 5h14v4H5zM5 12h14M5 16h10" ${s}/>`,
      drill: `<circle cx="12" cy="12" r="8" ${s}/><path d="M12 8v4l3 2" ${s}/>`,
      journal: `<path d="M6 4h9l5 5v11H6z" ${s}/><path d="M15 4v5h5" ${s}/><path d="M9 13h6M9 17h4" ${s}/>`
    };
    return `<svg viewBox="0 0 24 24" aria-hidden="true">${map[name] || map.move}</svg>`;
  };

  const nav = (active) => `
    <nav class="nav">
      <button data-go="home" class="${active==="home"?"on":""}">${iconNav.home}Today</button>
      <button data-go="plan" class="${active==="plan"?"on":""}">${iconNav.move}Move</button>
      <button data-go="word" class="${active==="word"?"on":""}">${iconNav.word}Word</button>
      <button data-go="journal" class="${active==="journal"?"on":""}">${iconNav.journal}Journal</button>
      <button data-go="profile" class="${active==="profile"?"on":""}">${iconNav.you}You</button>
    </nav>`;

  const tabFor = (view) => {
    if (view === "home" || view === "time") return "home";
    if (view === "plan" || view === "progress" || view === "balance") return "plan";
    if (view === "word" || view === "library") return "word";
    if (view === "journal") return "journal";
    if (view === "profile" || view === "sound") return "profile";
    return null;
  };

  /* ---------- VIEWS ---------- */
  const viewSplash = () => `
    <div class="screen splash">
      <div class="logo">${markSvg()}</div>
      <h1>ALIGN</h1>
      <p>The morning, in one place</p>
    </div>
  `;

  const viewOnboard = () => {
    const step = state.onboard;
    const bodies = [
      `
        <img class="hero-art" src="./assets/hero-onboard.jpg" alt="" />
        <div class="kicker">Morning OS</div>
        <h1>The morning,<br>in one place.</h1>
        <p class="lead">Wake, train, pray, Word, plan, go. Training is a step — not the whole product. Stay in ALIGN until you’re out the door.</p>
        <div class="stat-row">
          <div class="stat"><b>8</b><span>steps each morning</span></div>
          <div class="stat"><b>7</b><span>days, one to recover</span></div>
          <div class="stat"><b>1</b><span>app until you’re out</span></div>
          <div class="stat"><b>0</b><span>tabs to hunt</span></div>
        </div>
      `,
      `
        <div class="kicker">The path</div>
        <h1>Same order.<br>Every day.</h1>
        <p class="lead">A quiet sequence so the morning doesn’t have to be decided twice.</p>
        <div class="keep-list">
          <div class="keep"><div class="ic" style="background:#d6ff3f22;color:#d6ff3f">${stepIcon("rise")}</div><div><h4>Rise</h4><p>You’re up. The day is a gift.</p></div></div>
          <div class="keep"><div class="ic" style="background:#ff6b4a22;color:#ff6b4a">${stepIcon("move")}</div><div><h4>Train</h4><p>Body first, while the mind is quiet. Bodyweight, at home.</p></div></div>
          <div class="keep"><div class="ic" style="background:#8b7cff22;color:#8b7cff">${stepIcon("pray")}</div><div><h4>Pray & Word</h4><p>Prayer, devotion, Scripture — in the app, not another tab.</p></div></div>
          <div class="keep"><div class="ic" style="background:#3ee0b322;color:#3ee0b3">${stepIcon("go")}</div><div><h4>Plan, ready, go</h4><p>Three priorities. Then bath, dress, and step out.</p></div></div>
        </div>
      `,
      `
        <div class="kicker">Sunday · weekdays</div>
        <h1>Church morning<br>is built in.</h1>
        <p class="lead">Sunday rises at 4:00, trains for twelve minutes, reads one chapter, and leaves by 5:45. Weekdays rise at 5:00 with a fuller session and 3–4 chapters.</p>
        <div class="stat-row">
          <div class="stat"><b>4:00</b><span>Sunday rise</span></div>
          <div class="stat"><b>5:45</b><span>leave for church</span></div>
          <div class="stat"><b>5:00</b><span>Mon–Sat rise</span></div>
          <div class="stat"><b>1:00</b><span>Mon–Sat lights out</span></div>
        </div>
      `,
      `
        <div class="kicker">Move</div>
        <h1>Six work days.<br>One to recover.</h1>
        <p class="lead">Push, pull, legs, core, mobility — balanced so no pattern owns the week.</p>
        <div class="week-preview">
          ${days.map(d => `
            <div class="wp p-${d.pattern}">
              <div class="d">${DOW[d.dow]}</div>
              <div>
                <div style="font-weight:700;font-size:14px">${d.name}</div>
                <div style="font-size:11px;color:var(--muted)">${d.minutes} min · ${d.items.length} moves</div>
              </div>
              <span class="chip" style="background:color-mix(in srgb, var(--p) 18%, transparent);color:var(--p)">${d.short}</span>
            </div>
          `).join("")}
        </div>
      `,
      `
        <div class="kicker">You</div>
        <h1>What should we<br>call you?</h1>
        <p class="lead">It shows on Today. You can skip this and change it later.</p>
        <div class="name-field">
          <label>Name</label>
          <input id="name-input" maxlength="24" placeholder="Your name" value="${escapeAttr(state.profile.name)}" />
        </div>
      `
    ];
    const labels = ["See the path", "Sunday & hours", "The week", "Almost there", "Open ALIGN"];
    return `
      <div class="onboard">
        <div class="onboard-top">
          <div class="brand"><div class="mark">${markSvg()}</div>ALIGN</div>
          <button class="skip" data-act="skip-onboard">Skip</button>
        </div>
        <div class="dots">${[0,1,2,3,4].map(i => `<i class="${i===step?"on":""}"></i>`).join("")}</div>
        <div class="onboard-body">${bodies[step]}</div>
        <button class="btn" data-act="next-onboard">${labels[step]}</button>
      </div>
    `;
  };

  const barCol = (obj) => {
    const max = 80;
    return ["push","pull","legs","core","mobility"].map(k => `
      <div class="hbar">
        <div class="t">${k}</div>
        <div class="track"><div class="bar-fill" style="width:${Math.round(obj[k]/max*100)}%;background:${PATTERN_HEX[k]}"></div></div>
      </div>
    `).join("");
  };

  const markSvg = () => `<svg width="16" height="16" viewBox="0 0 16 16" fill="none"><path d="M2 12 L8 3 L14 12" stroke="#111" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round"/><path d="M5 12h6" stroke="#111" stroke-width="2.2" stroke-linecap="round"/></svg>`;

  const isoOf = (d) => localIso(d);

  const clipText = (s, n) => {
    const t = String(s || "").replace(/\s+/g, " ").trim();
    if (t.length <= n) return t;
    return t.slice(0, n).replace(/\s+\S*$/, "").trim() + "…";
  };

  const prettyIso = (iso) => {
    const [y, m, d] = String(iso).split("-").map(Number);
    const dt = new Date(y, (m || 1) - 1, d || 1);
    const sameYear = dt.getFullYear() === new Date().getFullYear();
    return DOW_FULL[dt.getDay()] + " · " + dt.toLocaleDateString(undefined, {
      month: "short",
      day: "numeric",
      year: sameYear ? undefined : "numeric"
    });
  };

  const morningDone = (iso) => {
    const m = L().morningOf(iso);
    if (m.go) return true;
    const steps = L().STEPS || [];
    return steps.length > 0 && steps.every((s) => !!m[s.id]);
  };

  const morningStreak = () => {
    let n = 0;
    const d = new Date();
    if (!morningDone(isoOf(d))) d.setDate(d.getDate() - 1);
    for (let i = 0; i < 365; i++) {
      if (morningDone(isoOf(d))) { n++; d.setDate(d.getDate() - 1); }
      else break;
    }
    return n;
  };

  const bestMorningStreak = () => {
    let best = 0, cur = 0;
    const d = new Date();
    for (let i = 0; i < 180; i++) {
      if (morningDone(isoOf(d))) { cur++; if (cur > best) best = cur; }
      else cur = 0;
      d.setDate(d.getDate() - 1);
    }
    return Math.max(best, morningStreak());
  };

  const weekPulse = () => {
    const start = startOfWeek(today().date);
    const isoStart = isoOf(start);
    let mornings = 0, sessions = 0;
    const days = [];
    for (let i = 0; i < 7; i++) {
      const d = new Date(start);
      d.setDate(start.getDate() + i);
      const iso = isoOf(d);
      const md = morningDone(iso);
      const sess = !!completedOn(iso);
      if (md) mornings++;
      if (sess) sessions++;
      days.push({ iso, dow: i, morning: md, session: sess, isToday: iso === today().iso });
    }
    let chapters = 0;
    try {
      chapters = (L().bibleCursor().log || []).filter((x) => x.date >= isoStart).length;
    } catch { /* ignore */ }
    return { mornings, sessions, chapters, days };
  };

  const streakCopy = (n) => {
    if (n <= 0) return "Start today. The first morning counts.";
    if (n === 1) return "Day one is in. Come back tomorrow.";
    if (n < 7) return n + " mornings in a row. Don’t break it.";
    if (n < 21) return "A week-plus streak. This is the habit.";
    return n + " days. Guard this.";
  };

  const prioOf = (x) => {
    if (x && typeof x === "object") return { text: String(x.text || "").trim(), done: !!x.done };
    return { text: String(x || "").trim(), done: false };
  };

  const viewHome = () => {
    const t = today();
    const day = todayDay();
    const name = (state.profile.name || "").trim();
    const morn = L().morningOf(t.iso);
    const steps = pathSteps();
    const dueM = B().dueToday(t.iso, "morning");
    const readDone = !dueM.length || dueM.every((b) => B().loggedToday(t.iso, b.id));
    const doneN = steps.filter((s) => s.id === "read" ? readDone : (morn[s.id] || (s.id === "move" && !!completedOn(t.iso)))).length;
    const dueE = B().dueToday(t.iso, "evening");
    const cur = currentStep();
    const assign = L().todayAssignment(t.iso);
    const nextRef = assign.next;
    const moveDone = !!completedOn(t.iso) || morn.move;
    const clk = L().clocksFor(t.date);
    const evening = L().isEvening(t.date);
    const allDone = !cur || !!morn.go;
    const install = state.installPrompt ? `
      <div class="install-banner">
        <p><strong style="color:var(--text)">Add ALIGN to your Home Screen</strong> so it opens like an app.</p>
        <button data-act="install-pwa">Add</button>
      </div>` : "";

    const plan = L().planOf(t.iso);
    const prioRows = (plan.priorities || []).map(prioOf);
    const prios = prioRows.map((x) => x.text).filter(Boolean);
    const planTasks = (plan.tasks || []).filter((x) => x && String(x.text || "").trim());
    const planNote = String(plan.note || "").trim();
    const jn = L().journalOf(t.iso);
    if (morn.devotion) {
      try { lockDevotionVerse(); } catch { /* ok */ }
    }
    const tv = S().todayVerse(t.iso);
    const verseRef = (tv && S().refOf) ? S().refOf(tv) : "";
    const verseBody = tv && tv.text ? String(tv.text).trim() : "";
    const verseDone = !!(S().load().daily[t.iso] && S().load().daily[t.iso].verseDone);
    const showWord = !!(verseDone && verseBody);
    const wordToday = showWord ? `
        <div class="dash-card word-today">
          <div class="section-h"><h4>Memory verse</h4><button class="linkish" data-act="open-step" data-step="verse">Open</button></div>
          <p class="word-verse">${verseRef ? `<span class="word-ref">${escapeHtml(verseRef)}</span> ` : ""}${escapeHtml(verseBody)}</p>
        </div>` : "";
    const planNow = (prios.length || planTasks.length || planNote || morn.plan || state.planJustSaved) ? `
        <div class="plan-now">
          ${state.planJustSaved ? `<div class="saved-banner">Saved. This is today’s plan.</div>` : ""}
          <div class="section-h"><h4>Today’s plan</h4><button class="linkish" data-act="open-step" data-step="plan">Edit</button></div>
          ${prioRows.some((x) => x.text) ? prioRows.map((pr, i) => pr.text ? `<button type="button" class="plan-pri ${pr.done ? "done" : ""}" data-act="toggle-prio" data-i="${i}"><span>${pr.done ? "✓" : (i + 1)}</span><p>${escapeHtml(pr.text)}</p></button>` : "").join("") : (morn.plan ? `<p class="plan-note-preview">No priorities written — tap Edit.</p>` : "")}
          ${planTasks.map((tk, i) => `<button type="button" class="plan-task ${tk.done ? "done" : ""}" data-act="toggle-task" data-i="${i}">${tk.done ? "✓" : "○"} ${escapeHtml(tk.text)}</button>`).join("")}
          ${planNote ? `<p class="plan-note-preview">${escapeHtml(planNote)}</p>` : ""}
          ${(prios.length || planTasks.length) ? `<button type="button" class="linkish plan-mark" data-act="schedule-done">${(prioRows.every((x) => !x.text || x.done) && planTasks.every((x) => x.done)) ? "Schedule complete" : "Mark all done"}</button>` : ""}
        </div>` : "";

    const subFor = (s) => {
      if (s.id === "move") return moveDone ? "Session logged" : `${day.name} · ${day.minutes} min`;
      if (s.id === "word") {
        const n = (assign.read || []).length;
        return n ? `${n} chapter${n===1?"":"s"} read` : `${nextRef.book} ${nextRef.chapter}`;
      }
      if (s.id === "read") {
        return readDone ? "Sitting done" : s.sub;
      }
      if (s.id === "plan") {
        return prios.length ? prios.join(" · ") : s.sub;
      }
      if (s.id === "drill") {
        const sp = S().sprintOf(t.iso);
        return sp && sp.answered ? (sp.correct || 0) + " / " + sp.answered + " right" : s.sub;
      }
      if (s.id === "verse") {
        return (S().load().daily[t.iso] && S().load().daily[t.iso].verseDone) ? "Hidden" : s.sub;
      }
      if (s.id === "affirm") {
        return morn.affirm ? "Spoken" : s.sub;
      }
      if (s.id === "recite") {
        return morn.recite ? "Read again" : s.sub;
      }
      return s.sub;
    };

    const weekStart = startOfWeek(t.date);
    const weekDots = [0,1,2,3,4,5,6].map((i) => {
      const d = new Date(weekStart);
      d.setDate(weekStart.getDate() + i);
      const iso = isoOf(d);
      const isToday = iso === t.iso;
      const done = morningDone(iso);
      return `<button type="button" class="wd${isToday?" today":""}${done?" done":""}" aria-label="${DOW_FULL[i]}"><span class="n">${DOW[i][0]}</span><span class="dot">${d.getDate()}</span></button>`;
    }).join("");

    const nextCta = cur
      ? (cur.id === "rise" ? "I’m up" : cur.id === "move" ? "Open session" : cur.id === "go" ? "Step out" : "Continue")
      : "Begin the day";

    const mStreak = morningStreak();
    const pulse = weekPulse();
    const best = bestMorningStreak();

    const stepRow = (s, done, now, act, extra = "") => `
      <button class="path-step ${done?"done":""} ${now?"now":""} ${!done && !now?"lock":""}" ${act}>
        <div class="path-ico">${done ? "✓" : now ? "→" : stepIcon(s.icon || s.id)}</div>
        <div class="path-copy">
          <h4>${s.title}</h4>
          <p>${s.sub || ""}</p>
        </div>
      </button>${extra}`;

    return `
      <div class="screen home">
        <div class="topbar">
          <div class="greet">${greet()}<h2>${name ? escapeHtml(name) : DOW_FULL[t.dow]}</h2></div>
          <button class="avatar" data-go="profile" title="You">${initials()}</button>
        </div>
        ${state.offline ? `<div class="offline">You’re offline. The morning still works on this device.</div>` : ""}
        ${install}
        <div class="home-week">
          <div class="week-strip">${weekDots}</div>
          <div class="pulse">
            <div class="pulse-top">
              <div class="pulse-num">${mStreak}</div>
              <div>
                <h4>Day streak</h4>
                <p>${streakCopy(mStreak)}${best > mStreak ? " Best " + best + "." : ""}</p>
              </div>
            </div>
            <div class="pulse-stats">
              <div><b>${pulse.mornings}/7</b><span>Mornings</span></div>
              <div><b>${pulse.sessions}</b><span>Sessions</span></div>
              <div><b>${pulse.chapters}</b><span>Chapters</span></div>
            </div>
            ${(() => {
              const ms = (L().dayTotalMs && L().dayTotalMs(t.iso)) || 0;
              const ideal = (L().pathIdealMs && L().pathIdealMs(t.iso, { trainMin: day.minutes, chapters: L().chapterTarget(t.iso) })) || 0;
              const label = ms >= 1000
                ? ((L().fmtSpan && L().fmtSpan(ms)) || "") + " / " + ((L().fmtSpan && L().fmtSpan(ideal)) || "") + " ideal"
                : "Ideal vs actual · open Time";
              return `<button type="button" class="time-link" data-go="time"><b>${escapeHtml(label)}</b><span>Pace</span></button>`;
            })()}
          </div>
        </div>
        ${(() => {
          const snd = (window.ALIGN_SOUND && ALIGN_SOUND.snapshot()) || { playing: false, title: "Sound", id: "" };
          const line = snd.playing
            ? ("Playing · " + (snd.title || "Sound"))
            : (snd.id ? ((snd.title || "Sound") + " · paused") : "Stations, library, or your own audio — in ALIGN.");
          return `
        <div class="sound-now">
          <button class="now-play" data-act="sound-toggle" title="${snd.playing ? "Pause" : "Play"}">${snd.playing ? "❚❚" : "▶"}</button>
          <button class="sound-now-meta" data-go="sound">
            <h4>${escapeHtml(snd.playing || snd.id ? (snd.title || "Sound") : "Sound")}</h4>
            <p>${escapeHtml(line)}</p>
          </button>
        </div>`;
        })()}
        ${wordToday}
        ${planNow}
        <div class="next-hero ${allDone ? "done-hero-card" : ""}">
          <div class="tag">${clk.sunday ? "Sunday · church morning" : (evening ? "Evening" : "Up next")}</div>
          <h3>${allDone ? (clk.sunday ? "Go to church." : "Day is open.") : escapeHtml(cur ? cur.title : "Rise")}</h3>
          <p>${allDone
            ? (clk.sunday ? "The light path is done. Church is the first appointment." : "You walked the whole path. Go well.")
            : (cur ? (subFor(cur) + ((L().idealMinFor && L().idealMinFor(t.iso, cur.id, { trainMin: day.minutes, chapters: L().chapterTarget(t.iso) })) ? (" · ideal " + L().idealMinFor(t.iso, cur.id, { trainMin: day.minutes, chapters: L().chapterTarget(t.iso) }) + " min") : "")) : "Mark rise and the morning begins.")}</p>
          ${allDone
            ? ""
            : `<button class="btn" data-act="open-step" data-step="${cur ? cur.id : "rise"}">${nextCta}</button>`}
        </div>
        ${evening && dueE.length ? `
          <div class="section-h" style="padding:0 16px"><h4>Tonight’s book</h4></div>
          <div class="path">
            ${dueE.map((b) => {
              const done = B().loggedToday(t.iso, b.id);
              return stepRow(
                { id: "read", icon: "read", title: escapeHtml(b.title), sub: done ? "Sitting done" : "Page " + (b.current_page || 1) + (b.pages ? " of " + b.pages : "") + " · " + (b.pages_per_day || 8) + " pages" },
                done,
                !done,
                `data-act="open-book" data-id="${b.id}"`
              );
            }).join("")}
          </div>
        ` : ""}
        <div class="section-h" style="padding:0 16px"><h4>The path</h4><span>${doneN}/${steps.length}</span></div>
        <div class="morning-progress"><i style="width:${Math.round(doneN/Math.max(1,steps.length)*100)}%"></i></div>
        ${(() => {
          const rows = steps.map((s) => {
            const done = s.id === "read" ? readDone : (!!morn[s.id] || (s.id === "move" && moveDone));
            const now = !!(cur && cur.id === s.id && !done);
            return { s, done, now };
          });
          const finished = rows.filter((r) => r.done);
          const open = rows.filter((r) => !r.done);
          return `
        ${finished.length ? `<div class="path-done">${finished.map((r) => `<span>✓ ${escapeHtml(r.s.title)}</span>`).join("")}</div>` : ""}
        ${open.length ? `<div class="path">${open.map((r) => stepRow(
            { ...r.s, sub: r.now ? subFor(r.s) : ("After " + (cur ? cur.title : "the last step")) },
            false,
            r.now,
            r.now ? `data-act="open-step" data-step="${r.s.id}"` : `data-act="locked-step"`
          )).join("")}</div>` : ""}`;
        })()}
      </div>
    `;
  };


  const weekIsos = (offset) => {
    const start = startOfWeek(today().date);
    start.setDate(start.getDate() + (Number(offset) || 0) * 7);
    return [0, 1, 2, 3, 4, 5, 6].map((i) => {
      const d = new Date(start);
      d.setDate(start.getDate() + i);
      return isoOf(d);
    });
  };

  const weekTime = (offset) => {
    const isos = weekIsos(offset);
    const byStep = {};
    let total = 0, daysN = 0;
    const days = [];
    isos.forEach((iso) => {
      const ms = (L().dayTotalMs && L().dayTotalMs(iso)) || 0;
      if (ms >= 1000) daysN++;
      total += ms;
      days.push({ iso, ms });
      ((L().timingParts && L().timingParts(iso)) || []).forEach((p) => {
        byStep[p.id] = (byStep[p.id] || 0) + p.ms;
      });
    });
    return { isos, total, daysN, days, byStep, avg: daysN ? Math.round(total / daysN) : 0 };
  };

  const viewTime = () => {
    const t = today();
    const fmt = (ms) => (L().fmtSpan && L().fmtSpan(ms)) || "—";
    const optsFor = (iso) => {
      const parts = String(iso).split("-").map(Number);
      const dt = new Date(parts[0], (parts[1] || 1) - 1, parts[2] || 1);
      const day = days.find((x) => x.dow === dt.getDay()) || todayDay();
      return { trainMin: day.minutes, chapters: L().chapterTarget(iso) };
    };
    const opts = optsFor(t.iso);
    const times = (L().timesOf && L().timesOf(t.iso)) || {};
    const morn = L().morningOf(t.iso);
    const cur = currentStep();
    let live = 0;
    try {
      const row = cur && times[cur.id] ? times[cur.id] : {};
      if (row && row.open && !row.ms) live = Math.max(0, Date.now() - row.open);
    } catch { live = 0; }
    const rows = (L().STEPS || []).map((s) => {
      const ideal = (L().idealMsFor && L().idealMsFor(t.iso, s.id, opts)) || 0;
      const actual = (times[s.id] && times[s.id].ms) || 0;
      const shown = (cur && cur.id === s.id && live > actual) ? live : actual;
      const done = !!morn[s.id] || (s.id === "move" && !!completedOn(t.iso));
      const kind = (L().paceKind && L().paceKind(s.id, shown, ideal)) || "open";
      return { id: s.id, title: s.title, ideal, actual: shown, done, kind, live: !!(cur && cur.id === s.id && live >= 1000 && !done) };
    });
    const todayMs = rows.reduce((n, r) => n + (r.actual || 0), 0);
    const idealMs = (L().pathIdealMs && L().pathIdealMs(t.iso, opts)) || rows.reduce((n, r) => n + r.ideal, 0);
    const windowMs = (L().pathWindowMs && L().pathWindowMs(t.iso)) || idealMs;
    const sunday = L().clocksFor(t.date).sunday;
    const maxBar = Math.max(idealMs, todayMs, 1);
    const kindLabel = { pace: "On pace", long: "Over", short: "Short", held: "Held", open: "—" };
    const focus = rows
      .filter((r) => r.actual >= 1000 || r.done)
      .filter((r) => r.kind === "long" || r.kind === "short")
      .map((r) => Object.assign({}, r, { mag: Math.abs(r.actual - r.ideal) }))
      .sort((a, b) => b.mag - a.mag)
      .slice(0, 2);
    const notes = [];
    if (todayMs < 1000 && !rows.some((r) => r.done)) {
      notes.push("Finish a step. Ideal vs actual is how you see which part of the morning needs you.");
    } else {
      if (todayMs > windowMs + 3 * 60000) {
        notes.push(sunday
          ? "The path is over the 5:45 window. Cut from ready and plan — not the Word."
          : "The path ran past the 90 min aim. Find the leak below.");
      } else if (todayMs >= 1000 && todayMs <= idealMs + 2 * 60000 && rows.filter((r) => r.done || r.actual >= 1000).length >= 4) {
        notes.push("The morning is inside the mark. Keep the Word full.");
      }
      focus.forEach((f) => {
        const over = f.actual - f.ideal;
        if (f.kind === "long") {
          notes.push(f.title + " used " + fmt(f.actual) + " against " + fmt(f.ideal) + ". That’s " + fmt(over) + " over — this is where the morning leaks.");
        } else {
          notes.push(f.title + " was " + fmt(f.actual) + " against " + fmt(f.ideal) + ". Short by " + fmt(-over) + ". Don’t starve this.");
        }
      });
    }
    const cmpRow = (r) => {
      const delta = r.actual && r.ideal ? (r.actual - r.ideal) : 0;
      const dLab = !r.actual
        ? "—"
        : (Math.abs(delta) < 60000 ? "on pace" : ((delta > 0 ? "+" : "−") + fmt(Math.abs(delta))));
      const actPct = Math.max(2, Math.min(100, Math.round(r.actual / maxBar * 100)));
      const idPct = Math.max(2, Math.min(100, Math.round(r.ideal / maxBar * 100)));
      const k = r.actual >= 1000 ? r.kind : "open";
      return `
        <div class="time-cmp">
          <div class="lab">${escapeHtml(r.title)}${r.live ? " · now" : ""}<span>${kindLabel[k] || "—"}</span></div>
          <b class="ideal">${fmt(r.ideal)}</b>
          <b class="${k}">${r.actual >= 1000 ? fmt(r.actual) : (r.done ? "Done" : "—")}</b>
          <b class="${k}">${dLab}</b>
          <div class="time-track"><i class="ideal" style="width:${idPct}%"></i><i class="act ${k}" style="width:${actPct}%"></i></div>
        </div>`;
    };
    const thisW = weekTime(0);
    const weekRows = thisW.isos.map((iso) => {
      const o = optsFor(iso);
      const act = (L().dayTotalMs && L().dayTotalMs(iso)) || 0;
      const ideal = (L().pathIdealMs && L().pathIdealMs(iso, o)) || 0;
      const win = (L().pathWindowMs && L().pathWindowMs(iso)) || ideal;
      const parts = (L().timingParts && L().timingParts(iso)) || [];
      let wordAct = 0, wordIdeal = 0;
      ["devotion", "verse", "word", "drill", "recite"].forEach((id) => {
        wordIdeal += (L().idealMsFor && L().idealMsFor(iso, id, o)) || 0;
        const hit = parts.find((x) => x.id === id);
        wordAct += (hit && hit.ms) || 0;
      });
      const over = act > win + 3 * 60000;
      const starved = wordAct >= 1000 && wordIdeal && wordAct < wordIdeal * 0.7;
      return { iso, act, ideal, win, over, starved };
    });
    const timedDays = weekRows.filter((d) => d.act >= 1000);
    const inAim = timedDays.filter((d) => !d.over && !d.starved).length;
    const weekFocus = [];
    if (timedDays.length) {
      const overN = timedDays.filter((d) => d.over).length;
      const starN = timedDays.filter((d) => d.starved).length;
      if (overN) weekFocus.push(overN + " morning" + (overN === 1 ? "" : "s") + " ran past the window.");
      if (starN) weekFocus.push("The Word was short on " + starN + " day" + (starN === 1 ? "" : "s") + ". Guard the chapters.");
      if (!overN && !starN) weekFocus.push("This week is inside the mark. Hold it.");
    }
    const areaIds = [
      { title: "Pray & affirm", ids: ["pray", "affirm"] },
      { title: "The Word", ids: ["devotion", "verse", "word", "drill", "recite"] },
      { title: "Train & ready", ids: ["move", "ready"] },
      { title: "Plan & go", ids: ["plan", "go"] }
    ];
    const areaBlock = areaIds.map((a) => {
      let act = 0, ideal = 0;
      a.ids.forEach((id) => {
        act += thisW.byStep[id] || 0;
        thisW.isos.forEach((iso) => {
          if (((L().dayTotalMs && L().dayTotalMs(iso)) || 0) < 1000) return;
          ideal += (L().idealMsFor && L().idealMsFor(iso, id, optsFor(iso))) || 0;
        });
      });
      if (act < 1000 && ideal < 1000) return "";
      const kind = ideal && act > ideal * 1.2 ? "long" : (ideal && act < ideal * 0.75 ? "short" : "pace");
      const d = act - ideal;
      const dLab = !timedDays.length || Math.abs(d) < 60000 ? "" : ((d > 0 ? "+" : "−") + fmt(Math.abs(d)));
      return `<div class="time-day"><span>${escapeHtml(a.title)}</span><b class="${kind}">${act >= 1000 ? fmt(act) : "—"} / ${ideal ? fmt(ideal) : "—"} ideal${dLab ? `<i>${dLab}</i>` : ""}</b></div>`;
    }).join("");
    const dayRows = weekRows.map((d) => {
      const dt = new Date(d.iso + "T12:00:00");
      const name = DOW[dt.getDay()];
      const isToday = d.iso === t.iso;
      const mark = d.act < 1000 ? "—" : (d.over ? "over" : (d.starved ? "short" : "pace"));
      return `<div class="time-day ${isToday ? "today" : ""}"><span>${isToday ? "Today" : name}</span><b class="${mark === "—" ? "" : mark}">${d.act >= 1000 ? fmt(d.act) + " / " + fmt(d.ideal) : "—"}</b></div>`;
    }).join("");
    const liveLine = (cur && live >= 1000)
      ? `<p class="hint" style="padding:0 16px">Now on ${escapeHtml(cur.title)} · ${fmt(live)} of ${fmt((L().idealMsFor && L().idealMsFor(t.iso, cur.id, opts)) || 0)} ideal</p>`
      : "";
    const headHint = sunday ? "Sunday window 4:00–5:45 · 105 min" : "Weekday aim 90 min · don’t cut the Word to make it";
    return `
      <div class="screen home">
        <div class="topbar"><div class="greet">Time<h2>Pace.</h2></div>
          <button class="linkish" data-go="home">Today</button>
        </div>
        <p class="plan-kicker">${headHint}. Ideal is the mark. Actual is what happened. The gap is where to focus.</p>
        ${liveLine}
        <div class="time-area">
          <div class="section-h" style="padding:0;margin:0 0 8px"><h4>This morning</h4><span>${todayMs >= 1000 ? fmt(todayMs) : "—"} / ${fmt(idealMs)}</span></div>
          <div class="pulse-stats" style="margin:0 0 10px;padding:0;border:0">
            <div><b>${todayMs >= 1000 ? fmt(todayMs) : "—"}</b><span>Actual</span></div>
            <div><b>${fmt(idealMs)}</b><span>Ideal</span></div>
            <div><b>${fmt(windowMs)}</b><span>${sunday ? "To 5:45" : "Aim"}</span></div>
          </div>
          <div class="time-track big"><i class="ideal" style="width:${Math.min(100, Math.round(idealMs / Math.max(windowMs, idealMs, todayMs, 1) * 100))}%"></i><i class="act ${todayMs > windowMs ? "long" : "pace"}" style="width:${Math.min(100, Math.round(todayMs / Math.max(windowMs, idealMs, todayMs, 1) * 100))}%"></i></div>
          ${notes.map((n) => `<p class="hint" style="margin:10px 0 0">${escapeHtml(n)}</p>`).join("")}
        </div>
        ${focus.length ? `
        <div class="time-focus">
          <div class="section-h" style="padding:0;margin:0 0 6px"><h4>Needs focus</h4></div>
          ${focus.map((f) => `<p><strong>${escapeHtml(f.title)}</strong> · ${fmt(f.actual)} actual · ${fmt(f.ideal)} ideal</p>`).join("")}
        </div>` : ""}
        <div class="time-area">
          <div class="section-h" style="padding:0;margin:0 0 4px"><h4>By step</h4><span>Ideal · actual</span></div>
          <div class="time-cmp head"><div class="lab"></div><b class="ideal">Ideal</b><b>Used</b><b>Gap</b></div>
          ${rows.map(cmpRow).join("")}
        </div>
        <div class="time-area">
          <div class="section-h" style="padding:0;margin:0 0 8px"><h4>This week</h4><span>${timedDays.length ? inAim + "/" + timedDays.length + " on aim" : "—"}</span></div>
          <div class="pulse-stats" style="margin:0;padding:0;border:0">
            <div><b>${thisW.daysN ? fmt(thisW.avg) : "—"}</b><span>Avg used</span></div>
            <div><b>${timedDays.length ? fmt(Math.round(timedDays.reduce((n, d) => n + d.ideal, 0) / timedDays.length)) : "—"}</b><span>Avg ideal</span></div>
            <div><b>${timedDays.length ? inAim + "/" + timedDays.length : "—"}</b><span>On aim</span></div>
          </div>
          ${weekFocus.map((n) => `<p class="hint" style="margin:10px 0 0">${escapeHtml(n)}</p>`).join("")}
          ${areaBlock}
        </div>
        <div class="time-area">
          <div class="section-h" style="padding:0;margin:0 0 4px"><h4>Days</h4><span>Used / ideal</span></div>
          ${dayRows}
        </div>
      </div>
    `;
  };

  const viewPlan = () => {
    const t = today();
    const todayD = todayDay();
    const moveDone = !!completedOn(t.iso);
    return `
      <div class="screen plan">
        <div class="topbar"><div class="greet">Move<h2>This week.</h2></div>
          <button class="linkish" data-go="progress">Log</button>
        </div>
        <div class="hero p-${todayD.pattern}">
          <div class="tag">${moveDone ? "Logged today" : "Today · " + DOW_FULL[todayD.dow]}</div>
          <h3>${todayD.name}</h3>
          <p class="sub">${todayD.subtitle}</p>
          <div class="hero-meta"><span><b>${todayD.minutes}</b> min</span><span><b>${todayD.items.length}</b> moves</span></div>
          <button class="btn p" data-go-day="${todayD.dow}">${moveDone ? "Review session" : "Open session"}</button>
        </div>
        <p class="plan-kicker">Bodyweight · no gear. One step on the morning path — Word and plan live on Today.</p>
        ${days.map(d => `
          <button class="day-card p-${d.pattern} ${d.dow===t.dow?"today":""}" data-go-day="${d.dow}">
            <div class="when">${DOW[d.dow]}</div>
            <div>
              <h3>${d.name}</h3>
              <p>${d.subtitle} · ${d.items.length} moves</p>
            </div>
            <div class="mins">${d.minutes}m</div>
          </button>
        `).join("")}
      </div>
    `;
  };

  const viewReady = () => {
    const day = days.find(d => d.id === state.selectedDay) || todayDay();
    return `
      <div class="screen full has-cta p-${day.pattern}">
        <div class="back-row">
          <button class="icon-btn" data-go="plan">${chev()}</button>
        </div>
        <div class="page-title">
          <div class="tag">${DOW_FULL[day.dow]} · ${day.minutes} min</div>
          <h1>${day.name}</h1>
          <p>${day.subtitle} · bodyweight</p>
        </div>
        <div class="why">${day.why}</div>
        <div class="ex-list">
          ${day.items.map((it, i) => {
            const ex = exercises[it.id];
            return `
              <button class="ex-row p-${ex.pattern}" data-ex="${ex.id}" data-day="${day.id}">
                <div class="ex-ico">${pose(ex.svg)}</div>
                <div>
                  <h4>${ex.name}${it.side ? " " + it.side : ""}</h4>
                  <div class="meta">${ex.muscles.join(" · ")}</div>
                </div>
                <div class="tgt">${fmtTarget(ex, it.target, null)}</div>
              </button>
            `;
          }).join("")}
        </div>
        <div class="sticky-cta"><button class="btn p" data-act="start-day" data-day="${day.id}">Start ${day.name}</button></div>
      </div>
    `;
  };

  const ytEmbed = (id, title) => {
    if (!id) return "";
    const src = "https://www.youtube-nocookie.com/embed/" + encodeURIComponent(id)
      + "?rel=0&modestbranding=1&playsinline=1";
    const label = String(title || "How to").replace(/[&<>"]/g, (c) => (
      { "&": "&amp;", "<": "&lt;", ">": "&gt;", "\"": "&quot;" }[c]
    ));
    return `<div class="yt-card"><iframe src="${src}" title="${label}" allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture; web-share" allowfullscreen loading="lazy" referrerpolicy="strict-origin-when-cross-origin"></iframe></div>`;
  };

  const viewExercise = () => {
    const ex = exercises[state.selectedExercise];
    if (!ex) return viewHome();
    return `
      <div class="screen full p-${ex.pattern}">
        <div class="back-row">
          <button class="icon-btn" data-go="${state.selectedDay ? "ready" : "home"}">${chev()}</button>
        </div>
        <div class="page-title">
          <div class="tag">${ex.pattern}</div>
          <h1>${ex.name}</h1>
          <p>${ex.muscles.join(" · ")}</p>
        </div>
        ${ex.yt ? ytEmbed(ex.yt, "How to " + ex.name) : `
        <div style="display:flex;justify-content:center;padding:8px 0 16px">
          <div class="big-ico">${pose(ex.svg)}</div>
        </div>`}
        <ul class="cues">${ex.cues.map(c => `<li>${c}</li>`).join("")}</ul>
        ${ex.yt ? `<p class="hint" style="padding:0 20px 28px">Watch how. Then the cues. Stay in ALIGN.</p>` : ""}
      </div>
    `;
  };

  const viewPlayer = () => {
    const w = state.workout;
    const day = days.find(d => d.id === w.dayId);
    const it = itemsOf(w)[w.index];
    const ex = exercises[it.id];
    const total = itemsOf(w).length;
    const pct = ((w.index) / total) * 100;
    const isTime = ex.kind === "time";
    const display = isTime ? w.remaining : w.actual;
    const unit = isTime ? "sec" : "reps";
    const nxt = w.index + 1 < total ? itemsOf(w)[w.index + 1] : null;
    const nxtEx = nxt ? exercises[nxt.id] : null;

    return `
      <div class="screen full player p-${ex.pattern}">
        <div class="player-top">
          <button class="icon-btn" data-act="quit-workout">${chev()}</button>
          <div style="font-size:12px;color:var(--muted);font-weight:700">${w.index + 1} / ${total}</div>
          <button class="icon-btn" data-act="skip-ex" title="Skip">
            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M5 4l10 8-10 8V4zM19 4v16"/></svg>
          </button>
        </div>
        <div class="prog-thin"><i style="width:${pct}%"></i></div>
        <div class="player-stage">
          ${it.side ? `<div class="side">${it.side === "L" ? "Left side" : "Right side"}</div>` : ""}
          <div class="big-ico">
            ${isTime ? ringSvg(w.remaining / it.target) : ""}
            ${pose(ex.svg)}
          </div>
          <h2>${ex.name}</h2>
          <div class="counter">${isTime ? w.remaining : w.actual}<small>${unit}</small></div>
          <p class="cue">${ex.cues[0]}</p>
          ${!isTime ? `
            <div class="adj">
              <button data-act="adj" data-d="-1">−</button>
              <button data-act="adj" data-d="1">+</button>
            </div>
          ` : ""}
          ${ex.yt ? `<button class="btn ghost how-btn" data-act="toggle-how">${state.showHow ? "Hide guide" : "Watch how"}</button>` : ""}
          ${state.showHow && ex.yt ? ytEmbed(ex.yt, "How to " + ex.name) : ""}
        </div>
        <div class="player-actions">
          <button class="btn p" data-act="complete-ex">${isTime ? "Done" : "Done"}</button>
          <div class="row-btns">
            ${isTime ? `<button class="btn ghost" data-act="pause-ex">${w.paused ? "Resume" : "Pause"}</button>` : `<button class="btn ghost" data-act="skip-ex">Skip</button>`}
            <button class="btn ghost" data-act="swap-ex">Swap</button>
          </div>
        </div>
      </div>
    `;
  };

  const viewRest = () => {
    const w = state.workout;
    const next = itemsOf(w)[w.index];
    const ex = exercises[next.id];
    const r = 96, circ = 2 * Math.PI * r;
    return `
      <div class="screen full rest-view">
        <div class="next">Up next · ${w.index + 1}/${itemsOf(w).length}</div>
        <h2>${ex.name}${next.side ? " " + next.side : ""}</h2>
        <div class="rest-ring-wrap">
          <svg viewBox="0 0 220 220">
            <circle cx="110" cy="110" r="${r}" fill="none" stroke="#1c1f28" stroke-width="8"/>
            <circle class="rest-arc" cx="110" cy="110" r="${r}" fill="none" stroke="#d6ff3f" stroke-width="8" stroke-linecap="round"
              stroke-dasharray="${circ}" stroke-dashoffset="0" transform="rotate(-90 110 110)"/>
          </svg>
          <div class="rest-num">${w.rest}</div>
        </div>
        <p style="color:var(--muted);margin:0 0 24px">Rest</p>
        <div style="width:100%;max-width:320px;display:flex;flex-direction:column;gap:10px">
          <button class="btn" data-act="skip-rest">I'm ready</button>
          <button class="btn ghost" data-act="add-rest">+10 seconds</button>
        </div>
      </div>
    `;
  };

  const viewDone = () => {
    const w = state.workout;
    const day = days.find(d => d.id === w.dayId);
    const sec = Math.max(1, Math.round((Date.now() - w.startedAt) / 1000));
    const mins = Math.floor(sec / 60);
    const logged = w.log.filter(x => x.status === "done").length;
    return `
      <div class="screen full done">
        <div class="done-hero">
          <img class="done-burst" src="./assets/done-burst.jpg" alt="" />
          <div class="kicker">Session logged</div>
          <h1>${day.name}<br>done.</h1>
          <p class="lead" style="color:var(--muted)">Back to the path. Word is next if you haven’t opened it.</p>
          <div class="done-stats">
            <div><b>${mins}m</b><span>time</span></div>
            <div><b>${logged}</b><span>logged</span></div>
            <div><b>${streak() + 1}</b><span>streak</span></div>
          </div>
        </div>
        <button class="btn" data-act="save-workout">Save & continue</button>
      </div>
    `;
  };

  const viewProgress = () => {
    const total = state.history.length;
    const minutes = state.history.reduce((a, h) => a + (h.minutes || 0), 0);
    const pulse = weekPulse();
    const mStreak = morningStreak();
    const trainStreak = streak();
    return `
      <div class="screen progress">
        <div class="topbar"><div class="greet">Move<h2>History.</h2></div>
          <button class="linkish" data-go="plan">Week</button>
        </div>
        <div class="pulse" style="margin-left:0;margin-right:0">
          <div class="pulse-top">
            <div class="pulse-num">${trainStreak}</div>
            <div>
              <h4>Session streak</h4>
              <p>${trainStreak ? trainStreak + " training day" + (trainStreak===1?"":"s") + " in a row." : "Finish today’s session to start a chain."} Morning streak ${mStreak}.</p>
            </div>
          </div>
          <div class="pulse-days" aria-hidden="true">
            ${pulse.days.map((d) => `<i class="${d.session?"on":""} ${d.isToday?"today":""}"></i>`).join("")}
          </div>
          <div class="pulse-stats">
            <div><b>${total}</b><span>All-time</span></div>
            <div><b>${minutes}</b><span>Minutes</span></div>
            <div><b>${pulse.sessions}/7</b><span>This week</span></div>
          </div>
        </div>
        <div class="section-h"><h4>Recent</h4></div>
        ${total === 0 ? `<div class="empty">No sessions yet. Finish today’s training and it lands here.</div>` : `
          <div class="hist">
            ${[...state.history].reverse().slice(0, 20).map(h => {
              const d = days.find(x => x.id === h.dayId);
              return `
                <div class="hist-row">
                  <div class="sw" style="background:${PATTERN_HEX[d?.pattern || "push"]}"></div>
                  <div style="flex:1">
                    <div style="font-weight:700;font-size:14px">${d?.name || h.dayId}</div>
                    <div style="font-size:12px;color:var(--muted)">${h.date} · ${h.minutes} min · ${h.completed}/${h.total}</div>
                  </div>
                </div>`;
            }).join("")}
          </div>
        `}
      </div>
    `;
  };

  const viewBalance = () => `
    <div class="screen balance">
      <div class="topbar"><div class="greet">Move<h2>How it’s built.</h2></div></div>
      <p class="plan-kicker" style="padding-top:0">A typical press-heavy week versus ALIGN — push, pull, legs, core, and mobility each get a real seat.</p>
      <div class="compare">
        <div class="col"><h5>Unbalanced</h5>${barCol(insights.old)}</div>
        <div class="col"><h5>ALIGN</h5>${barCol(insights.neu)}</div>
      </div>
      ${insights.findings.map(f => `<div class="find"><h4>${f.title}</h4><p>${f.body}</p></div>`).join("")}
    </div>
  `;

  const viewAuth = () => {
    const connected = AlignDB.configured();
    const tab = state.authTab;
    return `
      <div class="screen full">
        <div class="back-row">
          <button class="icon-btn" data-go="home">${chev()}</button>
          <div class="brand" style="margin-left:4px"><div class="mark">${markSvg()}</div>ALIGN</div>
        </div>
        <div class="page-title">
          <div class="kicker">${connected ? "Account" : "Local only"}</div>
          <h1>${tab === "signup" ? "Create your account." : "Welcome back."}</h1>
          <p>${connected ? "Your morning syncs across devices. Reminders need an account." : "Accounts aren’t connected on this build."}</p>
        </div>
        <div style="padding:0 20px 24px">
          ${!connected ? `
            <p class="hint">You can still walk the morning on this device without an account.</p>
            <button class="btn" data-go="home">Continue</button>
          ` : `
            <div class="seg">
              <button class="${tab==="signin"?"on":""}" data-act="auth-tab" data-tab="signin">Sign in</button>
              <button class="${tab==="signup"?"on":""}" data-act="auth-tab" data-tab="signup">Create account</button>
            </div>
            ${state.authError ? `<div class="err">${escapeHtml(state.authError)}</div>` : ""}
            ${state.authInfo ? `<div class="okmsg">${escapeHtml(state.authInfo)}</div>` : ""}
            <div class="field"><label>Email</label>
              <input id="auth-email" type="email" autocomplete="email" inputmode="email" placeholder="you@email.com" value="${escapeAttr(state.authEmail)}" />
            </div>
            ${tab !== "magic" ? `<div class="field"><label>Password</label>
              <div class="pw">
                <input id="auth-pass" type="${state.showPass ? "text" : "password"}" autocomplete="${tab==="signup"?"new-password":"current-password"}" placeholder="At least 6 characters" />
                <button type="button" data-act="toggle-pass">${state.showPass ? "Hide" : "Show"}</button>
              </div>
            </div>` : ""}
            ${tab === "signup" ? `<div class="field"><label>Name</label>
              <input id="auth-name" maxlength="24" placeholder="What we call you" value="${escapeAttr(state.profile.name)}" />
            </div>` : ""}
            <button class="btn ${state.authBusy?"busy":""}" data-act="auth-submit">${
              state.authBusy ? "Working…" : tab === "signup" ? "Create account" : tab === "magic" ? "Email me a link" : "Sign in"
            }</button>
            <div style="display:flex;justify-content:space-between;margin-top:14px">
              <button class="linkish" data-act="auth-tab" data-tab="${tab==="magic"?"signin":"magic"}">${tab==="magic"?"Use password":"Magic link instead"}</button>
              <button class="linkish" data-act="auth-forgot">Forgot password</button>
            </div>
            <button class="btn ghost" style="margin-top:18px" data-go="home">Skip for now</button>
          `}
        </div>
      </div>
    `;
  };

  const viewSetup = () => {
    const cfg = AlignDB.readCfg();
    const url = state.setupUrl || cfg.url || "";
    const key = state.setupKey || cfg.anonKey || "";
    return `
      <div class="screen full">
        <div class="back-row">
          <button class="icon-btn" data-go="profile">${chev()}</button>
        </div>
        <div class="page-title">
          <div class="kicker">Backend</div>
          <h1>Connect Supabase.</h1>
          <p>One project powers accounts, synced history, and push. Takes about five minutes.</p>
        </div>
        <div style="padding:0 20px 28px">
          <div class="steps">
            <div class="step"><b>1. Create a project</b><p>Go to supabase.com → New project. Wait until it’s ready.</p></div>
            <div class="step"><b>2. Copy the API keys</b><p>Project Settings → API. You need the Project URL and the anon public key. Never paste the service role key in this app.</p></div>
            <div class="step"><b>3. Run the SQL</b><p>SQL Editor → paste the ALIGN schema → Run. That creates tables, RLS, and the new-user trigger.</p>
              <button class="btn ghost" data-act="copy-sql" style="margin-top:10px;height:44px">Copy schema SQL</button>
            </div>
            <div class="step"><b>4. Auth settings</b><p>Authentication → Providers → Email on. For easier testing, turn off “Confirm email”. Add this site’s URL under Redirect URLs.</p></div>
            <div class="step"><b>5. Push (optional)</b><p>Run <code>sql/push-alarms.sql</code> in the SQL Editor so 5-min-before-rise and 10-min-before-lights still arrive when ALIGN is closed.</p></div>
          </div>
          ${state.setupErr ? `<div class="err">${escapeHtml(state.setupErr)}</div>` : ""}
          ${state.setupMsg ? `<div class="okmsg">${escapeHtml(state.setupMsg)}</div>` : ""}
          <div class="field"><label>Project URL</label>
            <input id="sb-url" placeholder="https://xxxx.supabase.co" value="${escapeAttr(url)}" />
          </div>
          <div class="field"><label>Anon public key</label>
            <textarea id="sb-key" placeholder="eyJhbGciOi…">${escapeHtml(key)}</textarea>
          </div>
          <button class="btn ${state.authBusy?"busy":""}" data-act="save-supabase">Save & test connection</button>
        </div>
      </div>
    `;
  };

  const viewProfile = () => {
    const email = state.session && state.session.user ? state.session.user.email : "";
    const signed = !!state.session;
    const nBooks = B().list().length;
    return `
      <div class="screen home">
        <div class="topbar"><div class="greet">You<h2>Account.</h2></div></div>
        <div style="padding:0 16px calc(var(--nav-h) + var(--safe-b) + 16px)">
          <div class="account-card">
            <div class="avatar">${initials()}</div>
            <div class="grow">
              <h3>${escapeHtml(state.profile.name || "ALIGN")}</h3>
              <p>${signed ? escapeHtml(email) : "On this device · create an account to sync"}</p>
              ${(() => {
                const st = (window.AlignDB && AlignDB.status) ? AlignDB.status() : { pending: 0, error: "", lastOk: 0, syncing: false };
                const line = cloudCopy(st, signed);
                return line ? `<p class="cloud ${st.error ? "err" : "on"}">${escapeHtml(line)}</p>` : "";
              })()}
            </div>
          </div>

          <div class="set-label">Profile</div>
          <div class="field"><label>Display name</label>
            <input id="prof-name" maxlength="24" placeholder="Your name" value="${escapeAttr(state.profile.name)}" />
          </div>
          <button class="btn ghost" data-act="save-name" style="height:44px">Save name</button>
          ${signed ? `<button class="btn ghost" style="height:44px;margin-top:8px" data-act="sync-now">Sync now</button>` : ""}

          <div class="set-label">Morning hours</div>
          <div class="sched-card">
            <div class="sched-row"><span class="k">Sunday rise</span><span class="v">4:00 AM</span></div>
            <div class="sched-row"><span class="k">Sunday · church</span><span class="v">Leave 5:45 AM</span></div>
            <div class="sched-row"><span class="k">Sunday lights out</span><span class="v">12:00 AM</span></div>
            <div class="sched-row"><span class="k">Mon–Sat rise</span><span class="v">5:00 AM</span></div>
            <div class="sched-row"><span class="k">Mon–Sat lights out</span><span class="v">1:00 AM</span></div>
          </div>

          <div class="set-label">Notifications</div>
          <div class="setting">
            <div class="grow">
              <h4>Reminders</h4>
              <p>${state.prefs.enabled ? "On · 5 min before rise · 10 min before lights out" : "Off · 5 min before 4:00 / 5:00 · 10 min before midnight / 1:00"}</p>
            </div>
            <button class="toggle ${state.prefs.enabled?"on":""}" data-act="toggle-push"><i></i></button>
          </div>
          <button class="btn ghost" data-act="test-push" style="height:44px">Send a test</button>

          <div class="set-label">Sound</div>
          <button class="setting" data-go="sound">
            <div class="grow"><h4>Play through the morning</h4><p>Stations in the app, or your own audio. Cues when a step lands.</p></div>
          </button>

          <div class="set-label">Affirmation</div>
          <div class="field"><label>Daily line</label>
            <textarea class="note-box" id="pref-affirm" placeholder="The word you speak every morning.">${escapeHtml(L().affirmationPref())}</textarea>
          </div>
          <button class="btn ghost" data-act="save-affirm" style="height:44px">Save affirmation</button>

          <div class="set-label">Journal</div>
          <button class="setting" data-go="journal">
            <div class="grow"><h4>Notepad</h4><p>Write anything. New notes whenever you want. Not the devotion.</p></div>
          </button>
          <button class="setting" data-act="open-devotionlog">
            <div class="grow"><h4>Devotion journal</h4><p>Past morning takeaways.</p></div>
          </button>

          <div class="set-label">Intelligence</div>
          ${(() => {
            const srv = AI().server ? AI().server() : { ready: false, checked: false };
            const line = !srv.checked
              ? "Checking Vercel…"
              : srv.ready
                ? ("Vercel · " + [srv.gemini ? "Gemini" : "", srv.groq ? "Groq" : ""].filter(Boolean).join(" + ") + ". Keys stay on the server.")
                : "Add GEMINI_API_KEY and GROQ_API_KEY in Vercel → Settings → Environment Variables, then redeploy.";
            return `<p class="hint" style="margin-top:0">${escapeHtml(line)}</p>
              <div class="cloud ${srv.ready?"on":""}" style="margin:0 0 12px">${srv.ready ? "Server ready" : "Waiting on Vercel keys"}</div>`;
          })()}
          <div class="field"><label>Prefer</label>
            <div class="seg" style="grid-template-columns:1fr 1fr 1fr">
              <button class="${AI().load().prefer==="auto"?"on":""}" data-act="ai-prefer" data-p="auto">Auto</button>
              <button class="${AI().load().prefer==="gemini"?"on":""}" data-act="ai-prefer" data-p="gemini">Gemini</button>
              <button class="${AI().load().prefer==="groq"?"on":""}" data-act="ai-prefer" data-p="groq">Groq</button>
            </div>
          </div>
          <div class="set-label">Library</div>
          <div class="set-stack">
            <button class="setting" data-go="library">
              <div class="grow"><h4>Books</h4><p>${nBooks ? nBooks + " PDF" + (nBooks===1?"":"s") + " on this device" : "Upload PDFs. Read them offline."}</p></div>
            </button>
            <button class="setting" data-go="balance">
              <div class="grow"><h4>How training is built</h4><p>Push, pull, legs, core, recover</p></div>
            </button>
          </div>

          <div class="set-label">App</div>
          ${state.installPrompt ? `
            <button class="setting" data-act="install-pwa">
              <div class="grow"><h4>Add to Home Screen</h4><p>Install ALIGN like an app</p></div>
            </button>` : `
            <div class="setting"><div class="grow"><h4>Add to Home Screen</h4><p>iPhone: Share → Add to Home Screen</p></div></div>
          `}

          ${signed
            ? `<button class="btn ghost" style="margin-top:18px" data-act="sign-out">Sign out</button>`
            : `<button class="btn" style="margin-top:18px" data-go="auth">Create account</button>`
          }
          <div class="ver">ALIGN</div>
        </div>
      </div>
    `;
  };

  const viewSound = () => {
    const snd = (window.ALIGN_SOUND && ALIGN_SOUND.snapshot()) || { stations: [], tracks: [], library: [], volume: 0.42, sfxOn: true, playing: false, id: "", kind: "" };
    const stations = snd.stations || [];
    const tracks = snd.tracks || [];
    const library = snd.library || [];
    const signed = !!state.session;
    return `
      <div class="screen">
        <div class="back-row"><button class="icon-btn" data-go="home">${chev()}</button></div>
        <div class="page-title">
          <div class="tag">Sound</div>
          <h1>Stay in ALIGN.</h1>
          <p>Open recordings in the library. Your own files upload to your account.</p>
        </div>
        <div class="scroll-body" style="padding:0 16px calc(var(--nav-h) + 24px)">
          <div class="set-label" style="padding-top:0">ALIGN library</div>
          <p class="hint" style="margin-top:0">Public-domain field recordings (PDsounds via Wikimedia). Stored on your ALIGN database after you run the sounds SQL.</p>
          <div class="station-grid">
            ${library.map((s) => `
              <button class="station ${snd.kind==="library" && snd.id===s.id && snd.playing ? "on" : ""}" data-act="sound-library" data-id="${s.id}">
                <h4>${escapeHtml(s.title)}</h4>
                <p>${escapeHtml((s.artist || "Open source") + (s.mood ? " · " + s.mood : ""))}</p>
              </button>`).join("")}
          </div>
          <div class="set-label">Stations</div>
          <div class="station-grid">
            ${stations.map((s) => `
              <button class="station ${snd.kind==="station" && snd.id===s.id && snd.playing ? "on" : ""}" data-act="sound-station" data-id="${s.id}">
                <h4>${escapeHtml(s.name)}</h4>
                <p>${escapeHtml(s.sub)}</p>
              </button>`).join("")}
          </div>
          <div class="set-label">Your music</div>
          <p class="hint" style="margin-top:0">${signed ? "Uploads save to your account and this phone." : "Saved on this phone. Sign in to keep them on your account."}</p>
          <input id="sound-files" type="file" accept="audio/*,.mp3,.m4a,.aac,.wav,.ogg,.flac" multiple hidden />
          <button class="btn ghost" style="height:44px" data-act="sound-add">${state.uploadBusy ? "Saving…" : "Upload audio"}</button>
          <div class="track-list">
            ${tracks.length ? tracks.map((t) => `
              <div class="setting">
                <button class="grow" data-act="sound-track" data-id="${t.id}" style="text-align:left">
                  <h4>${escapeHtml(t.name)}</h4>
                  <p>${snd.kind==="track" && snd.id===t.id && snd.playing ? "Playing" : "On this phone"}</p>
                </button>
                <button class="linkish" data-act="sound-remove" data-id="${t.id}">Remove</button>
              </div>`).join("") : `<p class="hint">Nothing added yet.</p>`}
          </div>
          <div class="set-label">Cues</div>
          <div class="setting">
            <div class="grow"><h4>Sound feedback</h4><p>A short tone when a step, set, or rest lands.</p></div>
            <button class="toggle ${snd.sfxOn?"on":""}" data-act="sound-sfx"><i></i></button>
          </div>
          <div class="field" style="margin-top:12px">
            <label>Volume</label>
            <input id="sound-vol" type="range" min="0" max="100" value="${Math.round((snd.volume || 0) * 100)}" />
          </div>
          ${snd.playing ? `<button class="btn ghost" style="height:44px;margin-top:8px" data-act="sound-stop">Stop</button>` : ""}
        </div>
      </div>
    `;
  };

  const viewWord = () => {
    const iso = today().iso;
    const a = L().todayAssignment(iso);
    const j = L().journalOf(iso);
    const n = (a.read || []).length;
    const target = L().chapterTarget(iso);
    const scriptureSub = n
      ? n + " / " + target + " today · next " + a.next.book + " " + a.next.chapter
      : (target === 1 ? "Sunday · one chapter · " : "Today · ") + a.next.book + " " + a.next.chapter;
    const st = S().stats();
    const tv = S().todayVerse(iso);
    const sprint = S().sprintOf(iso);
    const nightSp = S().nightSprintOf ? S().nightSprintOf(iso) : null;
    const readQs = (S().readingQs && S().readingQs(iso)) || [];
    const verseSub = tv
      ? (S().load().daily[iso] && S().load().daily[iso].verseDone
        ? S().refOf(tv) + " · hidden"
        : S().refOf(tv) + " · from today’s reading")
      : (n ? "A verse from what you just read" : "Read first. Then hide one line.");
    const sprintSub = sprint && sprint.answered
      ? sprint.answered + " in 2 min · " + (sprint.correct || 0) + " right"
      : "2 minutes · " + S().SPRINT_N + " questions · meaning, not verse trivia";
    return `
      <div class="screen home">
        <div class="topbar"><div class="greet">Word<h2>Stay here.</h2></div></div>
        <p class="plan-kicker">Pray. Devotion. Two minutes on the verse. Hide it. Scripture. Sprint. Affirm. Read it again before you go — and before bed.</p>
        <div class="hub-grid">
          <button class="hub-card" data-act="open-step" data-step="pray">
            <div class="tile">${stepIcon("pray")}</div>
            <h3>Pray</h3>
            <p>${j.praySeconds ? fmtClock(j.praySeconds) + " today" : "Before you read. Before you plan."}</p>
          </button>
          <button class="hub-card" data-act="open-step" data-step="devotion">
            <div class="tile">${stepIcon("book")}</div>
            <h3>Devotion</h3>
            <p>${j.devotion ? "Takeaway saved" : "Spurgeon in the app. Write what remains."}</p>
          </button>
          <button class="hub-card wide" data-act="open-step" data-step="word">
            <div class="tile">${stepIcon("word")}</div>
            <div>
              <h3>Scripture</h3>
              <p>${scriptureSub}</p>
            </div>
          </button>
          <button class="hub-card ${tv && !(S().load().daily[iso] && S().load().daily[iso].verseDone) ? "ready" : ""}" data-act="open-verse">
            <div class="tile">${stepIcon("verse")}</div>
            <h3>Memory</h3>
            <p>${verseSub}</p>
          </button>
          <button class="hub-card" data-act="open-drill">
            <div class="tile">${stepIcon("drill")}</div>
            <h3>Sprint</h3>
            <p>${sprintSub}</p>
          </button>
          <button class="hub-card" data-act="open-step" data-step="affirm">
            <div class="tile">${stepIcon("spark")}</div>
            <h3>Affirm</h3>
            <p>${L().morningOf(iso).affirm ? "Spoken today" : "Read today’s word over yourself."}</p>
          </button>
          <button class="hub-card" data-act="open-step" data-step="evening">
            <div class="tile">${stepIcon("rise")}</div>
            <h3>Evening</h3>
            <p>${nightSp && nightSp.answered ? "Night test " + nightSp.correct + "/" + nightSp.answered : "Night Word, then the same chapters again."}</p>
          </button>
          <button class="hub-card" data-go="library">
            <div class="tile">${stepIcon("read")}</div>
            <h3>Books</h3>
            <p>${B().list().length ? B().list().length + " on this device" : "Upload a PDF. Read offline."}</p>
          </button>
        </div>
        <div class="pulse" style="margin-top:4px">
          <div class="pulse-top">
            <div class="pulse-num">${st.verseStreak}</div>
            <div>
              <h4>Verse streak</h4>
              <p>${st.learned} hidden · ${st.due} due · sprint ${st.acc ? st.acc + "%" : "—"}.</p>
            </div>
          </div>
        </div>
      </div>
    `;
  };

  const currentVerse = () => {
    const sess = state.verseSess;
    if (!sess || !sess.queue || !sess.queue.length) return null;
    return sess.queue[sess.i] || null;
  };

  const startCloze = (verse) => {
    const c = S().clozeOf(verse.text, verse.text.split(/\s+/).length > 18 ? 4 : 3);
    const decoys = S().shuffle(verse.text.split(/\s+/)
      .map((w) => w.replace(/[^A-Za-z']/g, ""))
      .filter((w) => w.length >= 4 && !c.answers.includes(w)));
    const chips = S().shuffle(c.answers.concat(decoys.slice(0, 3)));
    state.verseSess.cloze = c;
    state.verseSess.filled = [];
    state.verseSess.chips = chips;
    state.verseSess.used = [];
    state.verseSess.misses = 0;
  };

  const viewVerse = () => {
    const sess = state.verseSess;
    if (!sess) {
      return `
        <div class="screen full">
          <div class="back-row"><button class="icon-btn" data-go="home">${chev()}</button></div>
          <div class="page-title"><div class="tag">Memory</div><h1>The devotion verse.</h1>
            <p>Two minutes on the line from this morning’s devotion. Then hide the words.</p></div>
          <div style="padding:0 22px"><button class="btn" data-act="open-step" data-step="verse">Begin</button></div>
        </div>`;
    }
    const item = currentVerse();
    const v = item && item.verse;
    if (!v) {
      return `
        <div class="screen full has-cta">
          <div class="back-row"><button class="icon-btn" data-go="home">${chev()}</button></div>
          <div class="done-hero" style="padding:24px 22px">
            <div class="kicker">Memory</div>
            <h1>Hidden.</h1>
            <p class="lead" style="color:var(--muted)">Scripture is next. You’ll read this line again before you go, and once more at lights out.</p>
          </div>
          <div class="sticky-cta">
            <button class="btn" data-act="verse-continue">Continue to Scripture</button>
          </div>
        </div>`;
    }
    const phase = sess.phase;
    if (phase === "sit") {
      const left = Math.max(0, 120 - (state.verseSitSec || 0));
      const ready = left <= 0;
      return `
        <div class="screen full has-cta">
          <div class="back-row"><button class="icon-btn" data-go="home">${chev()}</button></div>
          <div class="page-title" style="padding-bottom:4px">
            <div class="tag">From today’s devotion</div>
            <h1>Read it for 2 minutes.</h1>
            <p>Stay with the line. Don’t rush it. Then you’ll hide the words.</p>
          </div>
          <div class="pray-stage">
            <div class="pray-time verse-sit">${fmtClock(state.verseSitSec || 0)}</div>
            <p class="hint">${ready ? "Two minutes. Now hide it." : "Keep reading until the clock hits 2:00."}</p>
          </div>
          <div class="verse-body">
            <div class="verse-card">
              <div class="verse-theme">Devotion</div>
              <div class="ref">${escapeHtml(S().refOf(v))}</div>
              <q class="mv-text">${escapeHtml(v.text)}</q>
            </div>
          </div>
          <div class="sticky-cta">
            <button class="btn" data-act="verse-sit-done" ${ready ? "" : "disabled"}>${ready ? "Hide the words" : "Keep reading"}</button>
          </div>
        </div>`;
    }
    const n = sess.queue.length;
    const tag = item.kind === "today" ? "Today’s verse" : "Review";
    const clozeHtml = () => {
      const c = sess.cloze;
      if (!c) return "";
      let fi = 0;
      const body = c.parts.map((p, i) => {
        if (!c.pick.includes(i)) return escapeHtml(p);
        const got = sess.filled[fi];
        fi += 1;
        return got
          ? `<span class="mv-blank">${escapeHtml(got)}</span>`
          : `<span class="mv-blank">&nbsp;</span>`;
      }).join("");
      return `<p class="mv-text">${body}</p>
        <div class="chip-row">
          ${sess.chips.map((w, i) => `<button class="${sess.used.includes(i) ? "used" : ""}" ${sess.used.includes(i) ? "disabled" : ""} data-act="cloze-tap" data-i="${i}">${escapeHtml(w)}</button>`).join("")}
        </div>`;
    };
    return `
      <div class="screen full has-cta">
        <div class="back-row">
          <button class="icon-btn" data-go="home">${chev()}</button>
          <div style="flex:1"></div>
          <span class="linkish">${sess.i + 1} / ${n}</span>
        </div>
        <div class="page-title" style="padding-bottom:4px">
          <div class="tag">${tag} · ${escapeHtml(v.theme || "The Word")}</div>
          <h1>${phase === "grade" ? "How did it sit?" : phase === "cloze" ? "Fill the line." : phase === "recall" ? "Say it." : "Hide it."}</h1>
          <p>${phase === "learn" ? "The line from this morning’s devotion." : phase === "recall" ? "First letters. Speak it. Then grade yourself honestly." : phase === "cloze" ? "Tap the missing words, in order." : "Again if it slipped. Easy if you could preach it."}</p>
        </div>
        <div class="verse-body">
          <div class="verse-card">
            <div class="verse-theme">${escapeHtml(v.theme || "Scripture")}</div>
            <div class="ref">${escapeHtml(S().refOf(v))}</div>
            ${phase === "learn" || phase === "grade" || (phase === "recall" && sess.revealed)
              ? `<q class="mv-text">${escapeHtml(v.text)}</q>`
              : phase === "cloze" ? clozeHtml()
              : `<p class="mv-text" style="letter-spacing:.04em">${escapeHtml(S().initialsOf(v.text))}</p>`}
            ${phase === "learn" ? `<p class="verse-why">${escapeHtml(v.why || "")}</p>` : ""}
          </div>
        </div>
        <div class="sticky-cta">
          ${phase === "learn" ? `<button class="btn" data-act="verse-next">I’ve read it · hide words</button>` : ""}
          ${phase === "recall" && !sess.revealed ? `<button class="btn" data-act="verse-reveal">Reveal</button>` : ""}
          ${phase === "recall" && sess.revealed ? `
            <div class="grade-row">
              <button class="g-again" data-act="verse-grade" data-g="0">Again</button>
              <button class="g-hard" data-act="verse-grade" data-g="1">Hard</button>
              <button class="g-good" data-act="verse-grade" data-g="2">Good</button>
              <button class="g-easy" data-act="verse-grade" data-g="3">Easy</button>
            </div>` : ""}
          ${phase === "grade" ? `
            <div class="grade-row">
              <button class="g-again" data-act="verse-grade" data-g="0">Again</button>
              <button class="g-hard" data-act="verse-grade" data-g="1">Hard</button>
              <button class="g-good" data-act="verse-grade" data-g="2">Good</button>
              <button class="g-easy" data-act="verse-grade" data-g="3">Easy</button>
            </div>` : ""}
          ${(S().load().daily[today().iso] || {}).verseDone ? `<button class="btn ghost" style="margin-top:8px" data-act="verse-continue">Continue to Scripture</button>` : ""}
        </div>
      </div>
    `;
  };

  const viewDrill = () => {
    const d = state.drill;
    if (!d) {
      const iso = today().iso;
      const night = (state.drillMode || "morning") === "night";
      const nQ = (S().readingQs && S().readingQs(iso) || []).length;
      const refs = ((S().load().daily[iso] || {}).readRefs || []).join(" · ");
      return `
        <div class="screen full">
          <div class="back-row"><button class="icon-btn" data-go="word">${chev()}</button></div>
          <div class="page-title">
            <div class="tag">${night ? "Night test" : "Morning test"}</div>
            <h1>2 minutes.<br>${S().SPRINT_N} on the meaning.</h1>
            <p>${nQ
              ? (night
                ? "Same chapters as this morning. Misses first, then lines you already got — so they stick overnight."
                : ("Built from " + (refs || "today’s reading") + ". Meaning, motive, promise — not which-verse trivia."))
              : "Read today’s Scripture first. ALIGN writes the questions from those chapters — not a generic bank."}</p>
          </div>
          <div style="padding:0 22px calc(22px + var(--safe-b))">
            <button class="btn" ${nQ ? `data-act="drill-start"` : `data-act="open-step" data-step="word"`}>${nQ ? "Start the clock" : "Read first"}</button>
            <p class="next-up">${night ? "Then read today’s verse. Then lights out." : "Then affirm."}</p>
          </div>
        </div>`;
    }
    if (d.done) {
      const acc = d.answered ? Math.round((d.correct / d.answered) * 100) : 0;
      return `
        <div class="screen full">
          <div class="back-row"><button class="icon-btn" data-go="word">${chev()}</button></div>
          <div class="done-hero" style="padding:24px 22px">
            <div class="kicker">Sprint</div>
            <h1>${d.answered >= S().SPRINT_N ? "Cleared." : "Time."}</h1>
            <p class="lead" style="color:var(--muted)">${d.answered} answered · ${d.correct} right · ${acc}%. Misses come back sooner.</p>
            <div class="done-stats">
              <div><b>${d.answered}</b><span>answered</span></div>
              <div><b>${d.correct}</b><span>right</span></div>
              <div><b>${acc}%</b><span>accuracy</span></div>
            </div>
          </div>
          <div style="padding:0 22px calc(22px + var(--safe-b))">
            ${d.mode === "night"
              ? `<button class="btn" data-act="complete-step" data-step="nightquiz">Continue</button>`
              : `<button class="btn" data-act="open-step" data-step="affirm">Continue to affirm</button>`}
            <button class="btn ghost" style="margin-top:8px" data-act="drill-start">Go again</button>
          </div>
        </div>`;
    }
    const q = d.queue[d.i];
    if (!q) {
      d.done = true;
      d.running = false;
      return viewDrill();
    }
    return `
      <div class="screen full has-cta">
        <div class="back-row">
          <button class="icon-btn" data-act="drill-quit">${chev()}</button>
        </div>
        <div class="drill-top">
          <div class="drill-clock">${fmtClock(d.left)}</div>
          <div class="drill-count">${d.answered} / ${S().SPRINT_N}</div>
        </div>
        <div class="prog-thin"><i style="width:${Math.min(100, (d.answered / Math.max(1, S().SPRINT_N)) * 100)}%;background:var(--lime)"></i></div>
        <div class="drill-body">
          <h2 class="drill-q">${escapeHtml(q.q)}</h2>
          <div class="drill-opts">
            ${(d.options || []).map((opt, i) => {
              let cls = "";
              if (d.flash && d.picked === i) cls = d.flash;
              else if (d.flash === "ok" && opt === q.a) cls = "ok";
              return `<button ${d.flash ? "disabled" : ""} class="${cls}" data-act="drill-ans" data-i="${i}">${escapeHtml(opt)}</button>`;
            }).join("")}
          </div>
        </div>
      </div>
    `;
  };


  const noteTitleOf = (n) => {
    const title = String((n && n.title) || "").trim();
    if (title) return title;
    const first = String((n && n.body) || "").trim().split("\n")[0];
    return first || "New note";
  };

  const openNote = (note) => {
    if (!note) return;
    state.journalNoteId = note.id;
    state.journalIso = note.date || today().iso;
    state.view = "journalwrite";
    render();
    requestAnimationFrame(() => {
      const title = document.getElementById("note-title");
      const body = document.getElementById("diary-note");
      const el = (body && !String(note.body || "").trim() && String(note.title || "").trim()) ? body
        : ((title && !String(note.title || "").trim()) ? title : body);
      if (el) el.focus();
    });
  };

  const cloudNote = (note) => {
    if (!note || !window.AlignDB) return;
    try { if (AlignDB.saveNote) AlignDB.saveNote(note).catch(() => {}); } catch { /* local is enough */ }
    try { AlignDB.saveJournal(note.date, L().journalOf(note.date)).catch(() => {}); } catch { /* local is enough */ }
  };

  const saveOpenNote = () => {
    const id = state.journalNoteId;
    if (!id || !L().upsertNote) return null;
    try {
      const titleEl = document.getElementById("note-title");
      const bodyEl = document.getElementById("diary-note");
      const prev = L().noteById(id) || { id, date: state.journalIso || today().iso, created_at: new Date().toISOString() };
      const note = L().upsertNote({
        id,
        date: prev.date || state.journalIso || today().iso,
        title: titleEl ? titleEl.value : (prev.title || ""),
        body: bodyEl ? bodyEl.value : (prev.body || ""),
        created_at: prev.created_at
      });
      cloudNote(note);
      return note;
    } catch (e) {
      console.warn(e);
      return null;
    }
  };

  const viewJournal = () => {
    let notes = [];
    try { notes = (L().notesList && L().notesList()) || []; } catch { notes = []; }
    return `
      <div class="screen home journal">
        <div class="topbar">
          <div class="greet">Journal<h2>Notepad.</h2></div>
          <button type="button" class="icon-btn add" data-act="journal-new" title="New note">+</button>
        </div>
        <p class="plan-kicker">Tap + for a new page. Write as many as you want. Not the devotion.</p>
        ${notes.length ? `<div class="journal-list">${notes.map((n) => `
          <button type="button" class="journal-row" data-act="journal-open" data-id="${escapeAttr(n.id)}">
            <div>
              <h4>${escapeHtml(noteTitleOf(n))}</h4>
              <p>${escapeHtml(clipText(n.title && n.body ? n.body : (n.body || ""), 90) || prettyIso(n.date))}</p>
            </div>
            <span aria-hidden="true">›</span>
          </button>`).join("")}</div>` : `
        <button type="button" class="journal-hero" data-act="journal-new">
          <div class="tag">Notepad</div>
          <h3>New note</h3>
          <p>Tap and write. Add another with + whenever you want.</p>
          <span class="journal-cta">Start writing</span>
        </button>`}
      </div>
    `;
  };

  const viewJournalWrite = () => {
    const id = state.journalNoteId;
    let n = null;
    try { n = (L().noteById && id) ? L().noteById(id) : null; } catch { n = null; }
    const title = n ? n.title : "";
    const body = n ? n.body : "";
    const when = n && n.date ? prettyIso(n.date) : "Today";
    return `
      <div class="screen full journal-write">
        <div class="back-row">
          <button type="button" class="icon-btn" data-act="journal-done">${chev()}</button>
          <div class="journal-when">${escapeHtml(when)}</div>
          <button type="button" class="linkish" data-act="journal-delete">Delete</button>
        </div>
        <div class="journal-pad">
          <input id="note-title" class="note-title" type="text" maxlength="80" placeholder="Title" autocomplete="off" autocorrect="on" value="${escapeAttr(title)}" />
          <textarea class="diary-box" id="diary-note" placeholder="Start writing…">${escapeHtml(body)}</textarea>
        </div>
      </div>
    `;
  };

  const viewPray = () => {
    const j = L().journalOf(today().iso);
    return `
      <div class="screen full">
        <div class="back-row"><button class="icon-btn" data-go="home">${chev()}</button></div>
        <div class="page-title">
          <div class="tag">Devotion · first</div>
          <h1>Pray.</h1>
          <p>No list. No Bible yet. Just you and Him.</p>
        </div>
        <div class="pray-stage">
          <div class="pray-time">${fmtClock(state.praySec)}</div>
          <div class="acts">
            ${L().ACTS.map((a) => `<div class="card"><b>${a.k}</b><p>${a.d}</p></div>`).join("")}
          </div>
        </div>
        <div class="sticky-cta">
          ${state.prayOn
            ? `<button class="btn" data-act="pray-amen">Amen</button>`
            : `<button class="btn" data-act="pray-start">Begin prayer</button>`}
          <button class="btn ghost" style="margin-top:8px" data-act="complete-step" data-step="pray">Mark done</button>
        </div>
      </div>
    `;
  };

  const viewDevotion = () => {
    const j = L().journalOf(today().iso);
    const sp = state.spurgeonAm;
    const odb = state.odb;
    return `
      <div class="screen full has-cta">
        <div class="back-row">
          <button class="icon-btn" data-go="home">${chev()}</button>
          <div style="flex:1"></div>
          <button class="linkish" data-act="open-devotionlog">Past days</button>
        </div>
        <div class="page-title">
          <div class="tag">Morning · in this app</div>
          <h1>Devotion.</h1>
          <p>Stay here. Spurgeon for the morning${odb ? ", and a word from Our Daily Bread" : ""}. No other tab.</p>
        </div>
        <div class="scripture">
          ${odb ? `<div class="votd"><cite>Our Daily Bread</cite><q style="margin-top:8px">${escapeHtml(odb.title)}</q><p style="color:var(--muted);font-size:14px;margin-top:8px;line-height:1.5">${escapeHtml(odb.excerpt || "")}</p></div>` : ""}
          ${sp ? `
            <div class="tag" style="margin-top:8px">Spurgeon · Morning</div>
            <div class="devotion-verse">${escapeHtml(sp.v)}</div>
            <div class="devotion-body">${escapeHtml(sp.b)}</div>
          ` : `<p class="hint">Loading today’s reading…</p>`}
          <div class="field"><label>What remained</label>
            <textarea class="note-box" id="devotion-note" placeholder="A sentence is enough.">${escapeHtml(j.devotion || "")}</textarea>
          </div>
        </div>
        <div class="sticky-cta">
          <button class="btn" data-act="save-devotion">Save & continue</button>
        </div>
      </div>
    `;
  };


  const viewAffirm = () => {
    const iso = today().iso;
    let line = "This is the day the Lord has made. I will rejoice and be glad in it.";
    try { if (L().todayAffirmation) line = L().todayAffirmation(iso) || line; } catch { /* built-in */ }
    let custom = "";
    try { custom = (L().affirmationPref && L().affirmationPref()) || ""; } catch { custom = ""; }
    const tv = S().todayVerse(iso);
    const ref = (tv && S().refOf) ? S().refOf(tv) : "";
    return `
      <div class="screen full has-cta">
        <div class="back-row"><button class="icon-btn" data-go="home">${chev()}</button></div>
        <div class="page-title">
          <div class="tag">Your line</div>
          <h1>Affirm.</h1>
          <p>Write the word you speak every morning. It saves to your account. Then read it aloud.</p>
        </div>
        <div class="scripture">
          <div class="field"><label>My affirmation</label>
            <textarea class="note-box" id="affirm-text" placeholder="${escapeAttr(line)}">${escapeHtml(custom)}</textarea>
          </div>
          ${!custom ? `<div class="devotion-body" style="font-family:var(--serif);font-size:20px;line-height:1.45;margin-top:12px">${escapeHtml(line)}</div>` : ""}
          ${tv && tv.text ? `<div class="devotion-verse" style="margin-top:18px">${ref ? escapeHtml(ref) + " · " : ""}${escapeHtml(tv.text)}</div>` : ""}
        </div>
        <div class="sticky-cta">
          <button class="btn" data-act="affirm-done">I received it</button>
          <button class="btn ghost" style="margin-top:8px" data-act="save-affirm">Save to account</button>
        </div>
      </div>
    `;
  };

  const viewDevotionLog = () => {
    const rows = (L().devotionLog && L().devotionLog()) || [];
    return `
      <div class="screen full">
        <div class="back-row"><button class="icon-btn" data-act="open-step" data-step="devotion">${chev()}</button></div>
        <div class="page-title">
          <div class="tag">Devotion journal</div>
          <h1>Past days.</h1>
          <p>What remained. Not the notepad.</p>
        </div>
        <div class="scroll-body" style="padding:0 16px calc(22px + var(--safe-b))">
          ${rows.length ? rows.map((r) => `
            <div class="journal-row" style="display:block;text-align:left;margin-bottom:10px">
              <h4>${escapeHtml(prettyIso(r.iso))}</h4>
              ${r.verse ? `<p class="word-src" style="margin:4px 0 6px">${escapeHtml(r.source || "Word")} · ${escapeHtml(r.verse)}</p>` : ""}
              <p>${escapeHtml(r.devotion)}</p>
            </div>`).join("") : `<p class="hint">When you save a devotion takeaway, it will live here.</p>`}
        </div>
      </div>
    `;
  };

  const viewEvening = () => {
    const sp = state.spurgeonPm;
    const clk = L().clocksFor(today().date);
    return `
      <div class="screen full has-cta">
        <div class="back-row"><button class="icon-btn" data-go="home">${chev()}</button></div>
        <div class="page-title">
          <div class="tag">Evening · lights out ${clk.tonightLabel}</div>
          <h1>Night Word.</h1>
          <p>Read this. Then the phone goes down.</p>
        </div>
        <div class="scripture">
          ${(() => {
            const v = lockDevotionVerse() || S().todayVerse(today().iso);
            return v && v.text ? `<div class="tag">Morning verse · once more</div>
            <div class="devotion-verse">${escapeHtml(S().refOf(v))}</div>
            <div class="devotion-body">${escapeHtml(v.text)}</div>` : "";
          })()}
          ${sp ? `
            <div class="tag">Spurgeon · Evening</div>
            <div class="devotion-verse">${escapeHtml(sp.v)}</div>
            <div class="devotion-body">${escapeHtml(sp.b)}</div>
          ` : `<p class="hint">Loading evening reading…</p>`}
        </div>
        <div class="sticky-cta">
          <button class="btn" data-act="open-step" data-step="lights">Read the verse · lights out</button>
          <button class="btn ghost" style="margin-top:8px" data-act="open-nightdrill">Test today’s reading</button>
        </div>
      </div>
    `;
  };

  const viewLights = () => {
    const clk = L().clocksFor(today().date);
    const v = lockDevotionVerse() || S().todayVerse(today().iso);
    const read = !!L().morningOf(today().iso).nightverse;
    return `
      <div class="screen full has-cta">
        <div class="back-row"><button class="icon-btn" data-go="home">${chev()}</button></div>
        <div class="page-title">
          <div class="tag">Lights out · ${clk.tonightLabel}</div>
          <h1>${read ? "Phone down." : "Read it before bed."}</h1>
          <p>${read
            ? (clk.sunday ? "Sunday. Rise at 4:00 AM." : "Rise at 5:00 AM.") + " The morning path is already waiting."
            : "The same line from this morning’s devotion. Read it once more. Then the phone goes down."}</p>
        </div>
        <div class="verse-body">
          <div class="verse-card">
            <div class="verse-theme">Tonight</div>
            <div class="ref">${v ? escapeHtml(S().refOf(v)) : ""}</div>
            <q class="mv-text">${v ? escapeHtml(v.text) : "This morning’s devotion verse will show here."}</q>
          </div>
        </div>
        <div class="sticky-cta">
          ${read
            ? `<button class="btn" data-act="complete-step" data-step="lights">Phone down</button>`
            : `<button class="btn" data-act="night-verse">I’ve read it · phone down</button>`}
        </div>
      </div>
    `;
  };

  const viewBible = () => {
    const data = state.bibleData;
    const iso = today().iso;
    const assign = L().todayAssignment(iso);
    const readN = (assign.read || []).length;
    const target = L().chapterTarget(iso);
    const verses = (data && data.verses) || [];
    const sunday = target === 1;
    return `
      <div class="screen full has-cta">
        <div class="back-row">
          <button class="icon-btn" data-go="home">${chev()}</button>
          <div style="flex:1"></div>
          <button class="linkish" data-act="bible-pick">Jump</button>
        </div>
        <div class="page-title" style="padding-bottom:0">
          <div class="tag">${readN}/${target} today${sunday ? " · church morning" : ""} · World English Bible</div>
        </div>
        <div class="scripture">
          ${state.bibleLoading ? `<p class="hint">Loading chapter…</p>` : ""}
          ${state.bibleErr ? `<div class="err">${escapeHtml(state.bibleErr)}</div>` : ""}
          ${data ? `
            <div class="ref">${escapeHtml(data.reference || (state.readBook + " " + state.readCh))}</div>
            ${verses.map((v) => `<p class="verse"><sup>${v.verse}</sup>${escapeHtml((v.text || "").trim())}</p>`).join("")}
          ` : (!state.bibleLoading ? `<p class="hint">Open a chapter to begin.</p>` : "")}
        </div>
        <div class="sticky-cta">
          <div class="row-btns">
            <button class="btn ghost" data-act="bible-prev">Previous</button>
            <button class="btn" data-act="bible-done">${sunday ? "Chapter read · done" : "Chapter read"}</button>
          </div>
          ${readN >= target
            ? `<button class="btn ghost" style="margin-top:8px" data-act="complete-step" data-step="word">Scripture done · sprint next</button>`
            : `<p class="next-up" style="margin-top:8px">${sunday ? "One chapter. Then the sprint." : (target - readN) + " more to the usual three"}</p>`}
        </div>
      </div>
    `;
  };

  const viewDayPlan = () => {
    const p = L().planOf(today().iso);
    const sunday = L().clocksFor(today().date).sunday;
    const saved = !!state.planJustSaved;
    const prioRows = (p.priorities || []).map(prioOf);
    const pri = prioRows.map((x) => x.text);
    const has = pri.some(Boolean) || (p.tasks || []).some((t) => t && String(t.text || "").trim()) || String(p.note || "").trim();
    return `
      <div class="screen full has-cta">
        <div class="back-row"><button class="icon-btn" data-go="home">${chev()}</button></div>
        <div class="page-title">
          <div class="tag">${sunday ? "Church morning" : "After the Word"}</div>
          <h1>${saved && has ? "Today’s plan." : "Plan the day."}</h1>
          <p>${saved && has
            ? (state.session ? "Saved on this device and your account." : "Saved on this device.")
            : (sunday ? "Church is first. Keep the rest of the day light." : "Three things that would make today true. Then anything else.")}</p>
        </div>
        <div class="scroll-body" style="padding:0 16px 20px">
          ${saved && has ? `<div class="saved-banner"><b>Saved.</b> This is the plan you’ll see on Today.</div>` : ""}
          <p class="hint" style="margin:0 0 10px">Add one thing at a time. Unchecked lines move to tomorrow in the same slot.</p>
          ${[0,1,2].map((i) => `
            <div class="prio">
              <label>Priority ${i+1}</label>
              <div class="task-row ${prioRows[i].done?"done":""}">
                <button class="check ${prioRows[i].done?"done":""}" data-act="toggle-prio" data-i="${i}" style="${prioRows[i].done?"background:var(--lime);border-color:var(--lime)":""}">${prioRows[i].done?"✓":""}</button>
                <input id="prio-${i}" type="text" autocomplete="off" autocorrect="off" value="${escapeAttr(prioRows[i].text)}" placeholder="${["The one that matters","If there’s time","Only if the first two hold"][i]}" />
              </div>
            </div>
          `).join("")}
          <div class="section-h"><h4>Also</h4></div>
          ${(p.tasks || []).map((tk, i) => `
            <div class="task-row ${tk.done?"done":""}">
              <button class="check ${tk.done?"done":""}" data-act="toggle-task" data-i="${i}" style="${tk.done?"background:var(--lime);border-color:var(--lime)":""}">${tk.done?"✓":""}</button>
              <input type="text" autocomplete="off" data-task="${i}" value="${escapeAttr(tk.text)}" />
            </div>
          `).join("")}
          <button class="btn ghost" data-act="add-task" style="height:44px;margin:8px 0 14px">Add a line</button>
          <div class="field"><label>Notes</label>
            <textarea class="note-box" id="plan-note" placeholder="People, calls, the afternoon…">${escapeHtml(p.note || "")}</textarea>
          </div>
        </div>
        <div class="sticky-cta">
          ${saved
            ? `<button class="btn" data-go="home">See it on Today</button>
               <button class="btn ghost" style="margin-top:8px" data-act="edit-dayplan">Keep editing</button>`
            : `<button class="btn" data-act="save-dayplan">Save plan</button>`}
        </div>
      </div>
    `;
  };

  const viewGetReady = () => {
    const sunday = L().clocksFor(today().date).sunday;
    return `
    <div class="screen full">
      <div class="back-row"><button class="icon-btn" data-go="home">${chev()}</button></div>
      <div class="page-title">
        <div class="tag">${sunday ? "Leave 5:45" : "Then"}</div>
        <h1>Get ready.</h1>
        <p>${sunday ? "Bath. Dress for church. Out the door by 5:45." : "Bath. Dress. Leave the room in order. No phone needed after this."}</p>
      </div>
      <div class="pray-stage">
        <div class="pray-time">${fmtClock(state.readySec)}</div>
        <p class="hint">Optional timer. Use it or ignore it.</p>
      </div>
      <div class="sticky-cta">
        ${state.readyOn
          ? `<button class="btn ghost" data-act="ready-stop">Stop timer</button>`
          : `<button class="btn ghost" data-act="ready-start">Start a timer</button>`}
        <button class="btn" style="margin-top:8px" data-act="complete-step" data-step="ready">${sunday ? "Ready for church" : "I’m ready"}</button>
      </div>
    </div>
  `;
  };


  const viewRecite = () => {
    const v = lockDevotionVerse() || S().todayVerse(today().iso);
    const sunday = L().clocksFor(today().date).sunday;
    return `
      <div class="screen full has-cta">
        <div class="back-row"><button class="icon-btn" data-go="home">${chev()}</button></div>
        <div class="page-title">
          <div class="tag">Before you go</div>
          <h1>Read it again.</h1>
          <p>The same line from this morning’s devotion. Say it. Then ${sunday ? "leave for church." : "begin the day."}</p>
        </div>
        <div class="verse-body">
          <div class="verse-card">
            <div class="verse-theme">Devotion</div>
            <div class="ref">${v ? escapeHtml(S().refOf(v)) : ""}</div>
            <q class="mv-text">${v ? escapeHtml(v.text) : "Save the devotion first."}</q>
          </div>
        </div>
        <div class="sticky-cta">
          <button class="btn" data-act="recite-done" ${v && v.text ? "" : "disabled"}>I’ve read it</button>
        </div>
      </div>
    `;
  };

  const viewGo = () => {
    const sunday = L().clocksFor(today().date).sunday;
    const done = stepIsDone("go");
    return `
    <div class="screen full has-cta">
      <div class="back-row"><button class="icon-btn" data-go="home">${chev()}</button></div>
      <div class="done-hero" style="padding:24px 22px">
        <img class="done-burst" src="./assets/done-burst.jpg" alt="" />
        <div class="kicker">${sunday ? "Leave by 5:45" : "The morning is complete"}</div>
        <h1>${sunday ? "Go<br>to church." : "Begin<br>the day."}</h1>
        <p class="lead" style="color:var(--muted)">${sunday ? "The light path is done. Church is the first appointment." : "The verse is in you. Go well. Read it once more before bed."}</p>
      </div>
      <div class="sticky-cta">
        ${done
          ? `<button class="btn" data-go="home">Back to today</button>`
          : `<button class="btn" data-act="begin-day">${sunday ? "Go to church" : "Begin the day"}</button>`}
      </div>
    </div>
  `;
  };

  const viewBiblePick = () => `
    <div class="screen full">
      <div class="back-row"><button class="icon-btn" data-act="open-step" data-step="word">${chev()}</button></div>
      <div class="page-title"><div class="tag">Jump</div><h1>Choose a book.</h1></div>
      <div class="word-hub">
        ${L().BOOKS.map((b) => `
          <button class="setting" data-act="bible-book" data-book="${escapeAttr(b.name)}">
            <div class="grow"><h4>${b.name}</h4><p>${b.chapters} chapters</p></div>
          </button>
        `).join("")}
      </div>
    </div>
  `;

  const viewLibrary = () => {
    const books = B().list();
    const iso = today().iso;
    return `
      <div class="screen home">
        <div class="back-row"><button class="icon-btn" data-go="home">${chev()}</button></div>
        <div class="page-title">
          <div class="tag">Library</div>
          <h1>Books.</h1>
          <p>Upload a PDF. Schedule a sitting. Read it here, offline${state.session ? " — synced to your account" : ""}.</p>
        </div>
        <div style="padding:0 16px calc(var(--nav-h) + var(--safe-b) + 16px)">
          <input id="pdf-file" type="file" accept="application/pdf" class="hidden" />
          <button class="btn" data-act="pick-pdf" style="margin-bottom:14px">${state.uploadBusy ? "Saving…" : "Upload a PDF"}</button>
          ${!books.length ? `<div class="empty">Drop in a book you already own. Schedule a sitting. It stays offline after the first save.</div>` : books.map((b) => {
            const due = B().dueToday(iso).some((x) => x.id === b.id);
            const pct = Math.round(B().progress(b) * 100);
            return `
              <button class="book-card" data-act="open-book-meta" data-id="${b.id}">
                <h3>${escapeHtml(b.title)}</h3>
                <p>${b.pages ? "p. " + (b.current_page || 1) + " of " + b.pages : "Opening will count pages"} · ${B().slotLabel(b.slot)} · ${B().daysLabel(b.days)}${due ? " · due today" : ""}</p>
                <div class="book-prog"><i style="width:${pct}%"></i></div>
              </button>`;
          }).join("")}
        </div>
      </div>
    `;
  };

  const viewBook = () => {
    const b = B().byId(state.bookId);
    if (!b) return viewLibrary();
    const days = Array.isArray(b.days) ? b.days : [];
    return `
      <div class="screen full has-cta">
        <div class="back-row"><button class="icon-btn" data-go="library">${chev()}</button></div>
        <div class="page-title">
          <div class="tag">${B().fmtSize(b.bytes)} · ${b.pages ? b.pages + " pages" : "PDF"}</div>
          <h1>${escapeHtml(b.title)}</h1>
          <p>Schedule a sitting. The file stays on this phone for offline reading.</p>
        </div>
        <div class="scroll-body" style="padding:0 16px 20px">
          <div class="field"><label>Title</label>
            <input id="book-title" value="${escapeAttr(b.title)}" />
          </div>
          <div class="field"><label>When</label>
            <div class="seg">
              <button class="${b.slot!=="evening"?"on":""}" data-act="book-slot" data-slot="morning">Morning</button>
              <button class="${b.slot==="evening"?"on":""}" data-act="book-slot" data-slot="evening">Evening</button>
            </div>
          </div>
          <div class="field"><label>Days</label>
            <div class="day-chips">
              ${B().DOW.map((d, i) => `<button class="${days.includes(i)?"on":""}" data-act="book-day" data-day="${i}">${d}</button>`).join("")}
            </div>
          </div>
          <div class="field"><label>Pages per sitting</label>
            <select id="book-ppd">
              ${[4,6,8,10,12,16,20,24].map((n) => `<option value="${n}" ${Number(b.pages_per_day)===n?"selected":""}>${n} pages</option>`).join("")}
            </select>
          </div>
          <div class="setting">
            <div class="grow">
              <h4>On the path</h4>
              <p>${b.enabled === false ? "Hidden from Today" : "Shows on Today when it’s due"}</p>
            </div>
            <button class="toggle ${b.enabled!==false?"on":""}" data-act="book-enabled"><i></i></button>
          </div>
        </div>
        <div class="sticky-cta">
          <button class="btn" data-act="open-book" data-id="${b.id}">Read now</button>
          <button class="btn ghost" style="margin-top:8px" data-act="delete-book">Remove book</button>
        </div>
      </div>
    `;
  };

  const viewReader = () => {
    const b = B().byId(state.bookId);
    if (!b) return viewLibrary();
    const iso = today().iso;
    const done = B().loggedToday(iso, b.id);
    const goal = B().targetEnd(b);
    return `
      <div class="screen full has-cta" style="background:#0b0c10">
        <div class="back-row">
          <button class="icon-btn" data-act="close-reader">${chev()}</button>
          <div style="flex:1;min-width:0">
            <div class="tag" style="color:var(--lime)">${escapeHtml(b.title)}</div>
          </div>
        </div>
        <div class="pdf-wrap" id="pdf-wrap">
          ${state.pdfBusy ? `<p class="hint" style="padding:24px">Opening book…</p>` : ""}
          ${state.pdfErr ? `<div class="err" style="margin:16px">${escapeHtml(state.pdfErr)}</div>` : ""}
          <canvas id="pdf-canvas"></canvas>
        </div>
        <div class="pdf-tools">
          <button class="btn ghost" data-act="pdf-prev" style="height:44px">Prev</button>
          <div class="pg">${state.pdfPage}${state.pdfPages ? " / " + state.pdfPages : ""}</div>
          <button class="btn ghost" data-act="pdf-next" style="height:44px">Next</button>
        </div>
        <div class="sticky-cta" style="margin-top:0">
          ${done
            ? `<button class="btn ghost" data-act="close-reader">Sitting done</button>`
            : `<button class="btn" data-act="reading-done">Done · through page ${goal}</button>`}
        </div>
      </div>
    `;
  };

  const viewSwap = () => {
    const w = state.workout;
    const it = itemsOf(w)[w.index];
    const ex = exercises[it.id];
    const alts = (ex.alts || []).map(id => exercises[id]).filter(Boolean);
    const same = Object.values(exercises).filter(e => e.pattern === ex.pattern && e.id !== ex.id).slice(0, 6);
    const list = alts.length ? alts : same;
    return `
      <div class="screen full">
        <div class="back-row"><button class="icon-btn" data-act="close-swap">${chev()}</button></div>
        <div class="page-title"><div class="tag">Swap</div><h1>${ex.name}</h1><p>Same pattern. Pick a stand-in.</p></div>
        <div class="ex-list">
          ${list.map(e => `
            <button class="ex-row p-${e.pattern}" data-act="do-swap" data-id="${e.id}">
              <div class="ex-ico">${pose(e.svg)}</div>
              <div><h4>${e.name}</h4><div class="meta">${e.muscles.join(" · ")}</div></div>
            </button>
          `).join("")}
        </div>
      </div>
    `;
  };

  const chev = () => `<svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.2"><path d="M15 5 8 12l7 7"/></svg>`;

  const ringSvg = (frac) => {
    const r = 86, c = 2 * Math.PI * r;
    const f = Math.max(0, Math.min(1, frac));
    return `<svg class="ring" viewBox="0 0 180 180"><circle cx="90" cy="90" r="${r}" fill="none" stroke="rgba(255,255,255,.08)" stroke-width="6"/><circle cx="90" cy="90" r="${r}" fill="none" stroke="currentColor" stroke-width="6" stroke-linecap="round" stroke-dasharray="${c}" stroke-dashoffset="${c * (1 - f)}" transform="rotate(-90 90 90)"/></svg>`;
  };

  const startOfWeek = (date) => {
    const d = new Date(date);
    d.setHours(0,0,0,0);
    d.setDate(d.getDate() - d.getDay());
    return d;
  };

  const escapeHtml = (s) => String(s).replace(/[&<>"']/g, c => ({ "&":"&amp;","<":"&lt;",">":"&gt;","\"":"&quot;","'":"&#39;" }[c]));
  const escapeAttr = escapeHtml;

  const formatAiReply = (raw) => {
    try {
    let t = String(raw || "").replace(/\r\n/g, "\n").trim();
    t = t.replace(/<think>[\s\S]*?<\/think>/gi, "").trim();
    t = t.replace(/^```[\w-]*\n([\s\S]*?)\n```$/, "$1").trim();
    const inline = (s) => escapeHtml(s)
      .replace(/`([^`]+)`/g, "<code>$1</code>")
      .replace(/\*\*([^*]+)\*\*/g, "<strong>$1</strong>")
      .replace(/__([^_]+)__/g, "<strong>$1</strong>")
      .replace(/(^|[^*])\*([^*]+)\*(?!\*)/g, "$1<em>$2</em>");
    const out = [];
    String(t).split(/\n{2,}/).forEach((chunk) => {
      const lines = chunk.split("\n").map((l) => l.replace(/\s+$/, ""));
      if (!lines.some(Boolean)) return;
      let buf = [];
      let listType = null;
      let items = [];
      const flushP = () => {
        if (!buf.length) return;
        out.push("<p>" + buf.map(inline).join("<br>") + "</p>");
        buf = [];
      };
      const flushL = () => {
        if (!listType) return;
        out.push("<" + listType + ">" + items.map((x) => "<li>" + x + "</li>").join("") + "</" + listType + ">");
        listType = null;
        items = [];
      };
      lines.forEach((l) => {
        if (!l.trim()) return;
        const ol = l.match(/^\s*\d+\.\s+(.+)$/);
        const ul = l.match(/^\s*[-*•]\s+(.+)$/);
        const hd = l.match(/^\s*#{1,3}\s+(.+)$/);
        const title = l.match(/^\s*\*\*(.+?)\*\*:?\s*$/);
        if (ol) {
          flushP();
          if (listType !== "ol") flushL();
          listType = "ol";
          items.push(inline(ol[1]));
          return;
        }
        if (ul) {
          flushP();
          if (listType !== "ul") flushL();
          listType = "ul";
          items.push(inline(ul[1]));
          return;
        }
        flushL();
        if (hd) { flushP(); out.push("<h4>" + inline(hd[1]) + "</h4>"); return; }
        if (title) { flushP(); out.push("<h4>" + inline(title[1]) + "</h4>"); return; }
        buf.push(l);
      });
      flushL();
      flushP();
    });
    return out.join("") || "<p></p>";
    } catch {
      return "<p>" + escapeHtml(String(raw || "")).replace(/\n/g, "<br>") + "</p>";
    }
  };

  /* ---------- RENDER / EVENTS ---------- */
  const render = () => {
    try {
      const iso = today().iso;
      const viewStep = {
        pray: "pray", devotion: "devotion", bible: "word", verse: "verse", drill: "drill",
        affirm: "affirm", dayplan: "plan", getready: "ready", go: "go",
        ready: "move", exercise: "move", player: "move", rest: "move", done: "move",
        recite: "recite", evening: "evening", lights: "lights", reader: "read"
      };
      const sid = viewStep[state.view];
      if (sid && L().markOpen) L().markOpen(iso, sid);
      if (typeof seedTimesFromKnown === "function") seedTimesFromKnown(iso);
    } catch { /* timing optional */ }
    const map = {
      splash: viewSplash,
      onboard: viewOnboard,
      home: viewHome,
      time: viewTime,
      plan: viewPlan,
      ready: viewReady,
      exercise: viewExercise,
      player: viewPlayer,
      rest: viewRest,
      done: viewDone,
      progress: viewProgress,
      balance: viewBalance,
      swap: viewSwap,
      auth: viewAuth,
      setup: viewSetup,
      profile: viewProfile,
      word: viewWord,
      pray: viewPray,
      devotion: viewDevotion,
      bible: viewBible,
      dayplan: viewDayPlan,
      getready: viewGetReady,
      go: viewGo,
      recite: viewRecite,
      biblepick: viewBiblePick,
      evening: viewEvening,
      lights: viewLights,
      library: viewLibrary,
      book: viewBook,
      reader: viewReader,
      verse: viewVerse,
      drill: viewDrill,
      affirm: viewAffirm,
      devotionlog: viewDevotionLog,
      sound: viewSound,
      journal: viewJournal,
      journalwrite: viewJournalWrite
    };
    const tab = tabFor(state.view);
    app.innerHTML = (map[state.view] || viewHome)() + (tab ? nav(tab) : "") + overlays();
    try { app.classList.toggle("has-now", !nowHidden()); } catch { app.classList.remove("has-now"); }
    bind();
    if (state.view === "reader" && pdfDoc && !state.pdfBusy) paintPdf();
  };

  const bind = () => {
    app.querySelectorAll("[data-go]").forEach(b => b.addEventListener("click", () => {
      if (state.view === "drill") stopDrillTick();
      state.view = b.dataset.go;
      render();
    }));
    app.querySelectorAll("[data-go-day]").forEach(b => b.addEventListener("click", () => {
      const d = days.find(x => x.dow === Number(b.dataset.goDay));
      if (d && d.dow === today().dow && !canOpenStep("move")) {
        gateStep("move");
        return;
      }
      state.selectedDay = d.id;
      state.view = "ready";
      render();
    }));
    app.querySelectorAll("[data-ex]").forEach(b => b.addEventListener("click", () => {
      state.selectedExercise = b.dataset.ex;
      if (b.dataset.day) state.selectedDay = b.dataset.day;
      state.view = "exercise";
      render();
    }));
    app.querySelectorAll("[data-act]").forEach(b => b.addEventListener("click", (e) => {
      if (b.dataset.act === "ai-close" || (b.dataset.act === "sheet-no" && b.classList.contains("sheet-bg"))) {
        if (e.target !== b) return;
      }
      e.stopPropagation();
      handle(b.dataset.act, b);
    }));
    const name = $("#name-input");
    if (name) name.addEventListener("input", e => { state.profile.name = e.target.value; });
    const ae = $("#auth-email");
    if (ae) ae.addEventListener("input", e => { state.authEmail = e.target.value; });
    const an = $("#auth-name");
    if (an) an.addEventListener("input", e => { state.profile.name = e.target.value; });
    const su = $("#sb-url");
    if (su) su.addEventListener("input", e => { state.setupUrl = e.target.value; });
    const sk = $("#sb-key");
    if (sk) sk.addEventListener("input", e => { state.setupKey = e.target.value; });
    const rh = $("#remind-hour");
    if (rh) rh.addEventListener("change", async (e) => {
      state.prefs.hour = Number(e.target.value);
      await AlignDB.savePrefs(state.prefs);
    });
    const pn = $("#prof-name");
    if (pn) pn.addEventListener("input", e => { state.profile.name = e.target.value; });
    const dn = $("#devotion-note");
    if (dn) dn.addEventListener("input", e => {
      const iso = today().iso;
      const j = L().journalOf(iso);
      j.devotion = e.target.value;
      L().saveJournal(iso, j);
    });
    const pnote = $("#plan-note");
    if (pnote) pnote.addEventListener("input", e => {
      const iso = today().iso;
      const p = L().planOf(iso);
      p.note = e.target.value;
      L().savePlan(iso, p);
      AlignDB.saveDayPlan(iso, p);
    });
    const diary = $("#diary-note");
    const ntitle = $("#note-title");
    const onNoteInput = () => { saveOpenNote(); };
    if (diary) diary.addEventListener("input", onNoteInput);
    if (ntitle) ntitle.addEventListener("input", onNoteInput);
    [0,1,2].forEach((i) => {
      const el = document.getElementById("prio-" + i);
      if (el) el.addEventListener("input", () => {
        const iso = today().iso;
        const p = L().planOf(iso);
        const cur = prioOf(p.priorities[i]);
        p.priorities[i] = { text: el.value, done: cur.done, id: (p.priorities[i] && p.priorities[i].id) || ("p" + (i + 1)) };
        L().savePlan(iso, p);
        AlignDB.saveDayPlan(iso, p);
      });
    });
    app.querySelectorAll("[data-task]").forEach((el) => {
      el.addEventListener("input", () => {
        const iso = today().iso;
        const p = L().planOf(iso);
        const i = Number(el.dataset.task);
        if (p.tasks[i]) p.tasks[i].text = el.value;
        L().savePlan(iso, p);
        AlignDB.saveDayPlan(iso, p);
      });
    });
    ["auth-email", "auth-pass", "auth-name"].forEach((id) => {
      const el = document.getElementById(id);
      if (el) el.addEventListener("keydown", (e) => {
        if (e.key === "Enter") handle("auth-submit", el);
      });
    });
    const pdfIn = document.getElementById("pdf-file");
    if (pdfIn) pdfIn.addEventListener("change", async (e) => {
      const file = e.target.files && e.target.files[0];
      e.target.value = "";
      if (!file) return;
      state.uploadBusy = true;
      render();
      try {
        const book = await B().addFromFile(file);
        const cloud = await syncBook(book);
        state.bookId = book.id;
        state.view = "book";
        toast(state.session
          ? (cloud && cloud.ok !== false ? "Saved on this phone and your account" : "Saved on this phone. Cloud can retry when you’re online.")
          : "Saved on this phone");
      } catch (err) {
        toast((err && err.message) || "Could not add that PDF");
        state.view = "library";
      }
      state.uploadBusy = false;
      render();
    });
    const bt = document.getElementById("book-title");
    if (bt) bt.addEventListener("change", () => {
      const next = B().update(state.bookId, { title: bt.value.trim() || "Untitled" });
      if (next) syncBook(next);
    });
    const ppd = document.getElementById("book-ppd");
    if (ppd) ppd.addEventListener("change", () => {
      const next = B().update(state.bookId, { pages_per_day: Number(ppd.value) || 8 });
      if (next) syncBook(next);
    });
    const aiIn = document.getElementById("ai-input");
    if (aiIn) {
      aiIn.addEventListener("input", (e) => { state.ai.input = e.target.value; });
      aiIn.addEventListener("keydown", (e) => {
        if (e.key === "Enter" && !e.shiftKey) {
          e.preventDefault();
          handle("ai-send", aiIn);
        }
      });
    }
    const setVol = (e) => {
      if (window.ALIGN_SOUND) ALIGN_SOUND.setVolume(Number(e.target.value) / 100);
    };
    app.querySelectorAll(".now-vol, #sound-vol").forEach((el) => {
      el.addEventListener("input", setVol);
      el.addEventListener("change", setVol);
    });
    const files = document.getElementById("sound-files");
    if (files) files.addEventListener("change", async (e) => {
      const picked = Array.from(e.target.files || []);
      e.target.value = "";
      if (!picked.length) return;
      state.uploadBusy = true;
      render();
      let saved = 0;
      for (const f of picked) {
        if (!f || f.size > 40 * 1024 * 1024) {
          toast("Audio can be up to 40 MB.");
          continue;
        }
        try {
          const id = await ALIGN_SOUND.saveTrack(f);
          saved += 1;
          if (state.session && AlignDB.configured()) {
            const up = await AlignDB.uploadSoundFile(id, f, f.type || "audio/mpeg");
            await AlignDB.upsertSoundMeta({
              id,
              title: f.name.replace(/\.[^.]+$/, ""),
              filename: f.name,
              mime: f.type || "",
              bytes: f.size,
              storage_path: (up && up.ok && up.data) || ""
            });
          }
        } catch (err) {
          toast((err && err.message) || "Could not save that audio");
        }
      }
      state.uploadBusy = false;
      if (saved) toast(state.session ? "Saved to your account" : "Saved on this phone");
      render();
    });
  };

  const buzz = (ms = 18) => { try { navigator.vibrate && navigator.vibrate(ms); } catch {} };

  const beep = () => { try { window.ALIGN_SOUND && ALIGN_SOUND.sfx("beep"); } catch {} };
  const tickSound = () => { try { window.ALIGN_SOUND && ALIGN_SOUND.sfx("tick"); } catch {} };
  const sfx = (name) => { try { window.ALIGN_SOUND && ALIGN_SOUND.sfx(name); } catch {} };

  const clearTick = () => { if (state.tick) { clearInterval(state.tick); state.tick = null; } };

  const startWorkout = (dayId) => {
    const day = days.find(d => d.id === dayId);
    const items = day.items.map(it => ({ ...it }));
    const first = items[0];
    const ex = exercises[first.id];
    state.workout = {
      dayId,
      items,
      index: 0,
      log: [],
      startedAt: Date.now(),
      paused: false,
      remaining: ex.kind === "time" ? first.target : 0,
      actual: ex.kind === "reps" ? first.target : 0,
      rest: 0
    };
    state.view = "player";
    if (ex.kind === "time") startTimer();
    sfx("start");
    render();
  };

  const startTimer = () => {
    clearTick();
    state.tick = setInterval(() => {
      if (!state.workout || state.workout.paused) return;
      if (state.view === "player") {
        state.workout.remaining -= 1;
        if (state.workout.remaining <= 0) {
          state.workout.remaining = 0;
          clearTick();
          buzz(30); beep();
          completeCurrent("done");
          return;
        }
        // update number in place to avoid full re-render jank
        const el = app.querySelector(".counter");
        if (el) el.innerHTML = `${state.workout.remaining}<small>sec</small>`;
        const ring = app.querySelector(".ring circle:last-child");
        const it = itemsOf(state.workout)[state.workout.index];
        if (ring) {
          const r = 86, c = 2 * Math.PI * r;
          const f = state.workout.remaining / it.target;
          ring.setAttribute("stroke-dashoffset", String(c * (1 - f)));
        }
      } else if (state.view === "rest") {
        state.workout.rest -= 1;
        if (state.workout.rest <= 0) {
          clearTick();
          buzz(20); beep();
          enterExercise(state.workout.index);
          return;
        }
        if (state.workout.rest <= 3) tickSound();
        const el = app.querySelector(".rest-num");
        if (el) el.textContent = state.workout.rest;
        const arc = app.querySelector(".rest-arc");
        if (arc) {
          const r = 96, circ = 2 * Math.PI * r;
          const max = state.workout.restMax || 15;
          const f = Math.max(0, state.workout.rest / max);
          arc.setAttribute("stroke-dashoffset", String(circ * (1 - f)));
        }
      }
    }, 1000);
  };

  const enterExercise = (index) => {
    const it = itemsOf(state.workout)[index];
    const ex = exercises[it.id];
    state.showHow = false;
    state.workout.index = index;
    state.workout.paused = false;
    state.workout.remaining = ex.kind === "time" ? it.target : 0;
    state.workout.actual = ex.kind === "reps" ? it.target : 0;
    state.view = "player";
    if (ex.kind === "time") startTimer();
    else clearTick();
    render();
  };

  const completeCurrent = (status) => {
    const w = state.workout;
    const it = itemsOf(w)[w.index];
    const ex = exercises[it.id];
    w.log.push({
      id: it.id, side: it.side, target: it.target,
      actual: ex.kind === "time" ? it.target - w.remaining : w.actual,
      status
    });
    const next = w.index + 1;
    if (next >= itemsOf(w).length) {
      clearTick();
      state.view = "done";
      render();
      return;
    }
    const nextIt = itemsOf(w)[next];
    const nextEx = exercises[nextIt.id];
    w.index = next;
    w.rest = restAfter(nextEx);
    w.restMax = w.rest;
    w.paused = false;
    state.view = "rest";
    startTimer();
    render();
  };

  const saveWorkout = () => {
    const w = state.workout;
    const day = days.find(d => d.id === w.dayId);
    const minutes = Math.max(1, Math.round((Date.now() - w.startedAt) / 60000));
    const row = {
      date: today().iso,
      dayId: day.id,
      minutes,
      completed: w.log.filter(x => x.status === "done").length,
      total: itemsOf(w).length,
      log: w.log
    };
    state.history.push(row);
    save();
    AlignDB.saveWorkout(row).catch(() => {});
    completeStep("move");
    sfx("ok");
    state.workout = null;
    toast("Session saved");
    goNext();
  };

  const submitAuth = async () => {
    const email = (document.getElementById("auth-email") || {}).value || state.authEmail;
    const password = (document.getElementById("auth-pass") || {}).value || "";
    const display = (document.getElementById("auth-name") || {}).value || state.profile.name;
    state.authEmail = email;
    state.authError = "";
    state.authInfo = "";
    if (!email) { state.authError = "Email is required."; render(); return; }
    state.authBusy = true; render();
    let res;
    if (state.authTab === "magic") {
      res = await AlignDB.magicLink(email);
      state.authBusy = false;
      if (res.ok) state.authInfo = "Check your email for the login link.";
      else state.authError = res.error;
      render();
      return;
    }
    if (!password || password.length < 6) {
      state.authBusy = false;
      state.authError = "Password must be at least 6 characters.";
      render();
      return;
    }
    if (state.authTab === "signup") {
      state.profile.name = display;
      save();
      res = await AlignDB.signUp(email, password, display);
      state.authBusy = false;
      if (!res.ok) { state.authError = res.error; render(); return; }
      if (res.data && res.data.session) {
        await applySession(res.data.session);
        state.view = "home";
      } else {
        state.authInfo = "Account created. Confirm your email if that’s required, then sign in.";
        state.authTab = "signin";
      }
      render();
      return;
    }
    res = await AlignDB.signIn(email, password);
    state.authBusy = false;
    if (!res.ok) { state.authError = res.error; render(); return; }
    await applySession(res.data.session);
    state.view = "home";
    render();
  };

  const handle = async (act, el) => {
    if (act === "next-onboard") {
      if (state.onboard < 4) { state.onboard++; render(); }
      else {
        state.onboardingDone = true;
        save();
        state.view = "home";
        render();
      }
    } else if (act === "skip-onboard") {
      state.onboardingDone = true; save();
      state.view = "home";
      render();
    } else if (act === "start-today") {
      if (!gateStep("move")) return;
      startWorkout(todayDay().id);
    } else if (act === "start-day") {
      const day = days.find((x) => x.id === el.dataset.day);
      if (day && day.dow === today().dow && !gateStep("move")) return;
      startWorkout(el.dataset.day);
    } else if (act === "toggle-how") {
      state.showHow = !state.showHow;
      render();
    } else if (act === "complete-ex") {
      buzz(); sfx("ok"); completeCurrent("done");
    } else if (act === "pause-ex") {
      const w = state.workout;
      w.paused = !w.paused;
      if (!w.paused) startTimer();
      else clearTick();
      render();
    } else if (act === "skip-ex") {
      completeCurrent("skip");
    } else if (act === "adj") {
      const d = Number(el.dataset.d);
      state.workout.actual = Math.max(1, state.workout.actual + d);
      const c = app.querySelector(".counter");
      if (c) c.innerHTML = `${state.workout.actual}<small>reps</small>`;
    } else if (act === "skip-rest") {
      clearTick(); enterExercise(state.workout.index);
    } else if (act === "add-rest") {
      state.workout.rest += 10;
      const n = app.querySelector(".rest-num");
      if (n) n.textContent = state.workout.rest;
    } else if (act === "quit-workout") {
      state.sheet = {
        title: "End session?",
        body: "This session won’t be saved.",
        confirm: "End",
        cancel: "Keep going",
        danger: true,
        kind: "quit"
      };
      render();
    } else if (act === "sheet-no") {
      state.sheet = null; render();
    } else if (act === "sheet-yes") {
      const kind = state.sheet && state.sheet.kind;
      state.sheet = null;
      if (kind === "quit") {
        clearTick(); state.workout = null; state.view = "home"; render();
      } else if (kind === "signout") {
        await AlignDB.signOut();
        state.session = null;
        state.view = "home";
        toast("Signed out");
      } else if (kind === "delete-book") {
        const id = state.bookId;
        const book = B().byId(id);
        if (book) AlignDB.deleteBookRemote(book).catch(() => {});
        await B().remove(id);
        closePdf();
        state.bookId = null;
        state.view = "library";
        toast("Book removed");
      } else if (kind === "journal-delete") {
        const id = state.journalNoteId;
        const n = id && L().noteById ? L().noteById(id) : null;
        const iso = (n && n.date) || state.journalIso || today().iso;
        if (id && L().deleteNote) L().deleteNote(id);
        if (id && AlignDB.deleteNoteRemote) AlignDB.deleteNoteRemote(id).catch(() => {});
        AlignDB.saveJournal(iso, L().journalOf(iso)).catch(() => {});
        state.journalNoteId = "";
        state.view = "journal";
        toast("Note deleted");
      } else render();
    } else if (act === "save-workout") {
      saveWorkout();
    } else if (act === "swap-ex") {
      state.view = "swap"; clearTick(); render();
    } else if (act === "close-swap") {
      const ex = exercises[itemsOf(state.workout)[state.workout.index].id];
      state.view = "player";
      if (ex.kind === "time") startTimer();
      render();
    } else if (act === "do-swap") {
      const it = itemsOf(state.workout)[state.workout.index];
      it.id = el.dataset.id;
      enterExercise(state.workout.index);
    } else if (act === "auth-tab") {
      state.authTab = el.dataset.tab;
      state.authError = "";
      state.authInfo = "";
      render();
    } else if (act === "auth-submit") {
      await submitAuth();
    } else if (act === "auth-forgot") {
      const email = (document.getElementById("auth-email") || {}).value || state.authEmail;
      if (!email) { state.authError = "Enter your email first."; render(); return; }
      state.authBusy = true; render();
      const res = await AlignDB.resetPassword(email);
      state.authBusy = false;
      if (res.ok) { state.authError = ""; state.authInfo = "Reset link sent. Check your inbox."; }
      else state.authError = res.error;
      render();
    } else if (act === "save-supabase") {
      const url = (document.getElementById("sb-url") || {}).value || state.setupUrl;
      const key = (document.getElementById("sb-key") || {}).value || state.setupKey;
      state.authBusy = true; state.setupErr = ""; state.setupMsg = ""; render();
      const res = await AlignDB.testConnection(url, key);
      state.authBusy = false;
      if (res.ok) {
        state.setupMsg = "Connected. Create an account next.";
        AlignDB.onAuth((sess) => applySession(sess).then(render));
        const s = await AlignDB.session();
        if (s.ok) await applySession(s.data);
        state.view = "auth";
      } else {
        state.setupErr = res.error || "Could not connect. Check the URL and anon key.";
      }
      render();
    } else if (act === "copy-sql") {
      try {
        const txt = await fetch("./sql/schema.sql").then((r) => r.text());
        await navigator.clipboard.writeText(txt);
        state.setupMsg = "Schema copied. Paste it in Supabase → SQL Editor → Run.";
        state.setupErr = "";
      } catch {
        state.setupErr = "Could not copy. Open /sql/schema.sql and copy it manually.";
      }
      render();
    } else if (act === "save-name") {
      const n = (document.getElementById("prof-name") || {}).value || state.profile.name;
      state.profile.name = (n || "").trim();
      save();
      if (state.session) await AlignDB.upsertProfile(state.profile.name);
      render();
    } else if (act === "sync-now") {
      if (!window.AlignDB) { toast("Cloud is not ready"); return; }
      const iso = today().iso;
      toast("Saving…");
      const r = await AlignDB.syncNow({
        iso,
        morning: L().morningOf(iso),
        plan: L().planOf(iso),
        journal: L().journalOf(iso),
        bible: L().bibleCursor(),
        scripture: S().load()
      });
      toast(r && r.ok ? "Saved to your account." : ((r && r.error) || "Could not save"));
      render();
    } else if (act === "toggle-push") {
      if (state.prefs.enabled) {
        await disablePush();
        toast("Reminders off");
      } else {
        state.prefs.hour = L().clocksFor(new Date()).wakeH;
        state.prefs.minute = 0;
        const res = await enablePush();
        if (!res.ok) toast(res.error);
        else toast(state.session ? "Reminders on · 5 min before rise, 10 min before lights" : "On while ALIGN is open. Sign in so they still arrive when it is closed.");
      }
      render();
    } else if (act === "toggle-pass") {
      state.showPass = !state.showPass;
      const pass = document.getElementById("auth-pass");
      const email = document.getElementById("auth-email");
      if (email) state.authEmail = email.value;
      if (pass) state.authPassword = pass.value;
      render();
      const p2 = document.getElementById("auth-pass");
      if (p2 && state.authPassword) p2.value = state.authPassword;
    } else if (act === "test-push") {
      if (!window.Notification || Notification.permission !== "granted") {
        const res = await enablePush();
        if (!res.ok) { toast(res.error); return; }
      }
      await sendTestPush();
      toast("Reminder sent");
    } else if (act === "install-pwa") {
      if (!state.installPrompt) return;
      state.installPrompt.prompt();
      await state.installPrompt.userChoice;
      state.installPrompt = null;
      render();
    } else if (act === "sign-out") {
      state.sheet = {
        title: "Sign out?",
        body: "You’ll stay on this device, but new sessions won’t sync until you sign back in.",
        confirm: "Sign out",
        cancel: "Stay",
        danger: true,
        kind: "signout"
      };
      render();
    } else if (act === "locked-step") {
      const cur = currentStep();
      toast(cur ? ("Finish " + cur.title + " first.") : "The morning path is done.");
    } else if (act === "open-step") {
      const step = el.dataset.step;
      if (!gateStep(step)) return;
      openPathStep(step);
    } else if (act === "complete-step") {
      const step = el.dataset.step;
      const iso = today().iso;
      if (!canComplete(step)) {
        gateStep(step);
        return;
      }
      if (step === "pray") {
        state.prayOn = false;
        const j = L().journalOf(iso);
        j.praySeconds = state.praySec;
        L().saveJournal(iso, j);
        AlignDB.saveJournal(iso, j).catch(() => {});
      }
      completeStep(step);
      sfx("done");
      if (step === "lights") {
        toast("Phone down.");
        state.view = "home";
        render();
        return;
      }
      toast("Logged.");
      goNext();
    } else if (act === "pray-start") {
      state.prayOn = true;
      ensureLifeTick();
      render();
    } else if (act === "pray-amen") {
      state.prayOn = false;
      const iso = today().iso;
      const j = L().journalOf(iso);
      j.praySeconds = state.praySec;
      L().saveJournal(iso, j);
      AlignDB.saveJournal(iso, j).catch(() => {});
      completeStep("pray");
      sfx("ok");
      toast("Amen.");
      goNext();
    } else if (act === "journal-new" || act === "journal-today") {
      try {
        const note = L().emptyNote(today().iso);
        L().upsertNote(note);
        cloudNote(note);
        openNote(note);
      } catch (e) {
        console.warn(e);
        toast("Could not open a new note.");
      }
    } else if (act === "journal-open") {
      try {
        const n = L().noteById && L().noteById(el.dataset.id);
        if (n) openNote(n);
        else toast("That note is gone.");
      } catch (e) {
        console.warn(e);
        toast("Could not open that note.");
      }
    } else if (act === "journal-done") {
      saveOpenNote();
      state.view = "journal";
      render();
    } else if (act === "journal-delete") {
      state.sheet = {
        title: "Delete this note?",
        body: "It’s gone from this device and your account.",
        confirm: "Delete",
        cancel: "Keep it",
        danger: true,
        kind: "journal-delete"
      };
      render();
    } else if (act === "save-devotion") {
      const iso = today().iso;
      const j = L().journalOf(iso);
      j.devotion = (document.getElementById("devotion-note") || {}).value || j.devotion;
      if (state.spurgeonAm && state.spurgeonAm.v) {
        j.anchorVerse = state.spurgeonAm.v;
        j.anchorSource = "Spurgeon · Morning";
      }
      L().saveJournal(iso, j);
      AlignDB.saveJournal(iso, j).catch(() => {});
      completeStep("devotion");
      toast("Devotion saved");
      const startMem = () => {
        lockDevotionVerse();
        openVerseTutor(true);
      };
      if (state.spurgeonAm && state.spurgeonAm.v) startMem();
      else {
        L().todaySpurgeon("am").then((sp) => { state.spurgeonAm = sp; startMem(); }).catch(() => startMem());
      }
    } else if (act === "bible-done") {
      if (!state.readBook) return;
      const verses = (state.bibleData && state.bibleData.verses && state.bibleData.verses.length) || 0;
      const iso = today().iso;
      const cur = L().markChapterRead(iso, state.readBook, state.readCh, verses);
      AlignDB.saveBible(cur).catch(() => {});
      const readN = (L().todayAssignment(iso).read || []).length;
      const target = L().chapterTarget(iso);
      try { S().ingestReading(iso, state.readPacks || []); } catch { /* ok */ }
      S().enrichReading(iso, state.readPacks || []).catch(() => {});
      toast(state.readBook + " " + state.readCh + " · done");
      if (readN >= target && target >= 3 && verses < 30 && readN < 4) {
        openBible(cur.book, cur.chapter);
      } else if (readN >= target) {
        completeStep("word");
        stopDrillTick();
        state.drill = null;
        state.drillMode = "morning";
        state.view = "drill";
        render();
      } else {
        openBible(cur.book, cur.chapter);
      }
    } else if (act === "bible-prev") {
      const p = L().prevRef(state.readBook || "Genesis", state.readCh || 1);
      openBible(p.book, p.chapter);
    } else if (act === "bible-pick") {
      state.view = "biblepick";
      render();
    } else if (act === "bible-book") {
      L().setBibleCursor({ ...L().bibleCursor(), book: el.dataset.book, chapter: 1 });
      openBible(el.dataset.book, 1);
    } else if (act === "save-dayplan") {
      const iso = today().iso;
      const p = L().planOf(iso);
      p.priorities = [0,1,2].map((i) => {
        const cur = prioOf(p.priorities[i]);
        return { text: ((document.getElementById("prio-" + i) || {}).value || ""), done: cur.done, id: cur.id || ("p" + (i + 1)) };
      });
      p.note = (document.getElementById("plan-note") || {}).value || "";
      L().savePlan(iso, p);
      const res = await AlignDB.saveDayPlan(iso, p, { now: true });
      completeStep("plan");
      state.planJustSaved = true;
      const cloud = !!(state.session && res && res.ok && res.data !== null);
      toast(cloud ? "Plan saved" : (res && res.ok === false ? "Saved on this device" : "Plan saved"));
      goNext();
    } else if (act === "edit-dayplan") {
      state.planJustSaved = false;
      render();
    } else if (act === "add-task") {
      const iso = today().iso;
      const p = L().planOf(iso);
      p.tasks.push({ id: "t" + Date.now().toString(36), text: "", done: false });
      L().savePlan(iso, p);
      AlignDB.saveDayPlan(iso, p);
      render();
    } else if (act === "toggle-task") {
      const iso = today().iso;
      const p = L().planOf(iso);
      const i = Number(el.dataset.i);
      if (p.tasks[i]) p.tasks[i].done = !p.tasks[i].done;
      L().savePlan(iso, p);
      AlignDB.saveDayPlan(iso, p);
      render();
    } else if (act === "toggle-prio") {
      const iso = today().iso;
      const p = L().planOf(iso);
      const i = Number(el.dataset.i);
      const cur = prioOf(p.priorities[i]);
      if (!cur.text) return;
      p.priorities[i] = { text: cur.text, done: !cur.done, id: cur.id || ("p" + (i + 1)) };
      L().savePlan(iso, p);
      AlignDB.saveDayPlan(iso, p);
      render();
    } else if (act === "ready-start") {
      state.readyOn = true;
      ensureLifeTick();
      render();
    } else if (act === "ready-stop") {
      state.readyOn = false;
      render();
    } else if (act === "pick-pdf") {
      const inp = document.getElementById("pdf-file");
      if (inp) inp.click();
    } else if (act === "open-book-meta") {
      state.bookId = el.dataset.id;
      state.view = "book";
      render();
    } else if (act === "open-book") {
      openReader(el.dataset.id || state.bookId);
    } else if (act === "close-reader") {
      const id = state.bookId;
      if (id) B().update(id, { current_page: state.pdfPage });
      closePdf();
      state.view = "library";
      render();
    } else if (act === "pdf-prev") {
      if (!pdfDoc) return;
      state.pdfPage = Math.max(1, state.pdfPage - 1);
      B().update(state.bookId, { current_page: state.pdfPage });
      const elPg = app.querySelector(".pg");
      if (elPg) elPg.textContent = state.pdfPage + (state.pdfPages ? " / " + state.pdfPages : "");
      paintPdf();
    } else if (act === "pdf-next") {
      if (!pdfDoc) return;
      state.pdfPage = Math.min(state.pdfPages || state.pdfPage + 1, state.pdfPage + 1);
      B().update(state.bookId, { current_page: state.pdfPage });
      const elPg = app.querySelector(".pg");
      if (elPg) elPg.textContent = state.pdfPage + (state.pdfPages ? " / " + state.pdfPages : "");
      paintPdf();
    } else if (act === "reading-done") {
      const b = B().byId(state.bookId);
      if (!b) return;
      const iso = today().iso;
      const from = b.current_page || 1;
      const to = Math.max(state.pdfPage, B().targetEnd(b));
      B().markRead(iso, b.id, from, to);
      B().update(b.id, { current_page: Math.min((b.pages || to), to + 1) });
      AlignDB.saveReadingLog(iso, b.id, from, to).catch(() => {});
      AlignDB.upsertBookMeta(B().byId(b.id)).catch(() => {});
      completeStep("read");
      closePdf();
      toast("Reading logged");
      goNext();
    } else if (act === "book-slot") {
      const b = B().update(state.bookId, { slot: el.dataset.slot });
      if (b) syncBook(b);
      render();
    } else if (act === "book-day") {
      const b = B().byId(state.bookId);
      if (!b) return;
      const d = Number(el.dataset.day);
      const days = (b.days || []).slice();
      const i = days.indexOf(d);
      if (i >= 0) days.splice(i, 1);
      else days.push(d);
      days.sort((a, c) => a - c);
      const next = B().update(b.id, { days });
      if (next) syncBook(next);
      render();
    } else if (act === "book-enabled") {
      const b = B().byId(state.bookId);
      const next = B().update(state.bookId, { enabled: !(b && b.enabled !== false) });
      if (next) syncBook(next);
      render();
    } else if (act === "delete-book") {
      state.sheet = {
        title: "Remove this book?",
        body: "The PDF leaves this phone and your account. Progress goes with it.",
        confirm: "Remove",
        cancel: "Keep",
        danger: true,
        kind: "delete-book"
      };
      render();
    } else if (act === "ai-nop") {
      /* keep the sheet open */
    } else if (act === "ai-open") {
      state.ai.open = true;
      render();
    } else if (act === "ai-close") {
      state.ai.open = false;
      render();
    } else if (act === "ai-send") {
      const elIn = document.getElementById("ai-input");
      const text = elIn ? elIn.value : state.ai.input;
      runAi(text);
    } else if (act === "ai-chip") {
      const chip = aiChips()[Number(el.dataset.i)];
      if (chip) runAi(chip[1]);
    } else if (act === "ai-prefer") {
      AI().save({ prefer: el.dataset.p });
      render();
    } else if (act === "sound-toggle") {
      if (window.ALIGN_SOUND) {
        const snap = ALIGN_SOUND.snapshot();
        if (snap.playing) ALIGN_SOUND.pause();
        else if (snap.id) ALIGN_SOUND.resume();
        else ALIGN_SOUND.playStation("rise");
      }
      render();
    } else if (act === "sound-station") {
      if (window.ALIGN_SOUND) ALIGN_SOUND.playStation(el.dataset.id);
      render();
    } else if (act === "sound-library") {
      if (window.ALIGN_SOUND) ALIGN_SOUND.playLibrary(el.dataset.id);
      render();
    } else if (act === "sound-track") {
      if (window.ALIGN_SOUND) ALIGN_SOUND.playTrack(el.dataset.id);
      render();
    } else if (act === "sound-pause") {
      if (window.ALIGN_SOUND) ALIGN_SOUND.pause();
      render();
    } else if (act === "sound-resume") {
      if (window.ALIGN_SOUND) ALIGN_SOUND.resume();
      render();
    } else if (act === "sound-stop") {
      if (window.ALIGN_SOUND) ALIGN_SOUND.stop();
      render();
    } else if (act === "sound-sfx") {
      if (window.ALIGN_SOUND) ALIGN_SOUND.setSfx(!ALIGN_SOUND.snapshot().sfxOn);
      render();
    } else if (act === "sound-add") {
      const inp = document.getElementById("sound-files");
      if (inp) inp.click();
    } else if (act === "sound-remove") {
      const id = el.dataset.id;
      const row = (window.ALIGN_SOUND && ALIGN_SOUND.snapshot().tracks || []).find((t) => t.id === id) || { id };
      if (window.ALIGN_SOUND) ALIGN_SOUND.removeTrack(id);
      if (state.session && AlignDB.configured()) AlignDB.deleteSoundRemote(row).catch(() => {});
      render();
    } else if (act === "open-verse") {
      if (!gateStep("verse")) return;
      openVerseTutor(false);
    } else if (act === "verse-next") {
      const sess = state.verseSess;
      const item = currentVerse();
      if (!sess || !item) return;
      startCloze(item.verse);
      sess.phase = (sess.cloze && sess.cloze.answers && sess.cloze.answers.length) ? "cloze" : "grade";
      render();
    } else if (act === "cloze-tap") {
      const sess = state.verseSess;
      if (!sess || sess.phase !== "cloze") return;
      const idx = Number(el.dataset.i);
      if (sess.used.includes(idx)) return;
      const word = sess.chips[idx];
      const need = sess.cloze.answers[sess.filled.length];
      if (String(word).toLowerCase() !== String(need).toLowerCase()) {
        sess.misses += 1;
        buzz(24);
        return;
      }
      sess.used.push(idx);
      sess.filled.push(word);
      if (sess.filled.length >= sess.cloze.answers.length) {
        sess.phase = "grade";
      }
      render();
    } else if (act === "verse-reveal") {
      if (state.verseSess) state.verseSess.revealed = true;
      render();
    } else if (act === "verse-continue") {
      finishMemory();
    } else if (act === "verse-sit-done") {
      if ((state.verseSitSec || 0) < 120) {
        toast("Stay with it until 2:00.");
        return;
      }
      state.verseSitOn = false;
      const sess = state.verseSess;
      const item = currentVerse();
      if (!sess || !item) return;
      startCloze(item.verse);
      sess.phase = (sess.cloze && sess.cloze.answers && sess.cloze.answers.length) ? "cloze" : "grade";
      render();
    } else if (act === "begin-day") {
      const iso = today().iso;
      if (!stepIsDone("recite")) {
        const steps = L().setStep(iso, "recite", true);
        AlignDB.saveMorning(iso, steps).catch(() => {});
      }
      const steps = L().setStep(iso, "go", true);
      AlignDB.saveMorning(iso, steps).catch(() => {});
      sfx("done");
      toast(L().clocksFor(today().date).sunday ? "Go to church." : "Go well.");
      state.view = "home";
      render();
    } else if (act === "recite-done") {
      completeStep("recite");
      sfx("ok");
      toast("Amen.");
      state.view = "go";
      render();
    } else if (act === "night-verse") {
      const iso = today().iso;
      const steps = L().setStep(iso, "nightverse", true);
      AlignDB.saveMorning(iso, steps).catch(() => {});
      completeStep("lights");
      sfx("done");
      toast("Phone down.");
      state.view = "home";
      render();
    } else if (act === "verse-grade") {
      const item = currentVerse();
      if (!item) return;
      const g = Number(el.dataset.g);
      S().gradeVerse(item.verse.id, g, {
        book: item.verse.book,
        chapter: item.verse.chapter,
        verse: item.verse.verse,
        text: item.verse.text
      });
      if (g === 0) {
        const sess = state.verseSess;
        sess.queue.push({ kind: "review", verse: item.verse });
      }
      advanceVerse();
    } else if (act === "open-drill") {
      if (!gateStep("drill")) return;
      stopDrillTick();
      state.drill = null;
      state.drillMode = "morning";
      state.view = "drill";
      render();
    } else if (act === "open-nightdrill") {
      stopDrillTick();
      state.drill = null;
      state.drillMode = "night";
      state.view = "drill";
      render();
    } else if (act === "drill-start") {
      startDrill(state.drillMode || "morning");
    } else if (act === "drill-ans") {
      answerDrill(Number(el.dataset.i));
    } else if (act === "drill-quit") {
      if (state.drill && state.drill.running && state.drill.answered) finishDrill();
      else {
        stopDrillTick();
        state.drill = null;
        state.view = stepIsDone("drill") ? "home" : "word";
        render();
      }
    } else if (act === "open-devotionlog") {
      state.view = "devotionlog";
      render();
    } else if (act === "save-affirm") {
      const box = document.getElementById("affirm-text") || document.getElementById("pref-affirm");
      const row = L().saveAffirmationPref(box ? box.value : "");
      if (AlignDB.saveAffirmation) AlignDB.saveAffirmation(row).catch(() => {});
      toast(state.session ? "Affirmation saved to your account" : "Affirmation saved on this device");
      render();
    } else if (act === "affirm-done") {
      const box = document.getElementById("affirm-text");
      if (box) {
        const row = L().saveAffirmationPref(box.value);
        if (AlignDB.saveAffirmation) AlignDB.saveAffirmation(row).catch(() => {});
      }
      completeStep("affirm");
      sfx("done");
      toast("Amen.");
      goNext();
    } else if (act === "schedule-done") {
      if (!canComplete("plan") && !stepIsDone("plan")) {
        gateStep("plan");
        return;
      }
      const iso = today().iso;
      const plan = L().planOf(iso);
      plan.priorities = (plan.priorities || []).map((x, i) => {
        const cur = prioOf(x);
        return { text: cur.text, done: !!cur.text, id: cur.id || ("p" + (i + 1)) };
      });
      (plan.tasks || []).forEach((tk) => { if (tk) tk.done = true; });
      L().savePlan(iso, plan);
      AlignDB.saveDayPlan(iso, plan);
      completeStep("plan");
      toast("Schedule done.");
      goNext();
    }
  };

  window.addEventListener("beforeinstallprompt", (e) => {
    e.preventDefault();
    state.installPrompt = e;
    if (state.view === "home" || state.view === "profile") render();
  });

  const timed = (pr, ms) => Promise.race([
    Promise.resolve(pr).catch(() => null),
    new Promise((res) => setTimeout(() => res(null), ms))
  ]);

  const leaveSplash = () => {
    if (state.view !== "splash") return;
    state.view = state.onboardingDone ? "home" : "onboard";
    try { render(); } catch (err) { console.warn(err); }
  };

  const boot = async () => {
    registerSW();
    if (window.ALIGN_AI && ALIGN_AI.probe) ALIGN_AI.probe().then(() => {
      if (state.view === "profile" || state.ai.open) render();
    }).catch(() => {});
    if (window.ALIGN_SOUND && ALIGN_SOUND.loadTracks) ALIGN_SOUND.loadTracks().then(() => {}).catch(() => {});
    if (window.ALIGN_SOUND && ALIGN_SOUND.onChange) ALIGN_SOUND.onChange(() => {
      if (["splash", "onboard"].includes(state.view)) return;
      try {
        const snap = ALIGN_SOUND.snapshot();
        app.classList.toggle("has-now", !nowHidden());
        const bar = app.querySelector(".now-chip b");
        if (bar) {
          bar.textContent = snap.title || "Sound";
          const sub = app.querySelector(".now-chip span");
          if (sub) sub.textContent = snap.playing ? "Playing" : "Paused";
          const play = app.querySelector(".now-play");
          if (play) {
            play.textContent = snap.playing ? "❚❚" : "▶";
            play.dataset.act = snap.playing ? "sound-pause" : "sound-resume";
          }
        }
      } catch { /* keep UI */ }
    });
    window.addEventListener("online", () => {
      state.offline = false;
      if (state.session) {
        applySession(state.session).then(() => { if (state.view !== "splash") render(); }).catch(() => {});
      } else if (state.view !== "splash") render();
    });
    window.addEventListener("offline", () => { state.offline = true; if (state.view !== "splash") render(); });
    try { render(); } catch (err) { console.warn(err); }
    const splashWatch = setTimeout(leaveSplash, 1200);
    const t0 = Date.now();
    try {
      if (AlignDB.configured()) {
        AlignDB.onAuth((sess) => {
          applySession(sess).then(() => {
            if (state.view === "splash") return;
            if (state.view === "auth" && sess) { state.view = "home"; }
            try { render(); } catch { /* keep UI */ }
          }).catch(() => {});
        });
        if (AlignDB.onStatus) AlignDB.onStatus(() => paintCloud());
        const s = await timed(AlignDB.session(), 2500);
        if (s && s.ok && s.data) {
          applySession(s.data).then(() => {
            if (state.view !== "splash") try { render(); } catch { /* keep UI */ }
          }).catch(() => {});
        }
      }
    } catch (err) { console.warn(err); }
    try {
      const prefs = JSON.parse(localStorage.getItem("align-notif-prefs") || "null");
      if (prefs) state.prefs = prefs;
    } catch { /* ignore */ }
    armLocalAlarms();
    document.addEventListener("visibilitychange", () => {
      if (document.visibilityState !== "visible") return;
      tickAlarms();
      if (state.session) {
        applySession(state.session).then(() => { if (state.view !== "splash") render(); }).catch(() => {});
      }
    });
    const wait = Math.max(0, 900 - (Date.now() - t0));
    await new Promise((r) => setTimeout(r, wait));
    clearTimeout(splashWatch);
    leaveSplash();
  };

  boot().catch(() => leaveSplash());
})();
