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

  /* Sunday: lights out 12:00 AM, rise 4:00 AM.
     Mon–Sat: lights out 1:00 AM, rise 5:00 AM. */
  const clocksFor = (date) => {
    const d = date instanceof Date ? date : new Date(date);
    const sunday = d.getDay() === 0;
    return {
      sunday,
      wakeH: sunday ? 4 : 5,
      wakeLabel: sunday ? "4:00 AM" : "5:00 AM",
      tonightH: sunday ? 0 : 1,
      tonightLabel: sunday ? "12:00 AM" : "1:00 AM",
      leaveLabel: sunday ? "5:45 AM" : null
    };
  };

  const chapterTarget = (iso) => {
    const [y, m, d] = String(iso).split("-").map(Number);
    return new Date(y, m - 1, d).getDay() === 0 ? 1 : 3;
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

  /* 5 min before rise (Sun 03:55 / else 04:55).
     10 min before lights (Sat 23:50 for Sunday midnight / Mon–Sat 00:50 for 1:00). */
  const dueAlarms = (now = new Date()) => {
    const d = now instanceof Date ? now : new Date(now);
    const dow = d.getDay();
    const WIN = 8;
    if ((dow === 0 && inWindow(d, 3, 55, WIN)) || (dow !== 0 && inWindow(d, 4, 55, WIN))) {
      const n = preWakeNote(d);
      return { kind: "wake", iso: isoOfDate(d), title: n.title, body: n.body };
    }
    if (dow === 6 && inWindow(d, 23, 50, WIN)) {
      const sun = new Date(d.getFullYear(), d.getMonth(), d.getDate() + 1);
      const n = lightsNote(sun);
      return { kind: "lights", iso: isoOfDate(sun), title: n.title, body: n.body };
    }
    if (dow === 0 && inWindow(d, 0, 0, WIN)) {
      const n = lightsNote(d);
      return { kind: "lights", iso: isoOfDate(d), title: n.title, body: n.body };
    }
    if (dow !== 0 && inWindow(d, 0, 50, WIN)) {
      const n = lightsNote(d);
      return { kind: "lights", iso: isoOfDate(d), title: n.title, body: n.body };
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
    { id: "word", title: "Scripture", sub: "Three or four chapters. Stay with it.", icon: "word" },
    { id: "drill", title: "Sprint", sub: "Thirty questions. Meaning, not trivia.", icon: "drill" },
    { id: "verse", title: "Memory", sub: "Hide one line from today’s reading.", icon: "verse" },
    { id: "affirm", title: "Affirm", sub: "Read today’s word over yourself.", icon: "spark" },
    { id: "plan", title: "Plan the day", sub: "Three true priorities. Then the rest.", icon: "plan" },
    { id: "ready", title: "Get ready", sub: "Bath, dress, leave the room in order.", icon: "ready" },
    { id: "go", title: "Begin", sub: "Step into the day. Nothing else to open.", icon: "go" }
  ];

  const LS_M = "align-morning";
  const LS_B = "align-bible";
  const LS_P = "align-plans";
  const LS_J = "align-journal";

  const loadJSON = (k, fallback) => {
    try { return JSON.parse(localStorage.getItem(k) || "null") || fallback; } catch { return fallback; }
  };
  const saveJSON = (k, v) => localStorage.setItem(k, JSON.stringify(v));

  const stepsFor = (date) => {
    const sunday = clocksFor(date).sunday;
    if (!sunday) return STEPS;
    return STEPS.map((s) => {
      if (s.id === "move") return { ...s, sub: "Twelve minutes. Then Word." };
      if (s.id === "devotion") return { ...s, sub: "Short. One line that stays." };
      if (s.id === "word") return { ...s, sub: "One chapter. That’s Sunday." };
      if (s.id === "drill") return { ...s, sub: "Thirty questions on the one chapter." };
      if (s.id === "verse") return { ...s, sub: "Hide the line. Then church." };
      if (s.id === "affirm") return { ...s, sub: "Speak it. Then get ready." };
      if (s.id === "plan") return { ...s, sub: "Church first. Keep the rest light." };
      if (s.id === "ready") return { ...s, sub: "Dress for church. Leave by 5:45." };
      if (s.id === "go") return { ...s, sub: "Out the door by 5:45." };
      return s;
    });
  };

  const emptyMorning = () => Object.fromEntries(STEPS.map((s) => [s.id, false]));

  const morningOf = (iso) => {
    const all = loadJSON(LS_M, {});
    if (!all[iso]) all[iso] = emptyMorning();
    return all[iso];
  };

  const setStep = (iso, id, val) => {
    const all = loadJSON(LS_M, {});
    if (!all[iso]) all[iso] = emptyMorning();
    all[iso][id] = val;
    saveJSON(LS_M, all);
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

  const planOf = (iso) => {
    const all = loadJSON(LS_P, {});
    if (!all[iso]) all[iso] = { priorities: ["", "", ""], tasks: [], note: "" };
    return all[iso];
  };
  const savePlan = (iso, plan) => {
    const all = loadJSON(LS_P, {});
    all[iso] = stamp(plan || {});
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

  const affirmationPref = () => {
    const row = loadJSON(LS_A, { text: "" });
    return String((row && row.text) || "").trim();
  };
  const saveAffirmationPref = (text) => {
    const row = stamp({ text: String(text || "").trim() });
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
    BOOKS, STEPS, EVENING, ACTS,
    clocksFor, isEvening, chapterTarget, stepsFor, wakeNote, lightsNote, preWakeNote, dueAlarms,
    todaySpurgeon, fetchODB,
    morningOf, setStep, emptyMorning,
    bibleCursor, setBibleCursor, bookByName, nextRef, prevRef,
    fetchChapter, markChapterRead, todayAssignment,
    planOf, savePlan, journalOf, saveJournal, journalsAll, devotionLog,
    notesList, noteById, emptyNote, upsertNote, deleteNote, mergeNotesRemote, verseOfDay,
    affirmationPref, saveAffirmationPref, todayAffirmation
  };
})();
