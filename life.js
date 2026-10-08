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

  /* Public-domain / freely licensed English texts on bible-api.com.
     NIV, ESV, NLT, The Message and similar are copyrighted — not available here. */
  const TRANSLATIONS = [
    { id: "kjv", name: "King James", short: "KJV", sub: "1611 · ALIGN’s default" },
    { id: "web", name: "World English", short: "WEB", sub: "Modern public domain" },
    { id: "webbe", name: "World English (UK)", short: "WEBBE", sub: "British spelling" },
    { id: "asv", name: "American Standard", short: "ASV", sub: "1901" },
    { id: "bbe", name: "Basic English", short: "BBE", sub: "Simple words" },
    { id: "darby", name: "Darby", short: "Darby", sub: "1890" },
    { id: "dra", name: "Douay-Rheims", short: "D-R", sub: "1899 · Catholic" },
    { id: "oeb-cw", name: "Open English", short: "OEB", sub: "Commonwealth spelling" },
    { id: "oeb-us", name: "Open English (US)", short: "OEB-US", sub: "US spelling" }
  ];
  const TR_OK = {};
  TRANSLATIONS.forEach((t) => { TR_OK[t.id] = t; });

  const READ_PLANS = [
    { id: "cover", name: "Cover to cover", sub: "Genesis to Revelation. The long walk." },
    { id: "nt", name: "New Testament first", sub: "Matthew through Revelation, then the Old." },
    { id: "gospels", name: "Gospels first", sub: "Matthew to John, the rest of the NT, then the Old." },
    { id: "mark", name: "Begin with Mark", sub: "Mark, the rest of the NT, then the Old." },
    { id: "ntonly", name: "New Testament", sub: "Matthew to Revelation, then again." },
    { id: "ot", name: "Old Testament", sub: "Genesis to Malachi, then again." },
    { id: "gospelsonly", name: "Gospels", sub: "Matthew, Mark, Luke, John — looping." },
    { id: "law", name: "The Law", sub: "Genesis through Deuteronomy." },
    { id: "history", name: "History", sub: "Joshua through Esther." },
    { id: "wisdom", name: "Wisdom", sub: "Job, Psalms, Proverbs, Ecclesiastes, Song." },
    { id: "psalms", name: "Psalms", sub: "The prayer book. Then again." },
    { id: "prophets", name: "The Prophets", sub: "Isaiah through Malachi." },
    { id: "letters", name: "Letters", sub: "Romans through Revelation." },
    { id: "chrono", name: "Chronological", sub: "Job sits with the patriarchs, then the rest in order." },
    { id: "hebrew", name: "Hebrew order", sub: "Law, Prophets, Writings, then the New Testament." }
  ];
  const PLAN_OK = {};
  READ_PLANS.forEach((p) => { PLAN_OK[p.id] = p; });

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
    on: Object.fromEntries(STEP_IDS.map((id) => [id, id !== "move"])),
    order: STEP_IDS.slice(),
    trainPlan: "energy",
    biblePlan: "cover",
    bibleTr: "kjv",
    aimMornings: 6,
    aimChapters: 19,
    aimSessions: 6,
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
    const derivedCh = d.chaptersWk * 6 + d.chaptersSun;
    d.aimMornings = Math.max(1, Math.min(7, Number(raw.aimMornings) || 6));
    d.aimSessions = Math.max(1, Math.min(7, Number(raw.aimSessions) || 6));
    d.aimChapters = Math.max(1, Math.min(84, Number(raw.aimChapters) || derivedCh));
    STEP_IDS.forEach((id) => {
      const locked = id === "rise" || id === "go";
      if (locked) d.on[id] = true;
      else if (raw.on && Object.prototype.hasOwnProperty.call(raw.on, id)) d.on[id] = raw.on[id] !== false;
      else d.on[id] = id !== "move";
      d.min[id] = clampMin(raw.min && raw.min[id], d.min[id]);
      d.minSun[id] = clampMin(raw.minSun && raw.minSun[id], d.minSun[id]);
    });
    const seen = {};
    const mid = [];
    (Array.isArray(raw.order) ? raw.order : []).forEach((id) => {
      if (id === "rise" || id === "go") return;
      if (STEP_IDS.indexOf(id) >= 0 && !seen[id]) { seen[id] = 1; mid.push(id); }
    });
    STEP_IDS.forEach((id) => {
      if (id === "rise" || id === "go") return;
      if (!seen[id]) mid.push(id);
    });
    d.order = ["rise"].concat(mid, ["go"]);
    d.trainPlan = ["energy", "strength", "mobility", "capacity"].indexOf(raw.trainPlan) >= 0 ? raw.trainPlan : "energy";
    d.biblePlan = PLAN_OK[raw.biblePlan] ? raw.biblePlan : "cover";
    let tr = String(raw.bibleTr || "").toLowerCase();
    if (!TR_OK[tr]) {
      try { tr = String(localStorage.getItem("align-bible-tr") || "").toLowerCase(); } catch { tr = ""; }
    }
    d.bibleTr = TR_OK[tr] ? tr : "kjv";
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

  const LS_SHORT = "align-short";
  const shortDay = () => {
    try { return localStorage.getItem(LS_SHORT) || ""; } catch { return ""; }
  };
  const isShort = (iso) => !!iso && shortDay() === iso;
  const setShort = (iso, on) => {
    try {
      if (on && iso) localStorage.setItem(LS_SHORT, iso);
      else if (shortDay() === iso || !iso) localStorage.removeItem(LS_SHORT);
    } catch { /* ignore */ }
  };

  const chapterTarget = (iso) => {
    if (isShort(iso)) return 1;
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

  /* Four a day: 5 min before rise, 14:00 plan, 19:00 book, 10 min before lights. */
  const dueAlarms = (now = new Date()) => {
    const d = now instanceof Date ? now : new Date(now);
    const WIN = 15;
    const sameDay = (a, b) => a.getFullYear() === b.getFullYear() && a.getMonth() === b.getMonth() && a.getDate() === b.getDate();
    const hit = (at) => inWindow(d, at.getHours(), at.getMinutes(), WIN) && sameDay(d, at);
    const clk = clocksFor(d);
    const wakeAt = new Date(d.getFullYear(), d.getMonth(), d.getDate(), clk.wakeH, clk.wakeM || 0, 0, 0);
    const preWake = new Date(wakeAt.getTime() - 5 * 60 * 1000);
    if (hit(preWake)) {
      return { kind: "wake", iso: isoOfDate(d), title: "ALIGN ·", body: "Five minutes." };
    }
    const tom = new Date(d.getFullYear(), d.getMonth(), d.getDate() + 1);
    const clkT = clocksFor(tom);
    const wakeT = new Date(tom.getFullYear(), tom.getMonth(), tom.getDate(), clkT.wakeH, clkT.wakeM || 0, 0, 0);
    const preWT = new Date(wakeT.getTime() - 5 * 60 * 1000);
    if (hit(preWT)) {
      return { kind: "wake", iso: isoOfDate(tom), title: "ALIGN ·", body: "Five minutes." };
    }
    const planAt = new Date(d.getFullYear(), d.getMonth(), d.getDate(), 14, 0, 0, 0);
    if (hit(planAt)) {
      return { kind: "plan", iso: isoOfDate(d), title: "ALIGN ·", body: "Today’s three. Still yours." };
    }
    const readAt = new Date(d.getFullYear(), d.getMonth(), d.getDate(), 19, 0, 0, 0);
    if (hit(readAt)) {
      return { kind: "read", iso: isoOfDate(d), title: "ALIGN ·", body: "The book is waiting." };
    }
    const lightsAt = new Date(d.getFullYear(), d.getMonth(), d.getDate(), clk.tonightH, clk.tonightM || 0, 0, 0);
    const preL = new Date(lightsAt.getTime() - 10 * 60 * 1000);
    if (hit(preL)) {
      return { kind: "lights", iso: isoOfDate(d), title: "ALIGN ·", body: "Night devotion. Then the verse." };
    }
    const lightsT = new Date(tom.getFullYear(), tom.getMonth(), tom.getDate(), clkT.tonightH, clkT.tonightM || 0, 0, 0);
    const preLT = new Date(lightsT.getTime() - 10 * 60 * 1000);
    if (hit(preLT)) {
      return { kind: "lights", iso: isoOfDate(tom), title: "ALIGN ·", body: "Night devotion. Then the verse." };
    }
    return null;
  };

  const EVENING = [
    { id: "evening", title: "Night devotion", sub: "Spurgeon for the night. Then the verse once more.", icon: "book" },
    { id: "nightverse", title: "Memory verse", sub: "The devotion line. Read it again before you sleep.", icon: "verse" },
    { id: "lights", title: "Goodnight", sub: "Phone down at the hour you set. Rise is already waiting.", icon: "ready" }
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
  const fmtClockAt = (ms) => {
    const n = Number(ms) || 0;
    if (!n) return "";
    const d = new Date(n);
    return fmtHM(d.getHours(), d.getMinutes());
  };
  const stampClock = (iso, id) => {
    if (!iso || (id !== "rise" && id !== "lights")) return timesOf(iso);
    const row = Object.assign({}, timesOf(iso));
    const cur = Object.assign({}, stepTime(row, id) || {});
    if (cur.at) return row;
    const now = Date.now();
    cur.at = now;
    if (!cur.open) cur.open = now;
    if (!cur.close) cur.close = now;
    row[id] = cur;
    return saveTimes(iso, row);
  };
  const clockAt = (iso, id) => {
    const cur = stepTime(timesOf(iso), id) || {};
    const at = Number(cur.at || cur.close || 0) || 0;
    if (!at) return null;
    return { at, label: fmtClockAt(at) };
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
      const at = [x.at, y.at].filter((n) => n > 0);
      out[k] = {
        open: open.length ? Math.min.apply(null, open) : (x.open || y.open),
        close: close.length ? Math.max.apply(null, close) : (x.close || y.close),
        ms: Math.max(x.ms || 0, y.ms || 0),
        at: at.length ? Math.min.apply(null, at) : (x.at || y.at)
      };
      if (!out[k].at) delete out[k].at;
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
      if (t[k] && typeof t[k] === "object" && (t[k].ms || t[k].open || t[k].at || t[k].close)) times[k] = t[k];
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

  const HOLD_IDS = { pray: 1, devotion: 1, verse: 1, word: 1, recite: 1, affirm: 1, evening: 1, nightverse: 1 };
  const idealMinFor = (iso, id, opts) => {
    const r = loadRoutine();
    const [y, m, d] = String(iso).split("-").map(Number);
    const sunday = new Date(y, m - 1, d).getDay() === 0;
    const table = sunday ? r.minSun : r.min;
    if (id === "move" && opts && opts.trainMin != null) return Math.max(1, Number(opts.trainMin) || table.move || 1);
    if (id === "read") return 8;
    if (id === "evening") return 8;
    if (id === "nightverse") return 2;
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

  const booksNamed = (names) => (names || []).map((n) => BOOKS.find((b) => b.name === n)).filter(Boolean);
  const planBooks = (id) => {
    const ntAt = BOOKS.findIndex((b) => b.name === "Matthew");
    const ot = ntAt >= 0 ? BOOKS.slice(0, ntAt) : [];
    const nt = ntAt >= 0 ? BOOKS.slice(ntAt) : BOOKS;
    const gospels = nt.slice(0, 4);
    if (id === "nt") return nt.concat(ot);
    if (id === "gospels") return gospels.concat(nt.slice(4), ot);
    if (id === "mark") {
      const mark = nt.find((b) => b.name === "Mark");
      return (mark ? [mark] : []).concat(nt.filter((b) => b.name !== "Mark"), ot);
    }
    if (id === "ntonly") return nt;
    if (id === "ot") return ot;
    if (id === "gospelsonly") return gospels;
    if (id === "law") return booksNamed(["Genesis", "Exodus", "Leviticus", "Numbers", "Deuteronomy"]);
    if (id === "history") return booksNamed([
      "Joshua", "Judges", "Ruth", "1 Samuel", "2 Samuel", "1 Kings", "2 Kings",
      "1 Chronicles", "2 Chronicles", "Ezra", "Nehemiah", "Esther"
    ]);
    if (id === "wisdom") return booksNamed(["Job", "Psalm", "Proverbs", "Ecclesiastes", "Song of Solomon"]);
    if (id === "psalms") return booksNamed(["Psalm"]);
    if (id === "prophets") return booksNamed([
      "Isaiah", "Jeremiah", "Lamentations", "Ezekiel", "Daniel",
      "Hosea", "Joel", "Amos", "Obadiah", "Jonah", "Micah", "Nahum", "Habakkuk", "Zephaniah", "Haggai", "Zechariah", "Malachi"
    ]);
    if (id === "letters") return booksNamed([
      "Romans", "1 Corinthians", "2 Corinthians", "Galatians", "Ephesians", "Philippians", "Colossians",
      "1 Thessalonians", "2 Thessalonians", "1 Timothy", "2 Timothy", "Titus", "Philemon",
      "Hebrews", "James", "1 Peter", "2 Peter", "1 John", "2 John", "3 John", "Jude", "Revelation"
    ]);
    if (id === "chrono") {
      const job = BOOKS.find((b) => b.name === "Job");
      const rest = BOOKS.filter((b) => b.name !== "Job");
      const i = rest.findIndex((b) => b.name === "Exodus");
      if (!job || i < 0) return BOOKS;
      return rest.slice(0, i).concat([job], rest.slice(i));
    }
    if (id === "hebrew") {
      return booksNamed([
        "Genesis", "Exodus", "Leviticus", "Numbers", "Deuteronomy",
        "Joshua", "Judges", "1 Samuel", "2 Samuel", "1 Kings", "2 Kings",
        "Isaiah", "Jeremiah", "Ezekiel",
        "Hosea", "Joel", "Amos", "Obadiah", "Jonah", "Micah", "Nahum", "Habakkuk", "Zephaniah", "Haggai", "Zechariah", "Malachi",
        "Psalm", "Proverbs", "Job", "Song of Solomon", "Ruth", "Lamentations", "Ecclesiastes", "Esther", "Daniel", "Ezra", "Nehemiah", "1 Chronicles", "2 Chronicles"
      ]).concat(nt);
    }
    return BOOKS;
  };
  const biblePlan = () => {
    const id = (loadRoutine() || {}).biblePlan;
    return PLAN_OK[id] ? id : "cover";
  };
  const planStart = (id) => {
    const seq = planBooks(id || biblePlan());
    const b = seq[0] || BOOKS[0];
    return { book: b.name, chapter: 1 };
  };
  const planNext = (book, chapter, id) => {
    const seq = planBooks(id || biblePlan());
    const b = bookByName(book);
    const i = seq.findIndex((x) => x.name === b.name);
    if (i < 0) {
      if (chapter < b.chapters) return { book: b.name, chapter: chapter + 1 };
      return { book: seq[0].name, chapter: 1 };
    }
    if (chapter < seq[i].chapters) return { book: seq[i].name, chapter: chapter + 1 };
    const n = seq[(i + 1) % seq.length];
    return { book: n.name, chapter: 1 };
  };

  const LS_TR = "align-bible-tr";
  const LS_CH = "align-bible-ch";
  const bibleTr = () => {
    try {
      const r = loadRoutine();
      if (r && TR_OK[r.bibleTr]) return r.bibleTr;
    } catch { /* ignore */ }
    try {
      const t = localStorage.getItem(LS_TR);
      if (TR_OK[t]) return t;
    } catch { /* ignore */ }
    return "kjv";
  };
  const setBibleTr = (id) => {
    const t = TR_OK[id] ? id : "kjv";
    try { localStorage.setItem(LS_TR, t); } catch { /* ignore */ }
    return t;
  };
  const trMeta = (id) => TR_OK[id] || TR_OK.kjv;
  const pruneMap = (map, cap) => {
    const keys = Object.keys(map || {});
    if (keys.length <= cap) return map;
    keys.slice(0, keys.length - cap).forEach((k) => { delete map[k]; });
    return map;
  };
  let diskCh = null;
  const readDiskCh = () => {
    if (diskCh) return diskCh;
    try { diskCh = JSON.parse(localStorage.getItem(LS_CH) || "{}") || {}; } catch { diskCh = {}; }
    pruneMap(diskCh, 6);
    return diskCh;
  };
  const writeDiskCh = (map) => {
    diskCh = pruneMap(map || {}, 6);
    try { localStorage.setItem(LS_CH, JSON.stringify(diskCh)); } catch { /* quota */ }
  };
  const chapterCache = {};
  const slimVerses = (verses) => (verses || []).map((v) => ({
    verse: v.verse,
    text: String(v.text || "").trim()
  }));
  const rememberChapter = (key, slim) => {
    chapterCache[key] = slim;
    pruneMap(chapterCache, 4);
  };
  const fetchChapter = async (book, chapter) => {
    const tr = bibleTr();
    const key = tr + "|" + book + " " + chapter;
    if (chapterCache[key]) return chapterCache[key];
    const disk = readDiskCh();
    if (disk[key] && disk[key].verses && disk[key].verses.length) {
      rememberChapter(key, disk[key]);
      return disk[key];
    }
    const url = "https://bible-api.com/" + encodeURIComponent(book + " " + chapter) + "?translation=" + encodeURIComponent(tr);
    const res = await fetch(url);
    if (!res.ok) throw new Error("Could not load " + book + " " + chapter);
    const data = await res.json();
    if (data.error) throw new Error(data.error);
    const slim = { reference: data.reference, verses: slimVerses(data.verses), translation_id: tr };
    rememberChapter(key, slim);
    disk[key] = slim;
    writeDiskCh(disk);
    return slim;
  };
  const prefetchChapter = (book, chapter) => {
    try {
      const n = nextRef(book, chapter);
      fetchChapter(n.book, n.chapter).catch(() => {});
    } catch { /* ignore */ }
  };

  const chapterId = (book, chapter) => String(book || "").trim() + " " + Number(chapter);
  const chapterIsRead = (book, chapter) => {
    const id = chapterId(book, chapter);
    return (bibleCursor().log || []).some((x) => x && (x.id === id || (x.book === book && Number(x.chapter) === Number(chapter))));
  };
  const nextUnread = (book, chapter) => {
    let b = String(book || "Genesis").trim() || "Genesis";
    let ch = Math.max(1, Number(chapter) || 1);
    const origin = chapterId(b, ch);
    for (let i = 0; i < 1300; i++) {
      if (!chapterIsRead(b, ch)) return { book: b, chapter: ch };
      const n = planNext(b, ch);
      if (!n || !n.book) break;
      b = n.book;
      ch = Number(n.chapter) || 1;
      if (chapterId(b, ch) === origin) break;
    }
    return { book: b, chapter: ch };
  };
  const uniqueReadCount = () => {
    const s = new Set();
    (bibleCursor().log || []).forEach((x) => {
      const id = (x && x.id) || (x && x.book ? chapterId(x.book, x.chapter) : "");
      if (id) s.add(id);
    });
    return s.size;
  };
  const readCountInBook = (book) => {
    const s = new Set();
    (bibleCursor().log || []).forEach((x) => {
      if (x && x.book === book) s.add(Number(x.chapter));
    });
    return s.size;
  };
  const markChapterRead = (iso, book, chapter, verses) => {
    const c = bibleCursor();
    const id = chapterId(book, chapter);
    c.log = c.log || [];
    if (!c.log.find((x) => x.id === id && x.date === iso)) {
      c.log.push({ id, book, chapter: Number(chapter) || 1, verses: verses || 0, date: iso });
    }
    const atPlace = c.book === book && Number(c.chapter) === Number(chapter);
    if (atPlace) {
      const n = planNext(book, chapter);
      c.book = n.book;
      c.chapter = n.chapter;
    }
    const u = nextUnread(c.book, c.chapter);
    c.book = u.book;
    c.chapter = u.chapter;
    setBibleCursor(c);
    return c;
  };

  const todayAssignment = (iso) => {
    const c = bibleCursor();
    const readToday = (c.log || []).filter((x) => x.date === iso);
    const nxt = nextUnread(c.book, c.chapter);
    if (readToday.length) {
      return { start: { book: readToday[0].book, chapter: readToday[0].chapter }, read: readToday, next: nxt };
    }
    return { start: nxt, read: [], next: nxt };
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

  const textKey = (s) => String(s || "").trim().toLowerCase();

  const previousPlan = (iso, all) => {
    for (let n = 1; n <= 14; n++) {
      const prev = all[shiftIso(iso, -n)];
      if (!prev) continue;
      return normalizePlan(prev);
    }
    return null;
  };

  const emptyRolled = () => ({ p: [null, null, null], t: [] });

  const readRolled = (row) => {
    const src = row && row._rolled;
    if (!src || typeof src !== "object") return emptyRolled();
    return {
      p: [src.p && src.p[0] || null, src.p && src.p[1] || null, src.p && src.p[2] || null],
      t: Array.isArray(src.t) ? src.t.slice() : []
    };
  };

  const carryInto = (iso, plan) => {
    const all = loadJSON(LS_P, {});
    const today = normalizePlan(plan);
    if (today._carried) return today;
    const src = previousPlan(iso, all);
    const rolled = readRolled(today);
    if (src) {
      [0, 1, 2].forEach((i) => {
        const y = src.priorities[i];
        const t = today.priorities[i];
        if (y.text && !y.done && !t.text) {
          today.priorities[i] = { text: y.text, done: false, id: y.id || ("p" + (i + 1)) };
          rolled.p[i] = y.text;
        }
      });
      const seen = new Set(today.tasks.map((t) => textKey(t.text)).filter(Boolean));
      src.tasks.forEach((tk) => {
        if (!tk.text || tk.done) return;
        const key = textKey(tk.text);
        if (seen.has(key)) return;
        today.tasks.push({ id: tk.id || planTaskId(), text: tk.text, done: false });
        seen.add(key);
        rolled.t.push(tk.text);
      });
    }
    today._rolled = rolled;
    today._carried = true;
    return today;
  };

  const markZombies = (iso, row, all) => {
    const src = previousPlan(iso, all);
    const rolled = readRolled(row);
    const olderP = [[], [], []];
    const olderT = new Set();
    for (let n = 2; n <= 14; n++) {
      const prev = all[shiftIso(iso, -n)];
      if (!prev) continue;
      const yp = normalizePlan(prev);
      [0, 1, 2].forEach((i) => {
        if (yp.priorities[i].text) olderP[i].push(textKey(yp.priorities[i].text));
      });
      yp.tasks.forEach((tk) => { if (tk.text) olderT.add(textKey(tk.text)); });
    }
    [0, 1, 2].forEach((i) => {
      const t = row.priorities[i];
      if (!t.text || t.done) return;
      const key = textKey(t.text);
      const y = src && src.priorities[i];
      if (y && y.text && !y.done && textKey(y.text) === key) {
        if (!rolled.p[i]) rolled.p[i] = t.text;
        return;
      }
      const srcDoneSame = !!(y && y.done && textKey(y.text) === key);
      const srcEmpty = !(y && y.text);
      if ((srcDoneSame || srcEmpty) && olderP[i].indexOf(key) !== -1) rolled.p[i] = t.text;
    });
    row.tasks.forEach((tk) => {
      if (!tk.text || tk.done) return;
      const key = textKey(tk.text);
      if (rolled.t.some((x) => textKey(x) === key)) return;
      const srcOpen = !!(src && src.tasks.some((x) => textKey(x.text) === key && !x.done));
      if (srcOpen) {
        rolled.t.push(tk.text);
        return;
      }
      const srcHas = !!(src && src.tasks.some((x) => textKey(x.text) === key));
      if (!srcHas && olderT.has(key)) rolled.t.push(tk.text);
      if (srcHas && src.tasks.some((x) => textKey(x.text) === key && x.done) && olderT.has(key)) rolled.t.push(tk.text);
    });
    row._rolled = rolled;
    return row;
  };

  const applyScrub = (iso, plan) => {
    const all = loadJSON(LS_P, {});
    const row = normalizePlan(plan);
    const src = previousPlan(iso, all);
    if (!src) return null;
    const rolled = readRolled(row);
    let changed = false;
    [0, 1, 2].forEach((i) => {
      const t = row.priorities[i];
      const mark = rolled.p[i];
      if (!mark || !t.text || t.done) return;
      if (textKey(t.text) !== textKey(mark)) return;
      const y = src.priorities[i];
      if (y && y.text && !y.done && textKey(y.text) === textKey(t.text)) return;
      row.priorities[i] = { text: "", done: false, id: t.id || ("p" + (i + 1)) };
      rolled.p[i] = null;
      changed = true;
    });
    const rolledKeys = new Set(rolled.t.map(textKey));
    const nextT = [];
    const nextRolledT = [];
    row.tasks.forEach((tk) => {
      if (!tk.text) {
        nextT.push(tk);
        return;
      }
      const key = textKey(tk.text);
      if (!tk.done && rolledKeys.has(key)) {
        const still = src.tasks.some((x) => textKey(x.text) === key && !x.done);
        if (!still) {
          changed = true;
          return;
        }
        nextRolledT.push(tk.text);
      }
      nextT.push(tk);
    });
    if (nextT.length !== row.tasks.length) changed = true;
    row.tasks = nextT;
    rolled.t = nextRolledT;
    row._rolled = rolled;
    return changed ? row : null;
  };

  const peekPlan = (iso) => {
    const all = loadJSON(LS_P, {});
    if (!all[iso]) return normalizePlan({ priorities: ["", "", ""], tasks: [], note: "" });
    return normalizePlan(all[iso]);
  };
  const planOf = (iso) => {
    const all = loadJSON(LS_P, {});
    let row = normalizePlan(all[iso] || { priorities: ["", "", ""], tasks: [], note: "" });
    let dirty = false;
    if (!row._carried) {
      row = carryInto(iso, row);
      dirty = true;
    }
    if (!row._scrubbed) {
      row = markZombies(iso, row, all);
      row._scrubbed = true;
      dirty = true;
    }
    const scrubbed = applyScrub(iso, row);
    if (scrubbed) {
      row = scrubbed;
      dirty = true;
    }
    if (dirty) {
      row._needsSync = true;
      all[iso] = stamp(row);
      saveJSON(LS_P, all);
    }
    return row;
  };
  const savePlan = (iso, plan) => {
    const all = loadJSON(LS_P, {});
    const row = normalizePlan(plan || {});
    row._carried = true;
    row._needsSync = false;
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
  const loadSpurgeonMonth = async (m) => {
    const res = await fetch("./data/spurgeon/" + m + ".json");
    if (!res.ok) throw new Error("Could not load devotion");
    return await res.json();
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

  const LS_ODB = "align-odb-day";
  const isoLocal = () => {
    const d = new Date();
    const y = d.getFullYear();
    const m = String(d.getMonth() + 1).padStart(2, "0");
    const day = String(d.getDate()).padStart(2, "0");
    return y + "-" + m + "-" + day;
  };
  const parseOdbRss = (xml) => {
    const item = String(xml || "").split("<item>")[1];
    if (!item) return null;
    const grab = (tag) => {
      const m = item.match(new RegExp("<" + tag + "[^>]*>(?:<!\\[CDATA\\[)?([\\s\\S]*?)(?:\\]\\]>)?</" + tag + ">", "i"));
      return m ? m[1].replace(/<[^>]+>/g, " ").replace(/\s+/g, " ").trim() : "";
    };
    const title = grab("title");
    if (!title) return null;
    return { title, excerpt: grab("description"), url: grab("link") };
  };
  const fetchODB = async () => {
    const iso = isoLocal();
    try {
      const cached = JSON.parse(localStorage.getItem(LS_ODB) || "null");
      if (cached && cached.iso === iso && cached.title) return cached;
    } catch { /* ignore */ }
    const take = (row) => {
      if (!row || !row.title) return null;
      const out = {
        title: String(row.title || "").trim(),
        excerpt: String(row.excerpt || "").trim(),
        url: String(row.url || "").trim(),
        iso
      };
      try { localStorage.setItem(LS_ODB, JSON.stringify(out)); } catch { /* quota */ }
      return out;
    };
    try {
      const res = await fetch("./api/odb");
      if (res.ok) {
        const row = take(await res.json());
        if (row) return row;
      }
    } catch { /* API cold or offline */ }
    try {
      const res = await fetch("https://odb.org/feed/");
      if (!res.ok) return null;
      return take(parseOdbRss(await res.text()));
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

  const kjvCache = {};
  const kjvBook = (book) => {
    const b = String(book || "").trim();
    const map = {
      "Song of Songs": "Song of Solomon",
      "Canticles": "Song of Solomon",
      "Psalms": "Psalm",
      "Ps": "Psalm",
      "Psa": "Psalm"
    };
    return map[b] || b;
  };
  const fetchKjv = async (book, chapter, verse, thru) => {
    const b = kjvBook(book);
    const ch = Number(chapter) || 0;
    const v = Number(verse) || 0;
    const t = Number(thru) || v;
    if (!b || !ch || !v) return null;
    let q = b + " " + ch + ":" + v;
    if (t > v) q += "-" + t;
    if (kjvCache[q]) return kjvCache[q];
    const url = "https://bible-api.com/" + encodeURIComponent(q) + "?translation=kjv";
    const res = await fetch(url);
    if (!res.ok) throw new Error("Could not load KJV");
    const data = await res.json();
    const text = String((data && data.text) || "").replace(/\s+/g, " ").trim();
    if (!text) throw new Error("empty");
    const out = { text, reference: (data && data.reference) || q, translation: "KJV" };
    kjvCache[q] = out;
    pruneMap(kjvCache, 8);
    return out;
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
    clocksFor, isEvening, chapterTarget, isShort, setShort, stepsFor, wakeNote, lightsNote, preWakeNote, dueAlarms,
    todaySpurgeon, fetchODB,
    morningOf, setStep, emptyMorning,
    timesOf, markOpen, markClose, stampClock, clockAt, fmtClockAt, mergeTimesRemote, attachTimes, fmtSpan, dayTotalMs, timingParts,
    idealMinFor, idealMsFor, pathIdealMs, pathWindowMs, paceKind,
    bibleCursor, setBibleCursor, bookByName, nextRef, prevRef,
    TRANSLATIONS, READ_PLANS, biblePlan, planStart, planNext, planBooks, trMeta,
    fetchChapter, prefetchChapter, bibleTr, setBibleTr, markChapterRead, todayAssignment,
    chapterIsRead, nextUnread, uniqueReadCount, readCountInBook, chapterId,
    planOf, peekPlan, savePlan, journalOf, saveJournal, journalsAll, devotionLog,
    notesList, noteById, emptyNote, upsertNote, deleteNote, mergeNotesRemote, verseOfDay,
    affirmationPref, saveAffirmationPref, affirmationRow, todayAffirmation, parseDevotionVerse, fetchKjv
  };
})();
