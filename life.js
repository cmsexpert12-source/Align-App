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

  const EVENING = [
    { id: "evening", title: "Evening Word", sub: "Spurgeon for the night. Then put the phone down.", icon: "word" },
    { id: "lights", title: "Lights out", sub: "Bed at the hour you set. The morning is already planned.", icon: "ready" }
  ];

  const STEPS = [
    { id: "rise", title: "Rise", sub: "You’re up. The day is a gift.", icon: "rise" },
    { id: "move", title: "Train", sub: "Body first, while the mind is quiet.", icon: "move" },
    { id: "pray", title: "Pray", sub: "Before you read. Before you plan.", icon: "pray" },
    { id: "devotion", title: "Devotion", sub: "Your daily reading. Capture what stays.", icon: "book" },
    { id: "word", title: "Scripture", sub: "Three or four chapters. Stay with it.", icon: "word" },
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

  const journalOf = (iso) => {
    const all = loadJSON(LS_J, {});
    if (!all[iso]) all[iso] = { prayer: "", devotion: "", word: "", praySeconds: 0 };
    return all[iso];
  };
  const saveJournal = (iso, j) => {
    const all = loadJSON(LS_J, {});
    all[iso] = stamp(j || {});
    saveJSON(LS_J, all);
    return all[iso];
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
  let spurgeon = null;
  const loadSpurgeon = async () => {
    if (spurgeon) return spurgeon;
    const res = await fetch("./data/spurgeon.json");
    spurgeon = await res.json();
    return spurgeon;
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
    const list = await loadSpurgeon();
    const am = list.find((x) => x.m === m && x.d === d && x.t === "am") || list.find((x) => x.m === m && x.d === d) || null;
    const pm = list.find((x) => x.m === m && x.d === d && x.t === "pm") || am;
    try { localStorage.setItem(LS_SP, JSON.stringify({ key, am, pm })); } catch { /* quota */ }
    spurgeon = null;
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

  return {
    BOOKS, STEPS, EVENING, ACTS,
    clocksFor, isEvening, chapterTarget, stepsFor,
    loadSpurgeon, todaySpurgeon, fetchODB,
    morningOf, setStep, emptyMorning,
    bibleCursor, setBibleCursor, bookByName, nextRef, prevRef,
    fetchChapter, markChapterRead, todayAssignment,
    planOf, savePlan, journalOf, saveJournal, verseOfDay
  };
})();
