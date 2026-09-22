/* ALIGN sound — stations, your tracks, and cues. Audio graph lives outside the UI. */
window.ALIGN_SOUND = (() => {
  const LS = "align-sound";
  const STATIONS = [
    { id: "rise", name: "Rise", sub: "Warm pad for the first hour" },
    { id: "train", name: "Train", sub: "Steady pulse while you move" },
    { id: "still", name: "Still", sub: "Quiet room for prayer" },
    { id: "word", name: "Word", sub: "Soft bed under Scripture" }
  ];

  const FALLBACK_LIB = [
    { id: "11111111-1111-4111-8111-111111111111", title: "Birds at 5am", artist: "jc · PDsounds", mood: "rise", license: "Public domain", source_url: "https://commons.wikimedia.org/wiki/Special:FilePath/Bird_singing.ogg", is_public: true },
    { id: "11111111-1111-4111-8111-111111111112", title: "Mild morning song", artist: "PDsounds", mood: "rise", license: "Public domain", source_url: "https://commons.wikimedia.org/wiki/Special:FilePath/Birdsong_mild_sunny_day.ogg", is_public: true },
    { id: "11111111-1111-4111-8111-111111111113", title: "Garden birds", artist: "PDsounds", mood: "still", license: "Public domain", source_url: "https://commons.wikimedia.org/wiki/Special:FilePath/Birds_singing_in_garden.ogg", is_public: true },
    { id: "11111111-1111-4111-8111-111111111114", title: "Forest room", artist: "nille · PDsounds", mood: "still", license: "Public domain", source_url: "https://commons.wikimedia.org/wiki/Special:FilePath/20090610_0_ambience.ogg", is_public: true },
    { id: "11111111-1111-4111-8111-111111111115", title: "Rain on the pane", artist: "cori · PDsounds", mood: "word", license: "Public domain", source_url: "https://commons.wikimedia.org/wiki/Special:FilePath/Rain_against_the_window.ogg", is_public: true },
    { id: "11111111-1111-4111-8111-111111111116", title: "Dordogne pond", artist: "PDsounds", mood: "word", license: "Public domain", source_url: "https://commons.wikimedia.org/wiki/Special:FilePath/Nature_sounds_ambience_in_a_Dordogne_pond.ogg", is_public: true },
    { id: "11111111-1111-4111-8111-111111111117", title: "Breeze, birds, geese", artist: "PDsounds", mood: "train", license: "Public domain", source_url: "https://commons.wikimedia.org/wiki/Special:FilePath/Breeze_birds_and_geese.ogg", is_public: true }
  ];

  const load = () => {
    try {
      const s = JSON.parse(localStorage.getItem(LS) || "null") || {};
      return {
        volume: Math.min(1, Math.max(0, Number(s.volume ?? 0.42))),
        sfxOn: s.sfxOn !== false,
        station: STATIONS.some((x) => x.id === s.station) ? s.station : "rise",
        trackId: s.trackId || ""
      };
    } catch {
      return { volume: 0.42, sfxOn: true, station: "rise", trackId: "" };
    }
  };
  const persist = (patch) => {
    const next = { ...load(), ...patch };
    localStorage.setItem(LS, JSON.stringify(next));
    return next;
  };

  let ctx = null;
  let master = null;
  let sfxGain = null;
  let bedGain = null;
  let nodes = [];
  let beatRaf = 0;
  let playing = false;
  let kind = ""; // station | track
  let currentId = "";
  let title = "Sound";
  let audioEl = null;
  let tracks = []; // {id,name,...} local + mine
  let library = FALLBACK_LIB.slice();
  const blobs = new Map();
  const uid = () => (crypto.randomUUID && crypto.randomUUID()) || ("t" + Date.now().toString(36) + Math.random().toString(36).slice(2, 8));
  const listeners = new Set();
  const emit = () => listeners.forEach((fn) => { try { fn(snapshot()); } catch {} });

  const dbp = () => new Promise((res, rej) => {
    const r = indexedDB.open("align-sound", 1);
    r.onupgradeneeded = () => r.result.createObjectStore("tracks");
    r.onsuccess = () => res(r.result);
    r.onerror = () => rej(r.error);
  });

  const loadTracks = async () => {
    try {
      const db = await dbp();
      const list = await new Promise((res, rej) => {
        const q = db.transaction("tracks").objectStore("tracks").getAll();
        q.onsuccess = () => res(q.result || []);
        q.onerror = () => rej(q.error);
      });
      tracks = [];
      blobs.clear();
      list.forEach((row) => {
        if (!row || !row.id || !row.blob) return;
        tracks.push({ id: row.id, name: row.name || "Track" });
        blobs.set(row.id, row.blob);
      });
      emit();
    } catch { /* private mode */ }
  };

  const saveTrack = async (file) => {
    const id = uid();
    const row = { id, name: file.name.replace(/\.[^.]+$/, ""), blob: file, type: file.type || "audio/mpeg" };
    const db = await dbp();
    await new Promise((res, rej) => {
      const q = db.transaction("tracks", "readwrite").objectStore("tracks").put(row, id);
      q.onsuccess = () => res();
      q.onerror = () => rej(q.error);
    });
    tracks.push({ id, name: row.name });
    blobs.set(id, file);
    emit();
    return id;
  };

  const removeTrack = async (id) => {
    if (currentId === id) stop();
    try {
      const db = await dbp();
      await new Promise((res, rej) => {
        const q = db.transaction("tracks", "readwrite").objectStore("tracks").delete(id);
        q.onsuccess = () => res();
        q.onerror = () => rej(q.error);
      });
    } catch {}
    tracks = tracks.filter((t) => t.id !== id);
    blobs.delete(id);
    emit();
  };

  const ensure = async (wantBed) => {
    if (!ctx) {
      const AC = window.AudioContext || window.webkitAudioContext;
      if (!AC) return null;
      ctx = new AC();
      master = ctx.createGain();
      master.gain.value = load().volume;
      master.connect(ctx.destination);
      bedGain = ctx.createGain();
      bedGain.gain.value = 0;
      bedGain.connect(master);
      sfxGain = ctx.createGain();
      sfxGain.gain.value = 0.9;
      sfxGain.connect(master);
    }
    if ((playing || wantBed) && ctx.state === "suspended") {
      try { await ctx.resume(); } catch {}
    }
    return ctx;
  };

  const unlock = () => { ensure(false); };

  const killEl = (el) => {
    if (!el) return;
    try { el.pause(); } catch {}
    try { el.loop = false; } catch {}
    try { el.muted = true; } catch {}
    try { el.volume = 0; } catch {}
    try { el.currentTime = 0; } catch {}
    try {
      el.removeAttribute("src");
      el.src = "";
      el.srcObject = null;
      el.load();
    } catch {}
    liveAudio.delete(el);
  };

  const muteBed = () => {
    if (!bedGain) return;
    try {
      if (ctx) bedGain.gain.setValueAtTime(0, ctx.currentTime);
      else bedGain.gain.value = 0;
    } catch { bedGain.gain.value = 0; }
  };

  const openBed = () => {
    if (!bedGain) return;
    try {
      if (ctx) bedGain.gain.setValueAtTime(1, ctx.currentTime);
      else bedGain.gain.value = 1;
    } catch { bedGain.gain.value = 1; }
  };

  const clearBed = () => {
    if (beatRaf) { cancelAnimationFrame(beatRaf); beatRaf = 0; }
    nodes.forEach((n) => {
      try { if (n.stop) n.stop(0); } catch {}
      try { n.disconnect(); } catch {}
    });
    nodes = [];
    muteBed();
    liveAudio.forEach(killEl);
    liveAudio.clear();
    if (audioEl) { killEl(audioEl); audioEl = null; }
    try {
      document.querySelectorAll("audio").forEach((el) => killEl(el));
    } catch {}
    objectUrls.forEach((u) => { try { URL.revokeObjectURL(u); } catch {} });
    objectUrls.clear();
  };

  const brown = (c, seconds = 3) => {
    const len = Math.floor(c.sampleRate * seconds);
    const buf = c.createBuffer(1, len, c.sampleRate);
    const d = buf.getChannelData(0);
    let last = 0;
    for (let i = 0; i < len; i++) {
      last = (last + 0.02 * (Math.random() * 2 - 1)) / 1.02;
      d[i] = Math.max(-1, Math.min(1, last * 3.5));
    }
    const src = c.createBufferSource();
    src.buffer = buf;
    src.loop = true;
    return src;
  };

  const startPad = (c, dest, freqs, type, gain) => {
    freqs.forEach((f, i) => {
      const o = c.createOscillator();
      o.type = type || "sine";
      o.frequency.value = f;
      const g = c.createGain();
      g.gain.value = (gain || 0.07) / freqs.length;
      const lfo = c.createOscillator();
      lfo.type = "sine";
      lfo.frequency.value = 0.07 + i * 0.025;
      const lg = c.createGain();
      lg.gain.value = g.gain.value * 0.35;
      lfo.connect(lg);
      lg.connect(g.gain);
      o.connect(g);
      g.connect(dest);
      o.start();
      lfo.start();
      nodes.push(o, lfo, g, lg);
    });
  };

  const startStation = async (id) => {
    const token = ++playToken;
    const c = await ensure(true);
    if (!c || token !== playToken) return;
    clearBed();
    if (token !== playToken) return;
    openBed();
    const dest = bedGain;
    const flt = c.createBiquadFilter();
    flt.type = "lowpass";
    flt.connect(dest);
    nodes.push(flt);

    if (id === "rise") {
      flt.frequency.value = 1400;
      startPad(c, flt, [130.81, 196, 261.63, 329.63], "sine", 0.11);
    } else if (id === "still") {
      flt.frequency.value = 700;
      const n = brown(c);
      const g = c.createGain();
      g.gain.value = 0.045;
      n.connect(g); g.connect(flt);
      n.start();
      nodes.push(n, g);
      startPad(c, flt, [110, 164.81], "sine", 0.04);
    } else if (id === "word") {
      flt.frequency.value = 520;
      const n = brown(c);
      const g = c.createGain();
      g.gain.value = 0.028;
      n.connect(g); g.connect(flt);
      n.start();
      nodes.push(n, g);
      startPad(c, flt, [98, 147], "triangle", 0.03);
    } else {
      // train — soft 100bpm pulse under a thin pad
      flt.frequency.value = 900;
      startPad(c, flt, [98, 146.83], "sine", 0.05);
      const hatBuf = c.createBuffer(1, Math.floor(c.sampleRate * 0.08), c.sampleRate);
      const hd = hatBuf.getChannelData(0);
      for (let i = 0; i < hd.length; i++) hd[i] = (Math.random() * 2 - 1) * (1 - i / hd.length);
      let next = c.currentTime + 0.05;
      const beat = 60 / 100;
      const pulse = () => {
        if (!playing || kind !== "station" || currentId !== "train") return;
        while (next < c.currentTime + 0.18) {
          const t = next;
          const o = c.createOscillator();
          const g = c.createGain();
          o.type = "sine";
          o.frequency.setValueAtTime(92, t);
          o.frequency.exponentialRampToValueAtTime(42, t + 0.12);
          g.gain.setValueAtTime(0.16, t);
          g.gain.exponentialRampToValueAtTime(0.001, t + 0.18);
          o.connect(g); g.connect(dest);
          o.start(t); o.stop(t + 0.2);
          const h = c.createBufferSource();
          h.buffer = hatBuf;
          const hg = c.createGain();
          const hf = c.createBiquadFilter();
          hf.type = "highpass"; hf.frequency.value = 4000;
          hg.gain.value = 0.03;
          h.connect(hf); hf.connect(hg); hg.connect(dest);
          h.start(t);
          next += beat;
        }
        beatRaf = requestAnimationFrame(pulse);
      };
      beatRaf = requestAnimationFrame(pulse);
    }

    if (token !== playToken) { clearBed(); return; }
    kind = "station";
    currentId = id;
    title = (STATIONS.find((s) => s.id === id) || {}).name || "Station";
    playing = true;
    persist({ station: id });
    emit();
  };

  const startTrack = async (id) => {
    const blob = blobs.get(id);
    if (!blob) {
      const t = tracks.find((x) => x.id === id);
      if (t && (t.storage_path || t.source_url)) return playUrl(t);
      return;
    }
    const token = ++playToken;
    await ensure(true);
    if (token !== playToken) return;
    clearBed();
    if (token !== playToken) return;
    const url = URL.createObjectURL(blob);
    objectUrls.add(url);
    const el = new Audio();
    el.src = url;
    el.loop = true;
    el.volume = load().volume;
    liveAudio.add(el);
    try { await el.play(); } catch {}
    if (token !== playToken) { killEl(el); return; }
    audioEl = el;
    el.addEventListener("ended", () => { /* looped */ }, { once: true });
    kind = "track";
    currentId = id;
    title = (tracks.find((t) => t.id === id) || {}).name || "Track";
    playing = true;
    persist({ trackId: id });
    emit();
  };

  const playUrl = async (item) => {
    if (!item) return;
    let url = item.source_url || item.url || "";
    if (!url && item.storage_path && window.AlignDB) {
      const r = await AlignDB.soundUrl(item.storage_path);
      url = (r && r.ok && r.data) || "";
    }
    if (!url && blobs.has(item.id)) {
      await startTrack(item.id);
      return;
    }
    if (!url) return;
    const token = ++playToken;
    await ensure(true);
    if (token !== playToken) return;
    clearBed();
    if (token !== playToken) return;
    const el = new Audio();
    el.src = url;
    el.loop = true;
    el.preload = "auto";
    el.volume = load().volume;
    liveAudio.add(el);
    try { await el.play(); } catch {}
    if (token !== playToken) { killEl(el); return; }
    audioEl = el;
    kind = item.is_public ? "library" : "track";
    currentId = item.id;
    title = item.title || item.name || "Sound";
    playing = true;
    persist({ trackId: item.id });
    emit();
  };

  const mergeRemote = (rows) => {
    if (!rows || !rows.length) return;
    const pub = rows.filter((r) => r.is_public);
    const mine = rows.filter((r) => !r.is_public);
    if (pub.length) {
      const by = {};
      library.forEach((r) => { by[r.id] = r; });
      pub.forEach((r) => { by[r.id] = { ...by[r.id], ...r }; });
      library = Object.values(by);
    }
    mine.forEach((r) => {
      if (!tracks.some((t) => t.id === r.id)) {
        tracks.push({ id: r.id, name: r.title, title: r.title, storage_path: r.storage_path, source_url: r.source_url, is_public: false, remote: true });
      } else {
        tracks = tracks.map((t) => t.id === r.id ? { ...t, name: r.title, storage_path: r.storage_path, remote: true } : t);
      }
    });
    emit();
  };

  const playStation = (id) => startStation(id || load().station);
  const playTrack = (id) => startTrack(id);
  const playLibrary = (id) => {
    const item = library.find((x) => x.id === id) || tracks.find((x) => x.id === id);
    return playUrl(item);
  };

  const pause = () => {
    playing = false;
    liveAudio.forEach((el) => { try { el.pause(); } catch {} });
    if (audioEl) {
      try { audioEl.pause(); } catch {}
    }
    muteBed();
    emit();
  };

  const resume = async () => {
    if (playing) return;
    await ensure(true);
    if (audioEl) {
      try {
        audioEl.muted = false;
        audioEl.volume = load().volume;
        await audioEl.play();
        playing = true;
        emit();
      } catch {}
      return;
    }
    if (kind === "track" && currentId && blobs.has(currentId)) {
      await startTrack(currentId);
      return;
    }
    if (kind === "library" && currentId) {
      await playLibrary(currentId);
      return;
    }
    await startStation(currentId || load().station);
  };

  const stop = () => {
    playToken += 1;
    playing = false;
    kind = "";
    currentId = "";
    title = "Sound";
    clearBed();
    emit();
  };

  const next = () => {
    if (kind === "track" && tracks.length) {
      const i = Math.max(0, tracks.findIndex((t) => t.id === currentId));
      startTrack(tracks[(i + 1) % tracks.length].id);
      return;
    }
    const i = Math.max(0, STATIONS.findIndex((s) => s.id === (currentId || load().station)));
    startStation(STATIONS[(i + 1) % STATIONS.length].id);
  };

  const setVolume = (v) => {
    const vol = Math.min(1, Math.max(0, Number(v)));
    persist({ volume: vol });
    if (master) master.gain.value = vol;
    if (audioEl) audioEl.volume = vol;
    emit();
  };

  const setSfx = (on) => { persist({ sfxOn: !!on }); emit(); };

  const tone = (freq, dur, type, gain, slide) => {
    if (!load().sfxOn || !ctx || !sfxGain) return;
    const t = ctx.currentTime;
    const o = ctx.createOscillator();
    const g = ctx.createGain();
    o.type = type || "sine";
    o.frequency.setValueAtTime(freq, t);
    if (slide) o.frequency.exponentialRampToValueAtTime(slide, t + dur);
    g.gain.setValueAtTime(gain || 0.06, t);
    g.gain.exponentialRampToValueAtTime(0.001, t + dur);
    o.connect(g); g.connect(sfxGain);
    o.start(t); o.stop(t + dur + 0.02);
  };

  const sfx = (name) => {
    if (!load().sfxOn) return;
    ensure(true).then(() => {
      if (name === "tick") tone(880, 0.07, "sine", 0.05);
      else if (name === "beep") tone(920, 0.11, "sine", 0.05);
      else if (name === "start") { tone(392, 0.12, "sine", 0.06); setTimeout(() => tone(523, 0.16, "sine", 0.05), 90); }
      else if (name === "done") { tone(523, 0.1, "sine", 0.06, 784); setTimeout(() => tone(784, 0.18, "sine", 0.05), 100); }
      else if (name === "ok") tone(660, 0.08, "sine", 0.045);
      else if (name === "no") tone(180, 0.16, "square", 0.03);
      else if (name === "tap") tone(520, 0.04, "sine", 0.03);
      else tone(880, 0.1, "sine", 0.04);
    });
  };

  const snapshot = () => {
    const s = load();
    return {
      playing,
      kind,
      id: currentId,
      title: playing || currentId ? title : "Sound",
      volume: s.volume,
      sfxOn: s.sfxOn,
      station: s.station,
      tracks: tracks.slice(),
      library: library.slice(),
      stations: STATIONS
    };
  };

  const onChange = (fn) => { listeners.add(fn); return () => listeners.delete(fn); };

  loadTracks();

  if (typeof document !== "undefined") {
    const kick = () => unlock();
    document.addEventListener("pointerdown", kick, { passive: true });
    document.addEventListener("keydown", kick);
  }

  return {
    STATIONS, load, snapshot, onChange, unlock,
    playStation, playTrack, playLibrary, playUrl, pause, resume, stop, next,
    setVolume, setSfx, sfx, saveTrack, removeTrack, loadTracks, mergeRemote
  };
})();
