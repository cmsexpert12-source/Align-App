/* ALIGN books — local PDF library, schedule, offline cache */
window.ALIGN_BOOKS = (() => {
  const LS = "align-books";
  const LS_LOG = "align-reading-log";
  const DB_NAME = "align-pdfs";
  const STORE = "files";
  const MAX_BYTES = 50 * 1024 * 1024;
  const DOW = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"];

  const loadJSON = (k, fallback) => {
    try { return JSON.parse(localStorage.getItem(k) || "null") || fallback; } catch { return fallback; }
  };
  const saveJSON = (k, v) => localStorage.setItem(k, JSON.stringify(v));

  const uid = () => (crypto.randomUUID && crypto.randomUUID()) || ("b" + Date.now().toString(36) + Math.random().toString(36).slice(2, 8));

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

  const list = () => loadJSON(LS, []);
  const saveList = (arr) => saveJSON(LS, arr);
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
    if (file.size > MAX_BYTES) throw new Error("PDFs can be up to 50 MB.");
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
      const cur = by[r.id] || {};
      const remoteNewer = !cur.updated_at || (r.updated_at && r.updated_at >= cur.updated_at);
      by[r.id] = remoteNewer ? { ...cur, ...r } : { ...r, ...cur };
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
      if (!log[k]) log[k] = { from: r.from_page, to: r.to_page, at: Date.now() };
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
    MAX_BYTES, DOW,
    list, byId, addFromFile, update, remove,
    getFile, putFile,
    loggedToday, markRead, dueToday,
    remaining, progress, targetEnd,
    mergeRemote, mergeRemoteLog,
    ensurePdfjs, loadPdfjs, countPages, fmtSize, slotLabel, daysLabel
  };
})();
