/* ALIGN life — morning ritual, Scripture, devotion, day plan */
window.ALIGN_LIFE = (() => {
  const BOOKS = [
    ["Genesis", 50], ["Exodus", 40], ["Leviticus", 27], ["Numbers", 36], ["Deuteronomy", 34],
    ["Joshua", 24], ["Judges", 21], ["Ruth", 4], ["1 Samuel", 31], ["2 Samuel", 24],
    ["1 Kings", 22], ["2 Kings", 25], ["1 Chronicles", 29], ["2 Chronicles", 36], ["Ezra", 10],
    ["Nehemiah", 13], ["Esther", 10], ["Job", 42], ["Psalm", 150], ["Proverbs", 31],
    ["Ecclesiastes", 12], ["Song of Solomon", 8], ["Isaiah", 66], ["Jeremiah", 52], ["Lamentations", 5],
    ["Ezekiel", 48], ["Daniel", 12], ["Hosea", 14], ["Joel", 3], ["Amos", 9],
    ["Obadiah", 1], ["Jonah", 4], ["Micah", 7], ["Nahum", 3], ["Habakkuk", 3],
    ["Zephaniah", 3], ["Haggai", 2], ["Zechariah", 14], ["Malachi", 4],
    ["Matthew", 28], ["Mark", 16], ["Luke", 24], ["John", 21], ["Acts", 28],
    ["Romans", 16], ["1 Corinthians", 16], ["2 Corinthians", 13], ["Galatians", 6], ["Ephesians", 6],
    ["Philippians", 4], ["Colossians", 4], ["1 Thessalonians", 5], ["2 Thessalonians", 3],
    ["1 Timothy", 6], ["2 Timothy", 4], ["Titus", 3], ["Philemon", 1], ["Hebrews", 13],
    ["James", 5], ["1 Peter", 5], ["2 Peter", 3], ["1 John", 5], ["2 John", 1],
    ["3 John", 1], ["Jude", 1], ["Revelation", 22]
  ].map(([name, chapters]) => ({ name, chapters }));

  const STEP_IDS = ["rise", "move", "pray", "devotion", "verse", "word", "drill", "affirm", "plan", "ready", "recite", "go"];
  const LS_R = "align-routine";
  const DEFAULT_MIN = { rise: 1, move: 28, pray: 7, devotion: 8, verse: 4, word: 12, drill: 2, affirm: 2, plan: 5, ready: 12, recite: 2, go: 1 };
  const DEFAULT_MIN_SUN = { rise: 1, move: 12, pray: 6, devotion: 6, verse: 4, word: 6, drill: 2, affirm: 2, plan: 3, ready: 15, recite: 2, go: 1 };

  const clampH = (n, d) => {
    n = Number(n);
    if (!Number.isFinite(n)) return d;
    return Math.max(0, Math.min(23, Math.round(n)));
  };
  const clampM = (n, d) => {
    n = Number(n);
    if (!Number.isFinite(n)) return d;
    return Math.max(0, Math.min(59, Math.round(n)));
  };
  const clampMin = (n, d) => {
    n = Number(n);
    if (!Number.isFinite(n)) return d;
    return Math.max(0, Math.min(180, Math.round(n)));
  };
  const fmtHM = (h, m) => {
    const hh = ((Number(h) || 0) % 12) || 12;
    const mm = String(Number(m) || 0).padStart(2, "0");
    const ap = (Number(h) || 0) >= 12 ? "PM" : "AM";
    return (Number(m) || 0) ? (hh + ":" + mm + " " + ap) : (hh + ":00 " + ap);
  };

  const defaultRoutine = () => ({
    sunWakeH: 4, sunWakeM: 0,
    sunLightsH: 0, sunLightsM: 0,
    wkWakeH: 5, wkWakeM: 0,
    wkLightsH: 1, wkLightsM: 0,
    leaveH: 5, leaveM: 45,
    leaveOn: true,
    chaptersWk: 3,
    chaptersSun: 1,
    on: Object.fromEntries(STEP_IDS.map((id) => [id, true])),
    order: STEP_IDS.slice(),
    trainPlan: "energy",
    min: Object.assign({}, DEFAULT_MIN),
    minSun: Object.assign({}, DEFAULT_MIN_SUN),
    updated_at: ""
  });

  const coerceRoutine = (raw) => {
    const d = defaultRoutine();
    if (!raw || typeof raw !== "object") return d;
    d.sunWakeH = clampH(raw.sunWakeH, 4);
    d.sunWakeM = clampM(raw.sunWakeM, 0);
    d.sunLightsH = clampH(raw.sunLightsH, 0);
    d.sunLightsM = clampM(raw.sunLightsM, 0);
    d.wkWakeH = clampH(raw.wkWakeH, 5);
    d.wkWakeM = clampM(raw.wkWakeM, 0);
    d.wkLightsH = clampH(raw.wkLightsH, 1);
    d.wkLightsM = clampM(raw.wkLightsM, 0);
    d.leaveH = clampH(raw.leaveH, 5);
    d.leaveM = clampM(raw.leaveM, 45);
    d.leaveOn = raw.leaveOn !== false;
    d.chaptersWk = Math.max(1, Math.min(12, Number(raw.chaptersWk) || 3));
    d.chaptersSun = Math.max(1, Math.min(12, Number(raw.chaptersSun) || 1));
    STEP_IDS.forEach((id) => {
      const locked = id === "rise" || id === "go";
      d.on[id] = locked ? true : !(raw.on && raw.on[id] === false);
      d.min[id] = clampMin(raw.min && raw.min[id], d.min[id]);
      d.minSun[id] = clampMin(raw.minSun && raw.minSun[id], d.minSun[id]);
    });
    const seen = {};
    const order = [];
    (Array.isArray(raw.order) ? raw.order : []).forEach((id) => {
      if (STEP_IDS.indexOf(id) >= 0 && !seen[id]) { seen[id] = 1; order.push(id); }
    });
    STEP_IDS.forEach((id) => { if (!seen[id]) order.push(id); });
    d.order = order;
    d.trainPlan = ["energy", "strength", "mobility", "capacity"].indexOf(raw.trainPlan) >= 0 ? raw.trainPlan : "energy";
    d.updated_at = raw.updated_at || "";
    return d;
  };

  const loadJSON = (k, fallback) => {
    try { return JSON.parse(localStorage.getItem(k) || "null") || fallback; } catch { return fallback; }
  };
  const saveJSON = (k, v) => localStorage.setItem(k, JSON.stringify(v));

  const loadRoutine = () => coerceRoutine(loadJSON(LS_R, null));
  const saveRoutine = (patch) => {
    const next = coerceRoutine(Object.assign({}, loadRoutine(), patch || {}));
    next.updated_at = new Date().toISOString();
    saveJSON(LS_R, next);
    return next;
  };
  const mergeRoutineRemote = (row) => {
    if (!row || typeof row !== "object") return loadRoutine();
    const local = loadRoutine();
    const lAt = Date.parse(local.updated_at || "") || 0;
    const rAt = Date.parse(row.updated_at || "") || 0;
    if (!lAt || rAt >= lAt) {
      const next = coerceRoutine(row);
      saveJSON(LS_R, next);
      return next;
    }
    return local;
  };

  /* Defaults: Sunday lights 12:00 AM / rise 4:00 AM. Mon–Sat lights 1:00 AM / rise 5:00 AM.
     Anyone can change this; founder hours stay until they edit. */
  const clocksFor = (date) => {
    const d = date instanceof Date ? date : new Date(date);
    const sunday = d.getDay() === 0;
    const r = loadRoutine();
    const wakeH = sunday ? r.sunWakeH : r.wkWakeH;
    const wakeM = sunday ? r.sunWakeM : r.wkWakeM;
    const tonightH = sunday ? r.sunLightsH : r.wkLightsH;
    const tonightM = sunday ? r.sunLightsM : r.wkLightsM;
    return {
      sunday,
      wakeH,
      wakeM,
      wakeLabel: fmtHM(wakeH, wakeM),
      tonightH,
      tonightM,
      tonightLabel: fmtHM(tonightH, tonightM),
      leaveH: r.leaveH,
      leaveM: r.leaveM,
      leaveOn: !!(r.leaveOn && sunday),
      leaveLabel: (r.leaveOn && sunday) ? fmtHM(r.leaveH, r.leaveM) : null
    };
  };

  const chapterTarget = (iso) => {
    const r = loadRoutine();
    const [y, m, d] = String(iso).split("-").map(Number);
    return new Date(y, m - 1, d).getDay() === 0 ? r.chaptersSun : r.chaptersWk;
  };

  const isEvening = (date = new Date()) => date.getHours() >= 20 || date.getHours() < 2;

  /* Wake-call copy. Day-specific, whole morning — not a gym ping. */
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


  const wakeNote = (date = new Date()) => {
    const d = date instanceof Date ? date : new Date(date);
    const bank = WAKE_NOTES[d.getDay()] || WAKE_NOTES[1];
    const pair = bank[d.getDate() % bank.length];
    return { title: pair[0], body: pair[1] };
  };

  /* Lights-out copy. Indexed by the morning that sleep is for — not a gym ping. */
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


  const lightsNote = (date = new Date()) => {
    const d = date instanceof Date ? date : new Date(date);
    const bank = LIGHTS_NOTES[d.getDay()] || LIGHTS_NOTES[1];
    const pair = bank[d.getDate() % bank.length];
    return { title: pair[0], body: pair[1] };
  };

  const preWakeNote = (date = new Date()) => {
    const n = wakeNote(date);
    if (/^Five minutes/i.test(n.body)) return n;
    return { title: n.title, body: "Five minutes. " + n.body };
  };

  const isoOfDate = (d) => {
    const y = d.getFullYear();
    const m = String(d.getMonth() + 1).padStart(2, "0");
    const day = String(d.getDate()).padStart(2, "0");
    return y + "-" + m + "-" + day;
  };

  const inWindow = (now, h, m, winMin) => {
    const t = new Date(now.getFullYear(), now.getMonth(), now.getDate(), h, m, 0, 0);
    const elapsed = (now.getTime() - t.getTime()) / 1000;
    return elapsed >= 0 && elapsed < winMin * 60;
  };

  /* 5 min before this person's rise. 10 min before their lights out. */
  const dueAlarms = (now = new Date()) => {
    const d = now instanceof Date ? now : new Date(now);
    const WIN = 8;
    const sameDay = (a, b) => a.getFullYear() === b.getFullYear() && a.getMonth() === b.getMonth() && a.getDate() === b.getDate();
    const hit = (at) => inWindow(d, at.getHours(), at.getMinutes(), WIN) && sameDay(d, at);
    const clk = clocksFor(d);
    const wakeAt = new Date(d.getFullYear(), d.getMonth(), d.getDate(), clk.wakeH, clk.wakeM || 0, 0, 0);
    const preWake = new Date(wakeAt.getTime() - 5 * 60 * 1000);
    if (hit(preWake)) {
      const n = preWakeNote(d);
      return { kind: "wake", iso: isoOfDate(d), title: n.title, body: n.body };
    }
    const tom = new Date(d.getFullYear(), d.getMonth(), d.getDate() + 1);
    const clkT = clocksFor(tom);
    const wakeT = new Date(tom.getFullYear(), tom.getMonth(), tom.getDate(), clkT.wakeH, clkT.wakeM || 0, 0, 0);
    const preWT = new Date(wakeT.getTime() - 5 * 60 * 1000);
    if (hit(preWT)) {
      const n = preWakeNote(tom);
      return { kind: "wake", iso: isoOfDate(tom), title: n.title, body: n.body };
    }
    const lightsAt = new Date(d.getFullYear(), d.getMonth(), d.getDate(), clk.tonightH, clk.tonightM || 0, 0, 0);
    const preL = new Date(lightsAt.getTime() - 10 * 60 * 1000);
    if (hit(preL)) {
      const n = lightsNote(d);
      return { kind: "lights", iso: isoOfDate(d), title: n.title, body: n.body };
    }
    const lightsT = new Date(tom.getFullYear(), tom.getMonth(), tom.getDate(), clkT.tonightH, clkT.tonightM || 0, 0, 0);
    const preLT = new Date(lightsT.getTime() - 10 * 60 * 1000);
    if (hit(preLT)) {
      const n = lightsNote(tom);
      return { kind: "lights", iso: isoOfDate(tom), title: n.title, body: n.body };
    }
    return null;
  };

  const EVENING = [
    { id: "evening", title: "Evening Word", sub: "Spurgeon for the night. Then test the day’s chapters.", icon: "word" },
    { id: "nightquiz", title: "Night test", sub: "Same reading. Misses first. Then lights out.", icon: "drill" },
    { id: "lights", title: "Lights out", sub: "Bed at the hour you set. The morning is already planned.", icon: "ready" }
  ];

  const STEPS = [
    { id: "rise", title: "Rise", sub: "You’re up. The day is a gift.", icon: "rise" },
    { id: "move", title: "Train", sub: "Body first, while the mind is quiet.", icon: "move" },
    { id: "pray", title: "Pray", sub: "Before you read. Before you plan.", icon: "pray" },
    { id: "devotion", title: "Devotion", sub: "Your daily reading. Capture what stays.", icon: "book" },
    { id: "verse", title: "Memory", sub: "Two minutes on the devotion verse. Then hide it.", icon: "verse" },
    { id: "word", title: "Scripture", sub: "Three or four chapters. Stay with it.", icon: "word" },
    { id: "drill", title: "Sprint", sub: "Thirty questions. Meaning, not trivia.", icon: "drill" },
    { id: "affirm", title: "Affirm", sub: "Read today’s word over yourself.", icon: "spark" },
    { id: "plan", title: "Plan the day", sub: "Three true priorities. Then the rest.", icon: "plan" },
    { id: "ready", title: "Get ready", sub: "Bath, dress, leave the room in order.", icon: "ready" },
    { id: "recite", title: "Verse again", sub: "Read the devotion line once more before you go.", icon: "verse" },
    { id: "go", title: "Begin", sub: "Step into the day. Nothing else to open.", icon: "go" }
  ];

  const LS_M = "align-morning";
  const LS_B = "align-bible";
  const LS_P = "align-plans";
  const LS_J = "align-journal";

  const stepsFor = (date) => {
    const r = loadRoutine();
    const clk = clocksFor(date);
    const sunday = clk.sunday;
    const leave = clk.leaveLabel;
    const ch = sunday ? r.chaptersSun : r.chaptersWk;
    const train = sunday ? r.minSun.move : r.min.move;
    const byId = {};
    STEPS.forEach((s) => { byId[s.id] = s; });
    const ordered = (r.order || STEP_IDS).map((id) => byId[id]).filter(Boolean);
    const base = ordered.filter((s) => r.on[s.id] !== false).map((s) => {
      if (s.id === "word") return Object.assign({}, s, { sub: ch === 1 ? "One chapter. Stay with it." : (ch + " chapters. Stay with it.") });
      if (s.id === "move") return Object.assign({}, s, { sub: train + " minutes. Body first, while the mind is quiet." });
      return s;
    });
    if (!sunday) return base;
    return base.map((s) => {
      if (s.id === "move") return Object.assign({}, s, { sub: train + " minutes. Then Word." });
      if (s.id === "devotion") return Object.assign({}, s, { sub: "Short. One line that stays." });
      if (s.id === "verse") return Object.assign({}, s, { sub: "Two minutes. Then hide it. Then Scripture." });
      if (s.id === "word") return Object.assign({}, s, { sub: ch === 1 ? "One chapter. That’s Sunday." : (ch + " chapters. That’s Sunday.") });
      if (s.id === "drill") return Object.assign({}, s, { sub: "Thirty questions on today’s reading." });
      if (s.id === "affirm") return Object.assign({}, s, { sub: "Speak it. Then get ready." });
      if (s.id === "plan") return Object.assign({}, s, { sub: leave ? "Church first. Keep the rest light." : "Three true priorities. Then the rest." });
      if (s.id === "ready") return Object.assign({}, s, { sub: leave ? ("Dress for church. Leave by " + leave + ".") : "Bath, dress, leave the room in order." });
      if (s.id === "recite") return Object.assign({}, s, { sub: "The devotion verse once more. Then go." });
      if (s.id === "go") return Object.assign({}, s, { sub: leave ? ("Out the door by " + leave + ".") : "Step into the day. Nothing else to open." });
      return s;
    });
  };

  const emptyMorning = () => Object.fromEntries(STEPS.map((s) => [s.id, false]));

  const morningOf = (iso) => {
    const all = loadJSON(LS_M, {});
    if (!all[iso]) all[iso] = emptyMorning();
    return all[iso];
  };

  const LS_T = "align-timing";
  const MAX_STEP_MS = 3 * 60 * 60 * 1000;
  const timesAll = () => loadJSON(LS_T, {});
  const timesOf = (iso) => {
    const row = timesAll()[iso];
    return (row && typeof row === "object") ? row : {};
  };
  const saveTimes = (iso, row) => {
    const all = timesAll();
    const next = Object.assign({}, row);
    next.updated_at = new Date().toISOString();
    all[iso] = next;
    saveJSON(LS_T, all);
    return next;
  };
  const stepTime = (row, id) => (row && row[id] && typeof row[id] === "object") ? row[id] : null;
  const markOpen = (iso, id) => {
    if (!iso || !id || String(id).charAt(0) === "_") return timesOf(iso);
    const row = Object.assign({}, timesOf(iso));
    const cur = Object.assign({}, stepTime(row, id) || {});
    if (cur.ms) return row;
    if (!cur.open) cur.open = Date.now();
    row[id] = cur;
    return saveTimes(iso, row);
  };
  const markClose = (iso, id, extraMs) => {
    if (!iso || !id || String(id).charAt(0) === "_") return timesOf(iso);
    const row = Object.assign({}, timesOf(iso));
    const cur = Object.assign({}, stepTime(row, id) || {});
    const extra = Math.max(0, Number(extraMs) || 0);
    if (cur.ms > 0) {
      if (extra > cur.ms) {
        cur.ms = Math.min(MAX_STEP_MS, extra);
        row[id] = cur;
        return saveTimes(iso, row);
      }
      return row;
    }
    const now = Date.now();
    if (!cur.open) cur.open = now;
    cur.close = now;
    let span = Math.max(0, now - cur.open);
    if (span > MAX_STEP_MS) span = MAX_STEP_MS;
    cur.ms = Math.max(span, extra);
    if (cur.ms > MAX_STEP_MS) cur.ms = MAX_STEP_MS;
    row[id] = cur;
    return saveTimes(iso, row);
  };
  const mergeTimesDay = (a, b) => {
    const out = Object.assign({}, a && typeof a === "object" ? a : {});
    const src = b && typeof b === "object" ? b : {};
    Object.keys(src).forEach((k) => {
      if (k === "updated_at") {
        const aAt = Date.parse(out.updated_at || "") || 0;
        const bAt = Date.parse(src.updated_at || "") || 0;
        if (bAt >= aAt) out.updated_at = src.updated_at;
        return;
      }
      const y = src[k];
      if (!y || typeof y !== "object") return;
      const x = out[k] && typeof out[k] === "object" ? out[k] : null;
      if (!x) { out[k] = Object.assign({}, y); return; }
      const open = [x.open, y.open].filter((n) => n > 0);
      const close = [x.close, y.close].filter((n) => n > 0);
      out[k] = {
        open: open.length ? Math.min.apply(null, open) : (x.open || y.open),
        close: close.length ? Math.max.apply(null, close) : (x.close || y.close),
        ms: Math.max(x.ms || 0, y.ms || 0)
      };
    });
    return out;
  };
  const mergeTimesRemote = (mornings) => {
    const all = timesAll();
    (mornings || []).forEach((r) => {
      if (!r || !r.date) return;
      const remoteT = (r.steps && r.steps._times) || {};
      all[r.date] = mergeTimesDay(all[r.date], remoteT);
    });
    saveJSON(LS_T, all);
    return all;
  };
  const attachTimes = (iso, steps) => {
    const row = Object.assign({}, steps || {});
    const t = timesOf(iso);
    const times = {};
    Object.keys(t).forEach((k) => {
      if (k === "updated_at") return;
      if (t[k] && typeof t[k] === "object" && (t[k].ms || t[k].open)) times[k] = t[k];
    });
    row._times = times;
    return row;
  };
  const fmtSpan = (ms) => {
    const s = Math.round(Math.max(0, Number(ms) || 0) / 1000);
    if (s < 60) return s < 5 ? "—" : s + "s";
    const m = Math.round(s / 60);
    if (m < 60) return m + " min";
    const h = Math.floor(m / 60);
    const mm = m % 60;
    return mm ? (h + "h " + mm + "m") : (h + "h");
  };
  const dayTotalMs = (iso) => {
    const t = timesOf(iso);
    let n = 0;
    Object.keys(t).forEach((k) => {
      if (k === "updated_at") return;
      n += (t[k] && t[k].ms) || 0;
    });
    return n;
  };
  const timingParts = (iso) => {
    const t = timesOf(iso);
    const m = morningOf(iso);
    return STEPS.concat(EVENING).map((s) => ({
      id: s.id,
      title: s.title,
      ms: (t[s.id] && t[s.id].ms) || 0,
      done: !!m[s.id]
    })).filter((x) => x.ms >= 1000 || (x.done && x.id !== "rise" && x.id !== "go" && x.id !== "lights"));
  };

  const HOLD_IDS = { pray: 1, devotion: 1, verse: 1, word: 1, recite: 1, affirm: 1, evening: 1 };
  const idealMinFor = (iso, id, opts) => {
    const r = loadRoutine();
    const [y, m, d] = String(iso).split("-").map(Number);
    const sunday = new Date(y, m - 1, d).getDay() === 0;
    const table = sunday ? r.minSun : r.min;
    if (id === "move" && opts && opts.trainMin != null) return Math.max(1, Number(opts.trainMin) || table.move || 1);
    if (id === "read") return 8;
    if (id === "evening") return 8;
    if (id === "nightquiz") return 2;
    if (id === "lights") return 1;
    return table[id] || 0;
  };
  const idealMsFor = (iso, id, opts) => idealMinFor(iso, id, opts) * 60000;
  const pathIdealMs = (iso, opts) => {
    const [y, m, d] = String(iso).split("-").map(Number);
    const date = new Date(y, m - 1, d);
    return stepsFor(date).reduce((n, s) => n + idealMsFor(iso, s.id, opts), 0);
  };
  const pathWindowMs = (iso) => Math.max(pathIdealMs(iso), 60 * 60000);
  const paceKind = (id, actual, ideal) => {
    const a = Number(actual) || 0;
    const i = Number(ideal) || 0;
    if (!i) return "open";
    const slack = Math.max(90 * 1000, i * 0.2);
    const d = a - i;
    if (Math.abs(d) <= slack) return "pace";
    if (HOLD_IDS[id]) return d < 0 ? "short" : "held";
    return d > 0 ? "long" : "pace";
  };

  const setStep = (iso, id, val) => {
    const all = loadJSON(LS_M, {});
    if (!all[iso]) all[iso] = emptyMorning();
    all[iso][id] = val;
    saveJSON(LS_M, all);
    if (val) {
      try { markClose(iso, id); } catch { /* timing is optional */ }
    }
    return all[iso];
  };

  const bibleCursor = () => loadJSON(LS_B, { book: "Genesis", chapter: 1, log: [] });
  const setBibleCursor = (c) => saveJSON(LS_B, c);

  const bookByName = (name) => BOOKS.find((b) => b.name === name) || BOOKS[0];

  const nextRef = (book, chapter) => {
    const b = bookByName(book);
    if (chapter < b.chapters) return { book, chapter: chapter + 1 };
    const i = BOOKS.findIndex((x) => x.name === b.name);
    const n = BOOKS[(i + 1) % BOOKS.length];
    return { book: n.name, chapter: 1 };
  };

  const prevRef = (book, chapter) => {
    if (chapter > 1) return { book, chapter: chapter - 1 };
    const i = BOOKS.findIndex((x) => x.name === book);
    const p = BOOKS[(i - 1 + BOOKS.length) % BOOKS.length];
    return { book: p.name, chapter: p.chapters };
  };

  const chapterCache = {};
  const fetchChapter = async (book, chapter) => {
    const key = book + " " + chapter;
    if (chapterCache[key]) return chapterCache[key];
    const url = "https://bible-api.com/" + encodeURIComponent(key) + "?translation=web";
    const res = await fetch(url);
    if (!res.ok) throw new Error("Could not load " + key);
    const data = await res.json();
    if (data.error) throw new Error(data.error);
    chapterCache[key] = data;
    return data;
  };

  const markChapterRead = (iso, book, chapter, verses) => {
    const c = bibleCursor();
    const id = book + " " + chapter;
    c.log = c.log || [];
    if (!c.log.find((x) => x.id === id && x.date === iso)) {
      c.log.push({ id, book, chapter, verses: verses || 0, date: iso });
    }
    const n = nextRef(book, chapter);
    c.book = n.book;
    c.chapter = n.chapter;
    setBibleCursor(c);
    return c;
  };

  const todayAssignment = (iso) => {
    const c = bibleCursor();
    const readToday = (c.log || []).filter((x) => x.date === iso);
    if (readToday.length) {
      return { start: { book: readToday[0].book, chapter: readToday[0].chapter }, read: readToday, next: { book: c.book, chapter: c.chapter } };
    }
    return { start: { book: c.book, chapter: c.chapter }, read: [], next: { book: c.book, chapter: c.chapter } };
  };

  const stamp = (obj) => Object.assign({}, obj, { updated_at: new Date().toISOString() });
  const ts = (v) => Date.parse((v && v.updated_at) || v || "") || 0;

  const planTaskId = () => "t" + Date.now().toString(36) + Math.random().toString(36).slice(2, 5);

  const shiftIso = (iso, days) => {
    const parts = String(iso || "").split("-").map(Number);
    const d = parts.length === 3 ? new Date(parts[0], parts[1] - 1, parts[2]) : new Date();
    d.setDate(d.getDate() + days);
    const y = d.getFullYear();
    const m = String(d.getMonth() + 1).padStart(2, "0");
    const day = String(d.getDate()).padStart(2, "0");
    return y + "-" + m + "-" + day;
  };

  const normPrio = (x, i) => {
    if (x && typeof x === "object") {
      return { text: String(x.text || "").trim(), done: !!x.done, id: x.id || ("p" + (i + 1)) };
    }
    return { text: String(x || "").trim(), done: false, id: "p" + (i + 1) };
  };

  const normalizePlan = (p) => {
    const src = p || {};
    const priorities = [0, 1, 2].map((i) => normPrio((src.priorities || [])[i], i));
    const tasks = (src.tasks || []).map((t, i) => ({
      id: (t && t.id) || ("t" + i),
      text: String((t && t.text) || "").trim(),
      done: !!(t && t.done)
    }));
    return Object.assign({}, src, { priorities, tasks, note: src.note || "" });
  };

  const carryInto = (iso, plan) => {
    const all = loadJSON(LS_P, {});
    const today = normalizePlan(plan);
    if (today._carried) return today;
    const seen = new Set(today.tasks.map((t) => String(t.text || "").toLowerCase()).filter(Boolean));
    for (let n = 1; n <= 7; n++) {
      const prev = all[shiftIso(iso, -n)];
      if (!prev) continue;
      const yp = normalizePlan(prev);
      [0, 1, 2].forEach((i) => {
        const y = yp.priorities[i];
        const t = today.priorities[i];
        if (y.text && !y.done && !t.text) {
          today.priorities[i] = { text: y.text, done: false, id: y.id || ("p" + (i + 1)) };
        }
      });
      yp.tasks.forEach((tk) => {
        if (!tk.text || tk.done) return;
        const key = tk.text.toLowerCase();
        if (seen.has(key)) return;
        today.tasks.push({ id: tk.id || planTaskId(), text: tk.text, done: false });
        seen.add(key);
      });
    }
    today._carried = true;
    return today;
  };

  const planOf = (iso) => {
    const all = loadJSON(LS_P, {});
    let row = normalizePlan(all[iso] || { priorities: ["", "", ""], tasks: [], note: "" });
    if (!row._carried) {
      row = carryInto(iso, row);
      all[iso] = stamp(row);
      saveJSON(LS_P, all);
    }
    return row;
  };
  const savePlan = (iso, plan) => {
    const all = loadJSON(LS_P, {});
    const row = normalizePlan(plan || {});
    row._carried = true;
    all[iso] = stamp(row);
    saveJSON(LS_P, all);
    return all[iso];
  };

  const emptyJournal = () => ({ prayer: "", devotion: "", word: "", praySeconds: 0, diary: "", notes: [] });

  const journalOf = (iso) => {
    const all = loadJSON(LS_J, {});
    if (!all[iso]) all[iso] = emptyJournal();
    if (all[iso].diary == null) all[iso].diary = "";
    return all[iso];
  };
  const saveJournal = (iso, j) => {
    const all = loadJSON(LS_J, {});
    all[iso] = stamp(j || {});
    saveJSON(LS_J, all);
    return all[iso];
  };
  const journalsAll = () => loadJSON(LS_J, {});

  const LS_N = "align-notes";

  const noteId = () => "n" + Date.now().toString(36) + Math.random().toString(36).slice(2, 6);

  const hydrateNotes = (iso, j) => {
    const pages = Array.isArray(j && j.notes) ? j.notes.filter(Boolean) : [];
    if (pages.length) {
      return pages.map((n) => ({
        id: n.id || ("diary-" + iso),
        title: String(n.title || ""),
        body: String(n.body || ""),
        created_at: n.created_at || (j && j.updated_at) || "",
        updated_at: n.updated_at || (j && j.updated_at) || ""
      }));
    }
    if (String((j && j.diary) || "").trim()) {
      return [{
        id: "diary-" + iso,
        title: "",
        body: String(j.diary),
        created_at: (j && j.updated_at) || "",
        updated_at: (j && j.updated_at) || ""
      }];
    }
    return [];
  };

  const readNotes = () => {
    let list = [];
    try { list = JSON.parse(localStorage.getItem(LS_N) || "[]") || []; } catch { list = []; }
    if (!Array.isArray(list)) list = [];
    const byId = {};
    list.forEach((n) => { if (n && n.id) byId[n.id] = n; });
    const journals = loadJSON(LS_J, {});
    Object.keys(journals).forEach((iso) => {
      hydrateNotes(iso, journals[iso]).forEach((n) => {
        const row = { ...n, date: iso };
        const cur = byId[row.id];
        if (!cur) byId[row.id] = row;
        else if (ts(row.updated_at) > ts(cur.updated_at)) byId[row.id] = { ...cur, ...row };
      });
    });
    return Object.keys(byId).map((k) => byId[k]);
  };

  const writeNotes = (arr) => {
    const list = (arr || []).slice().sort((a, b) => ts(b.updated_at || b.created_at) - ts(a.updated_at || a.created_at));
    saveJSON(LS_N, list);
    return list;
  };

  const notesList = () => readNotes().sort((a, b) => ts(b.updated_at || b.created_at) - ts(a.updated_at || a.created_at));

  const noteById = (id) => notesList().find((n) => n.id === id) || null;

  const mirrorDay = (iso) => {
    const dayNotes = notesList().filter((n) => n.date === iso);
    const j = journalOf(iso);
    j.notes = dayNotes.map((n) => ({
      id: n.id,
      title: n.title || "",
      body: n.body || "",
      created_at: n.created_at || "",
      updated_at: n.updated_at || ""
    }));
    const latest = dayNotes[0];
    j.diary = latest
      ? [latest.title, latest.body].filter((x) => String(x || "").trim()).join("\n")
      : "";
    saveJournal(iso, j);
    return j;
  };

  const emptyNote = (iso) => ({
    id: noteId(),
    date: iso,
    title: "",
    body: "",
    created_at: new Date().toISOString(),
    updated_at: new Date().toISOString()
  });

  const upsertNote = (note) => {
    const iso = note.date || String(note.created_at || "").slice(0, 10);
    const row = {
      id: note.id || noteId(),
      date: iso,
      title: String(note.title || ""),
      body: String(note.body || ""),
      created_at: note.created_at || new Date().toISOString(),
      updated_at: new Date().toISOString()
    };
    const list = readNotes();
    const i = list.findIndex((n) => n.id === row.id);
    if (i >= 0) list[i] = Object.assign({}, list[i], row);
    else list.unshift(row);
    writeNotes(list);
    mirrorDay(iso);
    return row;
  };

  const deleteNote = (id) => {
    const n = noteById(id);
    writeNotes(readNotes().filter((x) => x.id !== id));
    if (n && n.date) mirrorDay(n.date);
    return n ? n.date : null;
  };

  const mergeNotesRemote = (rows) => {
    const byId = {};
    readNotes().forEach((n) => { if (n && n.id) byId[n.id] = n; });
    (rows || []).forEach((r) => {
      if (!r || !r.id) return;
      const remote = {
        id: r.id,
        date: r.date,
        title: r.title || "",
        body: r.body || "",
        created_at: r.created_at || "",
        updated_at: r.updated_at || ""
      };
      const local = byId[remote.id];
      if (!local || ts(remote.updated_at) > ts(local.updated_at)) byId[remote.id] = remote;
    });
    const out = writeNotes(Object.keys(byId).map((k) => byId[k]));
    const days = {};
    out.forEach((n) => { if (n.date) days[n.date] = true; });
    Object.keys(days).forEach(mirrorDay);
    return out;
  };

  const mergeByTime = (localMap, rows, pick) => {
    (rows || []).forEach((r) => {
      const remote = pick(r);
      const local = localMap[r.date];
      const rAt = ts(r.updated_at || (remote && remote.updated_at));
      const lAt = ts(local);
      if (!local) localMap[r.date] = remote;
      else if (rAt > lAt) localMap[r.date] = remote;
    });
    return localMap;
  };

  let votdCache = null;
  const verseOfDay = async () => {
    if (votdCache) return votdCache;
    try {
      const res = await fetch("https://beta.ourmanna.com/api/v1/get/?format=json&order=daily");
      const data = await res.json();
      const v = data.verse && data.verse.details;
      votdCache = v ? { text: v.text, reference: v.reference } : null;
    } catch {
      votdCache = { text: "This is the day which the Lord has made. We will rejoice and be glad in it.", reference: "Psalm 118:24" };
    }
    return votdCache;
  };

  const LS_SP = "align-spurgeon-day";
  const spurgeonMonth = {};
  const loadSpurgeonMonth = async (m) => {
    if (spurgeonMonth[m]) return spurgeonMonth[m];
    const res = await fetch("./data/spurgeon/" + m + ".json");
    if (!res.ok) throw new Error("Could not load devotion");
    const list = await res.json();
    spurgeonMonth[m] = list;
    return list;
  };

  const todaySpurgeon = async (which, date = new Date()) => {
    const m = date.getMonth() + 1;
    const d = date.getDate();
    const t = which === "pm" ? "pm" : "am";
    const key = m + "-" + d;
    try {
      const cached = JSON.parse(localStorage.getItem(LS_SP) || "null");
      if (cached && cached.key === key && cached[t]) return cached[t];
    } catch { /* ignore */ }
    const list = await loadSpurgeonMonth(m);
    const am = list.find((x) => x.m === m && x.d === d && x.t === "am") || list.find((x) => x.m === m && x.d === d) || null;
    const pm = list.find((x) => x.m === m && x.d === d && x.t === "pm") || am;
    try { localStorage.setItem(LS_SP, JSON.stringify({ key, am, pm })); } catch { /* quota */ }
    return t === "pm" ? pm : am;
  };

  const fetchODB = async () => {
    try {
      const res = await fetch("https://odb.org/feed/");
      const xml = await res.text();
      const item = xml.split("<item>")[1];
      if (!item) return null;
      const grab = (tag) => {
        const m = item.match(new RegExp("<" + tag + "[^>]*>(?:<!\\[CDATA\\[)?([\\s\\S]*?)(?:\\]\\]>)?</" + tag + ">"));
        return m ? m[1].replace(/<[^>]+>/g, " ").replace(/\s+/g, " ").trim() : "";
      };
      return { title: grab("title"), excerpt: grab("description"), date: grab("pubDate") };
    } catch {
      return null;
    }
  };

  const ACTS = [
    { k: "Adoration", d: "Tell Him who He is. Start with God, not the day." },
    { k: "Confession", d: "Name what’s off. Receive mercy. Don’t rush this." },
    { k: "Thanksgiving", d: "Be specific. Yesterday’s provision. This morning’s breath." },
    { k: "Supplication", d: "Ask. Family, work, the hours ahead, people you’re carrying." }
  ];

  const LS_A = "align-affirm";
  const DEFAULT_AFFIRMS = [
    "I am in Christ. The old has gone. The new has come. I walk this day as one made new.",
    "The Lord is my shepherd. I lack nothing. He leads me. I will not fear.",
    "I have hidden His word in my heart, that I might not sin against Him.",
    "I am God’s workmanship, created in Christ Jesus for good works He prepared beforehand.",
    "Greater is He who is in me than he who is in the world.",
    "This is the day the Lord has made. I will rejoice and be glad in it.",
    "I can do all things through Christ who strengthens me — not as a slogan, as dependence."
  ];

  const affirmationRow = () => loadJSON(LS_A, { text: "", updated_at: "" });
  const affirmationPref = () => String((affirmationRow() && affirmationRow().text) || "").trim();
  const saveAffirmationPref = (text, meta) => {
    const row = stamp({ text: String(text || "").trim() });
    if (meta && meta.updated_at) row.updated_at = meta.updated_at;
    saveJSON(LS_A, row);
    return row;
  };
  const todayAffirmation = (iso) => {
    const custom = affirmationPref();
    if (custom) return custom;
    const parts = String(iso || "").split("-").map(Number);
    const d = parts.length === 3 ? new Date(parts[0], parts[1] - 1, parts[2]) : new Date();
    const start = new Date(d.getFullYear(), 0, 0);
    const day = Math.floor((d - start) / 86400000);
    return DEFAULT_AFFIRMS[((day % DEFAULT_AFFIRMS.length) + DEFAULT_AFFIRMS.length) % DEFAULT_AFFIRMS.length];
  };

  const parseDevotionVerse = (raw) => {
    const s = String(raw || "").replace(/\s+/g, " ").trim();
    if (!s) return null;
    let text = s;
    let ref = "";
    const cut = s.match(/^(?:["“](.+?)["”]|(.+?))\s*[—–-]\s*(.+)$/);
    if (cut) {
      text = String(cut[1] || cut[2] || "").replace(/^["“]|["”]$/g, "").trim();
      ref = String(cut[3] || "").trim();
    }
    const rm = ref.match(/^(.+?)\s+(\d+):(\d+)(?:[-–](\d+))?$/);
    const book = rm ? rm[1].trim() : "";
    const chapter = rm ? Number(rm[2]) : 0;
    const verse = rm ? Number(rm[3]) : 0;
    const thru = rm && rm[4] ? Number(rm[4]) : verse;
    const id = "dev:" + (book || "verse").replace(/\s+/g, "").toLowerCase() + "-" + (chapter || 0) + "-" + (verse || 0);
    return {
      id, book: book || "Scripture", chapter: chapter || 1, verse: verse || 1, thru: thru || 1,
      text, theme: "Devotion", why: "The line from this morning’s devotion.",
      custom: true, source: "devotion", ref: ref || ""
    };
  };

  const devotionLog = () => {
    const all = journalsAll();
    return Object.keys(all).sort().reverse().map((iso) => {
      const j = all[iso] || {};
      const devotion = String(j.devotion || "").trim();
      if (!devotion) return null;
      return {
        iso,
        devotion,
        verse: String(j.anchorVerse || "").trim(),
        source: String(j.anchorSource || "").trim()
      };
    }).filter(Boolean);
  };

  return {
    BOOKS, STEPS, EVENING, ACTS, STEP_IDS,
    loadRoutine, saveRoutine, mergeRoutineRemote, coerceRoutine, fmtHM,
    clocksFor, isEvening, chapterTarget, stepsFor, wakeNote, lightsNote, preWakeNote, dueAlarms,
    todaySpurgeon, fetchODB,
    morningOf, setStep, emptyMorning,
    timesOf, markOpen, markClose, mergeTimesRemote, attachTimes, fmtSpan, dayTotalMs, timingParts,
    idealMinFor, idealMsFor, pathIdealMs, pathWindowMs, paceKind,
    bibleCursor, setBibleCursor, bookByName, nextRef, prevRef,
    fetchChapter, markChapterRead, todayAssignment,
    planOf, savePlan, journalOf, saveJournal, journalsAll, devotionLog,
    notesList, noteById, emptyNote, upsertNote, deleteNote, mergeNotesRemote, verseOfDay,
    affirmationPref, saveAffirmationPref, affirmationRow, todayAffirmation, parseDevotionVerse
  };
})();
