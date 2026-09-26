/* ALIGN books — local PDF library, schedule, offline cache */
window.ALIGN_BOOKS = (() => {
  const LS = "align-books";
  const LS_LOG = "align-reading-log";
  const DB_NAME = "align-pdfs";
  const STORE = "files";
  const ACCOUNT_CAP = 50 * 1024 * 1024;
  const MAX_BYTES = ACCOUNT_CAP;

  const usedBytes = () => {
    let n = 0;
    list().forEach((b) => { n += Number(b.bytes) || 0; });
    try {
      const tracks = (window.ALIGN_SOUND && ALIGN_SOUND.snapshot && ALIGN_SOUND.snapshot().tracks) || [];
      tracks.forEach((t) => { n += Number(t.bytes) || 0; });
    } catch { /* sound optional */ }
    return n;
  };
  const quotaError = (add, used) => {
    const have = used == null ? usedBytes() : used;
    const left = Math.max(0, ACCOUNT_CAP - have);
    if (add <= left) return "";
    const mb = (n) => {
      const x = n / (1024 * 1024);
      if (x < 0.1) return Math.max(1, Math.round(n / 1024)) + " KB";
      return (Math.round(x * 10) / 10) + " MB";
    };
    return "This account can hold 50 MB. You’re using " + mb(have) + " · " + mb(left) + " left.";
  };
  const DOW = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"];

  const loadJSON = (k, fallback) => {
    try { return JSON.parse(localStorage.getItem(k) || "null") || fallback; } catch { return fallback; }
  };
  const saveJSON = (k, v) => localStorage.setItem(k, JSON.stringify(v));

  const uid = () => {
    if (crypto.randomUUID) return crypto.randomUUID();
    return "xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx".replace(/[xy]/g, (c) => {
      const r = Math.random() * 16 | 0;
      return (c === "x" ? r : (r & 0x3 | 0x8)).toString(16);
    });
  };

  let idbP = null;
  const idb = () => {
    if (idbP) return idbP;
    idbP = new Promise((resolve, reject) => {
      const r = indexedDB.open(DB_NAME, 1);
      r.onupgradeneeded = () => {
        if (!r.result.objectStoreNames.contains(STORE)) r.result.createObjectStore(STORE);
      };
      r.onsuccess = () => resolve(r.result);
      r.onerror = () => reject(r.error);
    });
    return idbP;
  };

  const putFile = async (id, blob) => {
    const db = await idb();
    return new Promise((res, rej) => {
      const tx = db.transaction(STORE, "readwrite");
      tx.objectStore(STORE).put(blob, id);
      tx.oncomplete = () => res(true);
      tx.onerror = () => rej(tx.error);
    });
  };

  const getFile = async (id) => {
    const db = await idb();
    return new Promise((res, rej) => {
      const tx = db.transaction(STORE, "readonly");
      const q = tx.objectStore(STORE).get(id);
      q.onsuccess = () => res(q.result || null);
      q.onerror = () => rej(q.error);
    });
  };

  const delFile = async (id) => {
    const db = await idb();
    return new Promise((res, rej) => {
      const tx = db.transaction(STORE, "readwrite");
      tx.objectStore(STORE).delete(id);
      tx.oncomplete = () => res(true);
      tx.onerror = () => rej(tx.error);
    });
  };

  const SHELVES = ["Scripture", "Devotional", "Study", "Growth", "Other"];
  const coerceDays = (d) => {
    if (Array.isArray(d)) return d.map(Number).filter((n) => n >= 0 && n <= 6);
    if (typeof d === "string") {
      return d.replace(/[{}\s]/g, "").split(",").map(Number).filter((n) => n >= 0 && n <= 6);
    }
    return [1, 2, 3, 4, 5, 6];
  };
  const coerceCat = (c) => {
    const s = String(c == null ? "" : c).trim().replace(/\s+/g, " ").slice(0, 40);
    const hit = SHELVES.find((x) => x.toLowerCase() === s.toLowerCase());
    return hit || s;
  };
  const catLabel = (c) => coerceCat(c) || "Unfiled";
  const shelvesOf = (books) => {
    const seen = {};
    const extra = [];
    (books || list()).forEach((b) => {
      const c = coerceCat(b && b.category);
      const k = c || "Unfiled";
      if (seen[k]) return;
      seen[k] = true;
      if (c && SHELVES.indexOf(c) < 0) extra.push(c);
    });
    extra.sort((a, b) => a.localeCompare(b));
    const out = SHELVES.filter((s) => seen[s]).concat(extra);
    if (seen.Unfiled) out.push("Unfiled");
    return out;
  };
  const coerceBook = (b) => {
    if (!b || !b.id) return b;
    return Object.assign({}, b, {
      days: coerceDays(b.days),
      current_page: Math.max(1, Number(b.current_page) || 1),
      pages: Number(b.pages) || 0,
      pages_per_day: Number(b.pages_per_day) || 8,
      enabled: b.enabled !== false,
      slot: b.slot === "morning" ? "morning" : "evening",
      category: coerceCat(b.category)
    });
  };
  const list = () => (loadJSON(LS, []) || []).map(coerceBook);
  const saveList = (arr) => saveJSON(LS, (arr || []).map(coerceBook));
  const byId = (id) => list().find((b) => b.id === id) || null;

  const upsertLocal = (book) => {
    const arr = list();
    const i = arr.findIndex((b) => b.id === book.id);
    if (i >= 0) arr[i] = { ...arr[i], ...book };
    else arr.unshift(book);
    saveList(arr);
    return byId(book.id);
  };

  const titleFromName = (name) => String(name || "Untitled")
    .replace(/\.pdf$/i, "")
    .replace(/[_]+/g, " ")
    .replace(/\s+/g, " ")
    .trim() || "Untitled";

  const ensurePdfjs = () => {
    const lib = window.pdfjsLib;
    if (!lib) return null;
    if (!lib.GlobalWorkerOptions.workerSrc) {
      lib.GlobalWorkerOptions.workerSrc = "./vendor/pdfjs/pdf.worker.min.js";
    }
    return lib;
  };

  let pdfjsLoading = null;
  const loadPdfjs = () => {
    if (window.pdfjsLib) return Promise.resolve(ensurePdfjs());
    if (pdfjsLoading) return pdfjsLoading;
    pdfjsLoading = new Promise((resolve, reject) => {
      const s = document.createElement("script");
      s.src = "./vendor/pdfjs/pdf.min.js";
      s.async = true;
      s.onload = () => {
        const lib = ensurePdfjs();
        if (!lib) reject(new Error("The reader didn’t load."));
        else resolve(lib);
      };
      s.onerror = () => {
        pdfjsLoading = null;
        reject(new Error("The reader didn’t load. Refresh once with a connection."));
      };
      document.head.appendChild(s);
    });
    return pdfjsLoading;
  };

  const countPages = async (blob) => {
    const lib = await loadPdfjs();
    if (!lib) return 0;
    const buf = await blob.arrayBuffer();
    const doc = await lib.getDocument({ data: buf }).promise;
    const n = doc.numPages || 0;
    doc.destroy();
    return n;
  };

  const addFromFile = async (file) => {
    if (!file) throw new Error("No file");
    const type = (file.type || "").toLowerCase();
    const name = file.name || "";
    if (type && type !== "application/pdf" && !name.toLowerCase().endsWith(".pdf")) {
      throw new Error("That doesn’t look like a PDF.");
    }
    if (file.size > MAX_BYTES) throw new Error("This account can hold 50 MB.");
    const blocked = quotaError(file.size);
    if (blocked) throw new Error(blocked);
    if (window.AlignDB && AlignDB.assertQuota) {
      const q = await AlignDB.assertQuota(file.size);
      if (q && q.ok === false) throw new Error(q.error || blocked || "This account can hold 50 MB.");
    }
    const book = {
      id: uid(),
      title: titleFromName(name),
      author: "",
      filename: name,
      bytes: file.size,
      pages: 0,
      current_page: 1,
      slot: "evening",
      days: [1, 2, 3, 4, 5, 6],
      pages_per_day: 8,
      enabled: true,
      category: "",
      storage_path: "",
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString()
    };
    await putFile(book.id, file);
    try { book.pages = await countPages(file); } catch { book.pages = 0; }
    upsertLocal(book);
    return book;
  };

  const update = (id, patch) => {
    const cur = byId(id);
    if (!cur) return null;
    const next = { ...cur, ...patch, id, updated_at: new Date().toISOString() };
    if (next.current_page < 1) next.current_page = 1;
    if (next.pages && next.current_page > next.pages) next.current_page = next.pages;
    return upsertLocal(next);
  };

  const remove = async (id) => {
    saveList(list().filter((b) => b.id !== id));
    const log = loadJSON(LS_LOG, {});
    Object.keys(log).forEach((k) => {
      if (k.endsWith("|" + id)) delete log[k];
    });
    saveJSON(LS_LOG, log);
    try { await delFile(id); } catch { /* ignore */ }
  };

  const logKey = (iso, bookId) => iso + "|" + bookId;
  const logAll = () => loadJSON(LS_LOG, {});
  const loggedToday = (iso, bookId) => !!logAll()[logKey(iso, bookId)];

  const markRead = (iso, bookId, fromPage, toPage) => {
    const log = logAll();
    log[logKey(iso, bookId)] = { from: fromPage, to: toPage, at: Date.now() };
    saveJSON(LS_LOG, log);
    update(bookId, { current_page: toPage });
    return log[logKey(iso, bookId)];
  };

  const dowOf = (iso) => {
    const [y, m, d] = String(iso).split("-").map(Number);
    return new Date(y, m - 1, d).getDay();
  };

  const dueToday = (iso, slot) => {
    const dow = dowOf(iso);
    return list().filter((b) => {
      if (b.enabled === false) return false;
      if (slot && b.slot !== slot) return false;
      const days = Array.isArray(b.days) ? b.days : [];
      if (!days.includes(dow)) return false;
      if (b.pages && b.current_page > b.pages) return false;
      return true;
    });
  };

  const remaining = (b) => {
    if (!b.pages) return null;
    return Math.max(0, b.pages - Math.max(1, b.current_page) + (b.current_page > b.pages ? 0 : 1));
  };

  const progress = (b) => {
    if (!b.pages) return 0;
    return Math.max(0, Math.min(1, (Math.max(1, b.current_page) - 1) / b.pages));
  };

  const targetEnd = (b) => {
    const start = Math.max(1, b.current_page || 1);
    const n = Math.max(1, Number(b.pages_per_day) || 8);
    if (!b.pages) return start + n - 1;
    return Math.min(b.pages, start + n - 1);
  };

  const mergeRemote = (rows) => {
    if (!rows || !rows.length) return list();
    const local = list();
    const by = {};
    local.forEach((b) => { by[b.id] = b; });
    rows.forEach((r) => {
      if (!r || !r.id) return;
      const cur = coerceBook(by[r.id] || { id: r.id }) || { id: r.id };
      const remote = coerceBook(r);
      const remoteNewer = !cur.updated_at || (remote.updated_at && remote.updated_at >= cur.updated_at);
      const next = remoteNewer ? { ...cur, ...remote } : { ...remote, ...cur };
      if (!next.storage_path && cur.storage_path) next.storage_path = cur.storage_path;
      next.current_page = Math.max(Number(cur.current_page) || 1, Number(remote.current_page) || 1);
      if ((Number(remote.pages) || 0) > (Number(next.pages) || 0)) next.pages = Number(remote.pages);
      if (!coerceCat(remote.category) && cur.category) next.category = cur.category;
      next.category = coerceCat(next.category);
      by[r.id] = coerceBook(next);
    });
    const arr = Object.values(by).sort((a, b) => String(b.updated_at || "").localeCompare(String(a.updated_at || "")));
    saveList(arr);
    return arr;
  };

  const mergeRemoteLog = (rows) => {
    if (!rows || !rows.length) return;
    const log = logAll();
    rows.forEach((r) => {
      const k = logKey(r.date, r.book_id);
      const from = Number(r.from_page) || 1;
      const to = Number(r.to_page) || from;
      const cur = log[k];
      if (!cur) log[k] = { from, to, at: Date.now() };
      else {
        log[k] = {
          from: Math.min(Number(cur.from) || from, from),
          to: Math.max(Number(cur.to) || 0, to),
          at: Date.now()
        };
      }
    });
    saveJSON(LS_LOG, log);
  };

  const fmtSize = (n) => {
    if (!n) return "";
    if (n < 1024 * 1024) return Math.max(1, Math.round(n / 1024)) + " KB";
    return (n / (1024 * 1024)).toFixed(1) + " MB";
  };

  const slotLabel = (slot) => slot === "morning" ? "Morning" : "Evening";
  const daysLabel = (days) => {
    const d = Array.isArray(days) ? days : [];
    if (d.length === 7) return "Every day";
    if (d.length === 6 && !d.includes(0)) return "Mon–Sat";
    if (d.length === 5 && d.every((x) => x >= 1 && x <= 5)) return "Weekdays";
    return d.map((i) => DOW[i]).join(" · ") || "No days";
  };

  return {
    ACCOUNT_CAP, MAX_BYTES, usedBytes, quotaError, DOW, SHELVES,
    list, byId, addFromFile, update, remove,
    getFile, putFile,
    loggedToday, markRead, dueToday,
    remaining, progress, targetEnd,
    mergeRemote, mergeRemoteLog,
    coerceCat, catLabel, shelvesOf,
    ensurePdfjs, loadPdfjs, countPages, fmtSize, slotLabel, daysLabel
  };
})();
