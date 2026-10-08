/* ALIGN — today’s Our Daily Bread. Full sitting when WordPress has it; RSS otherwise. */

function strip(html) {
  let s = String(html || "");
  s = s.replace(/<script[\s\S]*?<\/script>/gi, "");
  s = s.replace(/<style[\s\S]*?<\/style>/gi, "");
  s = s.replace(/<\s*br\s*\/?>/gi, "\n");
  s = s.replace(/<\s*\/p\s*>/gi, "\n\n");
  s = s.replace(/<\s*\/div\s*>/gi, "\n");
  s = s.replace(/<[^>]+>/g, "");
  s = s.replace(/&nbsp;/gi, " ");
  s = s.replace(/&amp;/g, "&");
  s = s.replace(/&quot;/g, "\"");
  s = s.replace(/&#39;|&apos;/gi, "'");
  s = s.replace(/&ldquo;|&rdquo;/gi, "\"");
  s = s.replace(/&lsquo;|&rsquo;/gi, "'");
  s = s.replace(/&mdash;/gi, "—");
  s = s.replace(/&ndash;/gi, "–");
  s = s.replace(/&hellip;/gi, "...");
  s = s.replace(/&uuml;/gi, "ü");
  s = s.replace(/&Uuml;/g, "Ü");
  s = s.replace(/&#(\d+);/g, (_, n) => {
    const c = Number(n);
    return c ? String.fromCharCode(c) : "";
  });
  s = s.replace(/&#x([0-9a-f]+);/gi, (_, n) => String.fromCharCode(parseInt(n, 16)));
  s = s.replace(/[ \t]+\n/g, "\n").replace(/\n{3,}/g, "\n\n").trim();
  return s;
}

function grab(item, tag) {
  const m = String(item || "").match(
    new RegExp("<" + tag + "[^>]*>(?:<!\\[CDATA\\[)?([\\s\\S]*?)(?:\\]\\]>)?</" + tag + ">", "i")
  );
  return m ? strip(m[1]) : "";
}

function normTitle(s) {
  return String(s || "")
    .toLowerCase()
    .replace(/[’']/g, "'")
    .replace(/&amp;/g, "&")
    .replace(/[^a-z0-9]+/g, " ")
    .trim();
}

function fromWp(p) {
  if (!p) return null;
  const title = strip((p.title && p.title.rendered) || p.title || "");
  const body = strip((p.content && p.content.rendered) || "");
  if (!title) return null;
  return {
    title,
    excerpt: strip((p.excerpt && p.excerpt.rendered) || ""),
    body,
    verse: strip(p.verse || ""),
    passage: strip(p.passage || ""),
    insights: strip(p.insights || ""),
    prayer: strip(p.thought || ""),
    reflect: strip(p.response || ""),
    bibleYear: strip(p.bible_in_a_year || ""),
    author: strip(p.author_name || ""),
    url: String(p.link || "").trim()
  };
}

async function rssToday() {
  const r = await fetch("https://odb.org/feed/", {
    headers: { Accept: "application/rss+xml, application/xml, text/xml, */*" }
  });
  if (!r.ok) return null;
  const xml = await r.text();
  const item = xml.split("<item>")[1] || "";
  const title = grab(item, "title");
  if (!title) return null;
  return {
    title,
    excerpt: grab(item, "description"),
    body: grab(item, "description"),
    url: ((item.match(/<link>([^<]+)<\/link>/i) || [])[1] || "").trim(),
    verse: "",
    passage: "",
    insights: "",
    prayer: "",
    reflect: "",
    bibleYear: "",
    author: grab(item, "dc:creator")
  };
}

async function wpEnrich(rss) {
  const now = Date.now();
  const after = new Date(now - 18 * 3600 * 1000).toISOString().slice(0, 19);
  const before = new Date(now + 30 * 3600 * 1000).toISOString().slice(0, 19);
  const fields = "date,title,content,excerpt,author_name,verse,passage,insights,thought,response,bible_in_a_year,link";
  const urls = [
    "https://odb.org/wp-json/wp/v2/posts?after=" + encodeURIComponent(after) + "&before=" + encodeURIComponent(before) + "&per_page=3&orderby=date&order=desc&_fields=" + fields
  ];
  if (rss && rss.title) {
    urls.push("https://odb.org/wp-json/wp/v2/posts?search=" + encodeURIComponent(rss.title) + "&per_page=3&_fields=" + fields);
  }
  const want = rss ? normTitle(rss.title) : "";
  for (let i = 0; i < urls.length; i++) {
    try {
      const r = await fetch(urls[i]);
      if (!r.ok) continue;
      const rows = await r.json();
      if (!Array.isArray(rows) || !rows.length) continue;
      const hit = rows.find((p) => {
        const t = normTitle((p.title && p.title.rendered) || "");
        if (want && t === want) return true;
        const d = String(p.date || "").slice(0, 10);
        const today = new Date().toISOString().slice(0, 10);
        return d === today;
      }) || (want ? null : rows[0]);
      const full = fromWp(hit);
      if (full && full.body && full.body.length > 80) return full;
    } catch { /* next */ }
  }
  return null;
}

export default async function handler(req, res) {
  res.setHeader("Content-Type", "application/json; charset=utf-8");
  res.setHeader("Cache-Control", "public, s-maxage=1800, stale-while-revalidate=86400");
  const empty = {
    title: "", excerpt: "", body: "", url: "",
    verse: "", passage: "", insights: "", prayer: "", reflect: "", bibleYear: "", author: ""
  };
  try {
    const rss = await rssToday();
    const wp = await wpEnrich(rss);
    const row = wp || rss || empty;
    if (rss && wp && normTitle(rss.title) === normTitle(wp.title)) {
      row.url = wp.url || rss.url;
    }
    res.status(200).end(JSON.stringify(row));
  } catch {
    res.status(200).end(JSON.stringify(empty));
  }
}
