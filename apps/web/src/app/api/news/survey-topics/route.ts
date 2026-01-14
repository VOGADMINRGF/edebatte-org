// apps/web/src/app/api/news/survey-topics/route.ts

import { NextRequest } from "next/server";
import fs from "node:fs/promises";
import path from "node:path";
import crypto from "crypto";
import { ANALYZE_JSON_SCHEMA } from "@features/analyze/schemas"; // ggf. Pfad anpassen

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

/* ------------------------------------------------------------------ */
/*  Kleine Helfer: Hash, Stopwörter, Keyword-Extraktion                */
/* ------------------------------------------------------------------ */

function stableHash(value: unknown): string {
  const payload = typeof value === "string" ? value : JSON.stringify(value);
  return crypto.createHash("sha256").update(payload).digest("hex");
}

// Minimal-Artikel-Typ
type ParsedArticle = {
  id: string;
  feedUrl: string;
  sourceHost: string;
  title: string;
  url: string;
  publishedAt?: string;
  summary?: string;
};

// Topic-Cluster
type TopicCluster = {
  id: string;
  labelGuess: string;
  keywords: string[];
  articles: ParsedArticle[];
};

type CivicFeedsFile = {
  version?: number;
  regions: {
    [regionId: string]: {
      default?: string[];
      [bucket: string]: string[] | undefined;
    };
  };
  notes?: string[];
};

type BatchLikeAnalyzeResult = any; // hier kannst du später dein AnalyzeResult-Typ re-importieren

const STOPWORDS = new Set<string>([
  // deutsch
  "der","die","das","den","dem","des",
  "ein","eine","einer","einem","eines",
  "und","oder","aber","wenn","dass",
  "auf","mit","von","im","in","am",
  "zu","zum","zur","für","nach","über",
  "unter","an","bei","aus","vor","hinter",
  "sich","sind","war","wird","werden",
  "nicht","kein","keine","mehr","auch",
  "noch","schon","wie","so",
  // englisch
  "the","a","an","and","or","but",
  "of","to","in","on","at","for","from",
  "by","about","into","over","under",
  "is","are","was","were","be","been",
  "this","that","these","those",
  "it","its","as","with","without",
  "more","most","no","not","than",
  "will","would","can","could",
  "new","news","update","latest","live"
]);

function normalizeText(text: string): string {
  return text
    .toLowerCase()
    .replace(/&amp;/g, " ")
    .replace(/[^\p{L}\p{N}]+/gu, " ")
    .trim();
}

function extractKeywords(text: string, maxKeywords = 6): string[] {
  const norm = normalizeText(text);
  if (!norm) return [];

  const counts = new Map<string, number>();

  for (const raw of norm.split(/\s+/)) {
    const token = raw.trim();
    if (token.length < 4) continue;
    if (STOPWORDS.has(token)) continue;
    counts.set(token, (counts.get(token) ?? 0) + 1);
  }

  return Array.from(counts.entries())
    .sort((a, b) => b[1] - a[1])
    .map(([tok]) => tok)
    .slice(0, maxKeywords);
}

/* ------------------------------------------------------------------ */
/*  Topic-Cluster aus Artikeln bauen                                  */
/* ------------------------------------------------------------------ */

function buildTopicClusters(
  articles: ParsedArticle[],
  minArticlesPerCluster = 2
): TopicCluster[] {
  const clusterMap = new Map<string, ParsedArticle[]>();
  const keywordsMap = new Map<string, string[]>();

  for (const a of articles) {
    const base = `${a.title} ${a.summary ?? ""}`;
    const kws = extractKeywords(base);
    if (!kws.length) continue;
    const primary = kws[0];
    if (!primary) continue;

    if (!clusterMap.has(primary)) {
      clusterMap.set(primary, []);
      keywordsMap.set(primary, kws);
    }
    clusterMap.get(primary)!.push(a);
  }

  const clusters: TopicCluster[] = [];

  for (const [primary, arts] of clusterMap.entries()) {
    if (arts.length < minArticlesPerCluster) continue;

    const kws = keywordsMap.get(primary) ?? [primary];
    const label = kws.slice(0, 3).join(" / ");

    const clusterId = stableHash({
      primary,
      titles: arts.map(a => a.title).sort(),
    });

    clusters.push({
      id: clusterId,
      labelGuess: label,
      keywords: kws,
      articles: arts,
    });
  }

  return clusters;
}

/* ------------------------------------------------------------------ */
/*  Feeds laden (DE + GLOBAL)                                         */
/* ------------------------------------------------------------------ */

async function loadFeeds(scope: string): Promise<CivicFeedsFile | null> {
  // monorepo: apps/web → .. → core/feeds
  const file = path.join(process.cwd(), "..", "core", "feeds", `civic_feeds.${scope}.json`);
  try {
    const raw = await fs.readFile(file, "utf8");
    return JSON.parse(raw) as CivicFeedsFile;
  } catch {
    return null;
  }
}

function collectFeedUrls(cfg: CivicFeedsFile | null): string[] {
  if (!cfg) return [];
  const urls: string[] = [];
  for (const region of Object.values(cfg.regions || {})) {
    for (const val of Object.values(region)) {
      if (!Array.isArray(val)) continue;
      val.forEach(u => urls.push(u.trim()));
    }
  }
  return Array.from(new Set(urls)).filter(Boolean);
}

/* ------------------------------------------------------------------ */
/*  RSS / Atom minimal parsen                                         */
/* ------------------------------------------------------------------ */

function parseRss(xml: string, feedUrl: string): ParsedArticle[] {
  const items: ParsedArticle[] = [];
  const chunks = xml.split(/<item[\s>]/i).slice(1);
  const host = new URL(feedUrl).hostname;

  for (const raw of chunks) {
    const title = (raw.match(/<title\b[^>]*>([\s\S]*?)<\/title>/i)?.[1] || "").trim();
    const link =
      (raw.match(/<link\b[^>]*>([\s\S]*?)<\/link>/i)?.[1] || "").trim() ||
      (raw.match(/<guid\b[^>]*>([\s\S]*?)<\/guid>/i)?.[1] || "").trim();
    const desc =
      (raw.match(/<description\b[^>]*>([\s\S]*?)<\/description>/i)?.[1] || "").trim() ||
      (raw.match(/<summary\b[^>]*>([\s\S]*?)<\/summary>/i)?.[1] || "").trim();
    const date =
      (raw.match(/<pubDate\b[^>]*>([\s\S]*?)<\/pubDate>/i)?.[1] || "").trim() ||
      (raw.match(/<updated\b[^>]*>([\s\S]*?)<\/updated>/i)?.[1] || "").trim();

    if (!title || !link) continue;

    const url = link.startsWith("http") ? link : feedUrl;
    const id = stableHash({ url, feedUrl });

    items.push({
      id,
      feedUrl,
      sourceHost: host,
      title,
      url,
      publishedAt: date || undefined,
      summary: desc || undefined,
    });
  }
  return items;
}

function parseAtom(xml: string, feedUrl: string): ParsedArticle[] {
  const items: ParsedArticle[] = [];
  const chunks = xml.split(/<entry[\s>]/i).slice(1);
  const host = new URL(feedUrl).hostname;

  for (const raw of chunks) {
    const title = (raw.match(/<title\b[^>]*>([\s\S]*?)<\/title>/i)?.[1] || "").trim();
    const link =
      (raw.match(/<link\b[^>]*href="([^"]+)"/i)?.[1] || "").trim() ||
      (raw.match(/<id\b[^>]*>([\s\S]*?)<\/id>/i)?.[1] || "").trim();
    const desc =
      (raw.match(/<summary\b[^>]*>([\s\S]*?)<\/summary>/i)?.[1] || "").trim() ||
      (raw.match(/<content\b[^>]*>([\s\S]*?)<\/content>/i)?.[1] || "").trim();
    const date =
      (raw.match(/<updated\b[^>]*>([\s\S]*?)<\/updated>/i)?.[1] || "").trim() ||
      (raw.match(/<published\b[^>]*>([\s\S]*?)<\/published>/i)?.[1] || "").trim();

    if (!title || !link) continue;

    const url = link.startsWith("http") ? link : feedUrl;
    const id = stableHash({ url, feedUrl });

    items.push({
      id,
      feedUrl,
      sourceHost: host,
      title,
      url,
      publishedAt: date || undefined,
      summary: desc || undefined,
    });
  }
  return items;
}

async function fetchText(url: string, timeoutMs = 15000): Promise<string> {
  const ctrl = new AbortController();
  const t = setTimeout(() => ctrl.abort(), timeoutMs);
  try {
    const res = await fetch(url, {
      signal: ctrl.signal,
      headers: { "user-agent": "VOG-NewsSurveyTopics/1.0" },
    });
    if (!res.ok) throw new Error("HTTP " + res.status);
    return await res.text();
  } finally {
    clearTimeout(t);
  }
}

function isRecentEnough(publishedAt?: string, maxAgeDays = 2): boolean {
  if (!publishedAt) return true;
  const t = Date.parse(publishedAt);
  if (!Number.isFinite(t)) return true;
  const ageDays = (Date.now() - t) / (1000 * 60 * 60 * 24);
  return ageDays <= maxAgeDays;
}

/* ------------------------------------------------------------------ */
/*  OpenAI-Call (ohne Batch, direkt aus der Route)                     */
/* ------------------------------------------------------------------ */

async function callOpenAIAnalyze(prompt: string): Promise<BatchLikeAnalyzeResult> {
  const apiKey = process.env.OPENAI_API_KEY;
  if (!apiKey) throw new Error("OPENAI_API_KEY fehlt");

  const res = await fetch("https://api.openai.com/v1/chat/completions", {
    method: "POST",
    headers: {
      "authorization": `Bearer ${apiKey}`,
      "content-type": "application/json",
    },
    body: JSON.stringify({
      model: "gpt-4.1-mini",
      response_format: {
        type: "json_schema",
        json_schema: {
          name: "AnalyzeResult",
          schema: ANALYZE_JSON_SCHEMA.schema,
          strict: true,
        },
      },
      messages: [
        {
          role: "system",
          content:
            "Du arbeitest im News→Survey-Topic-Modus für VoiceOpenGov / eDebatte. " +
            "Halte dich strikt an das JSON-Schema und erfinde keine zusätzlichen Felder.",
        },
        { role: "user", content: prompt },
      ],
      temperature: 0.25,
      max_tokens: 1800,
    }),
  });

  if (!res.ok) {
    const text = await res.text().catch(() => "");
    throw new Error(`OpenAI-Error ${res.status}: ${text}`);
  }

  const json = await res.json();
  const content = json.choices?.[0]?.message?.content;
  if (!content) throw new Error("OpenAI-Lieferte keine message.content");
  return JSON.parse(content);
}

/* ------------------------------------------------------------------ */
/*  Prompt für ein Topic                                              */
/* ------------------------------------------------------------------ */

function buildPromptForCluster(cluster: TopicCluster): string {
  const header = `THEMA (automatisch erkannt): ${cluster.labelGuess}`;

  const articleLines = cluster.articles.map((a, idx) => {
    const summary =
      a.summary && a.summary.length > 260
        ? a.summary.slice(0, 260) + " …"
        : a.summary || "";

    return [
      `${idx + 1}. Quelle: ${a.sourceHost}`,
      `   Titel: ${a.title}`,
      `   URL: ${a.url}`,
      summary ? `   Kurzbeschreibung: ${summary}` : "",
    ]
      .filter(Boolean)
      .join("\n");
  });

  return [
    "Du arbeitest für das Projekt VoiceOpenGov / eDebatte.",
    "Aus mehreren seriösen Nachrichtenmeldungen zu einem gemeinsamen Thema sollen neutrale,",
    "prüfbare Statements entstehen, die sich gut als Abstimmungs- oder Umfragefragen eignen.",
    "",
    "WICHTIGE REGELN:",
    "1. Keine Stimmungsmache, kein emotionales Framing, keine abwertende Sprache.",
    "   Verwende keine Kampfbegriffe oder propagandistische Begriffe aus den Quellen.",
    "2. Keine Empfehlung, wie Bürger:innen abstimmen sollen.",
    "3. Jede Aussage muss inhaltlich prüfbar sein.",
    "4. Wenn die Quellen unterschiedliche Perspektiven haben, formuliere getrennte, neutrale Varianten.",
    "5. Nutze eine klare, verständliche Sprache für Bürger:innen ohne Vorwissen.",
    "",
    "AUFGABE:",
    "- Bündele die folgenden Meldungen zu 3–7 zentralen Statements.",
    "- Alle Statements sollen sich gut dafür eignen, dass Bürger:innen zustimmen, ablehnen oder 'weiß nicht' wählen können.",
    "- Nutze ausschließlich das bereitgestellte JSON-Schema (AnalyzeResult / E150).",
    "",
    header,
    "",
    "ARTIKEL:",
    ...articleLines,
  ].join("\n");
}

/* ------------------------------------------------------------------ */
/*  Kernfunktion: Feeds → Topics → AnalyzeResults                      */
/* ------------------------------------------------------------------ */

async function generateSurveyTopicsFromFeeds() {
  const cfgDe = await loadFeeds("de");
  const cfgGlobal = await loadFeeds("global");

  const feedUrls = Array.from(
    new Set([
      ...collectFeedUrls(cfgDe),
      ...collectFeedUrls(cfgGlobal),
    ])
  ).filter(Boolean);

  if (!feedUrls.length) {
    throw new Error("Keine Feed-URLs gefunden (civic_feeds.de/global.json prüfen)");
  }

  // Optionale Begrenzung, damit die Route nicht ewig läuft
  const MAX_FEEDS = 10;
  const MAX_ARTICLES = 60;
  const MAX_TOPICS = 5;

  const limitedFeeds = feedUrls.slice(0, MAX_FEEDS);

  const articleMap = new Map<string, ParsedArticle>();

  for (const feedUrl of limitedFeeds) {
    try {
      const xml = await fetchText(feedUrl);
      const parsed =
        /<rss\b/i.test(xml) ? parseRss(xml, feedUrl)
        : /<feed\b/i.test(xml) ? parseAtom(xml, feedUrl)
        : [];

      for (const a of parsed) {
        if (!isRecentEnough(a.publishedAt)) continue;
        if (!articleMap.has(a.id)) {
          articleMap.set(a.id, a);
        }
      }
    } catch (e) {
      // bewusst nur loggen, nicht abbrechen
      console.warn("Feed fehlgeschlagen:", feedUrl, String((e as any)?.message ?? e));
    }
  }

  let articles = Array.from(articleMap.values());
  if (articles.length > MAX_ARTICLES) {
    articles = articles.slice(0, MAX_ARTICLES);
  }

  const clusters = buildTopicClusters(articles, 2);
  const limitedClusters = clusters.slice(0, MAX_TOPICS);

  const results: {
    cluster: TopicCluster;
    analyzeResult: BatchLikeAnalyzeResult;
  }[] = [];

  for (const cluster of limitedClusters) {
    const prompt = buildPromptForCluster(cluster);
    const analyzeResult = await callOpenAIAnalyze(prompt);
    results.push({ cluster, analyzeResult });
  }

  return results;
}

/* ------------------------------------------------------------------ */
/*  API-Handler                                                       */
/* ------------------------------------------------------------------ */

export async function GET(_req: NextRequest) {
  try {
    const topics = await generateSurveyTopicsFromFeeds();
    return Response.json(
      {
        ok: true,
        topics: topics.map(t => ({
          clusterId: t.cluster.id,
          labelGuess: t.cluster.labelGuess,
          keywords: t.cluster.keywords,
          articles: t.cluster.articles,
          analyzeResult: t.analyzeResult,
        })),
      },
      { status: 200 }
    );
  } catch (err: any) {
    console.error("survey-topics error:", err);
    return Response.json(
      { ok: false, error: String(err?.message ?? err) },
      { status: 500 }
    );
  }
}

export async function POST(req: NextRequest) {
  // optional: später Body auswerten (z.B. maxTopics), aktuell einfach wie GET
  return GET(req);
}
