import { XMLParser } from "fast-xml-parser";

export type Headline = { title: string; source: string; published: string };

const QUERIES = [
  "Nifty Sensex stock market week",
  "RBI inflation rupee India economy markets",
  "FII flows Nifty midcap smallcap",
];

async function feed(query: string): Promise<Headline[]> {
  const url = `https://news.google.com/rss/search?q=${encodeURIComponent(query + " when:7d")}&hl=en-IN&gl=IN&ceid=IN:en`;
  const res = await fetch(url, { cache: "no-store", headers: { "User-Agent": "Mozilla/5.0" }, signal: AbortSignal.timeout(15000) });
  if (!res.ok) return [];
  const x = new XMLParser().parse(await res.text());
  const items = x?.rss?.channel?.item ?? [];
  return (Array.isArray(items) ? items : [items]).slice(0, 8).map((i: Record<string, unknown>) => ({
    title: String(i.title ?? "").replace(/\s+-\s+[^-]+$/, ""),
    source: String((i.source as string) ?? ""),
    published: i.pubDate ? new Date(String(i.pubDate)).toISOString().slice(0, 10) : "",
  }));
}

export async function weeklyHeadlines(): Promise<Headline[]> {
  const all = (await Promise.allSettled(QUERIES.map(feed))).flatMap((r) => (r.status === "fulfilled" ? r.value : []));
  const seen = new Set<string>();
  return all.filter((h) => h.title && !seen.has(h.title.toLowerCase()) && seen.add(h.title.toLowerCase())).slice(0, 15);
}
