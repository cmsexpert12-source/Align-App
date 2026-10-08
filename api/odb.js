/* ALIGN — today’s Our Daily Bread. Server fetch so the phone is not blocked. */

function grab(item, tag) {
  const m = String(item || "").match(
    new RegExp("<" + tag + "[^>]*>(?:<!\\[CDATA\\[)?([\\s\\S]*?)(?:\\]\\]>)?</" + tag + ">", "i")
  );
  return m ? String(m[1]).replace(/<[^>]+>/g, " ").replace(/\s+/g, " ").trim() : "";
}

export default async function handler(req, res) {
  res.setHeader("Content-Type", "application/json; charset=utf-8");
  res.setHeader("Cache-Control", "public, s-maxage=1800, stale-while-revalidate=86400");
  const empty = { title: "", excerpt: "", url: "" };
  try {
    const r = await fetch("https://odb.org/feed/", {
      headers: { Accept: "application/rss+xml, application/xml, text/xml, */*" }
    });
    if (!r.ok) {
      res.status(200).end(JSON.stringify(empty));
      return;
    }
    const xml = await r.text();
    const item = xml.split("<item>")[1] || "";
    const title = grab(item, "title");
    const excerpt = grab(item, "description");
    const url = ((item.match(/<link>([^<]+)<\/link>/i) || [])[1] || "").trim();
    res.status(200).end(JSON.stringify({ title, excerpt, url }));
  } catch {
    res.status(200).end(JSON.stringify(empty));
  }
}
