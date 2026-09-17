const repo = process.env.GITHUB_REPOSITORY;
const sha = process.env.GITHUB_SHA;
const key = "7d25c37db2725130802bfd3a126b42a6";
const site = "https://www.edebatte.org";
const host = "www.edebatte.org";
const keyLocation = `${site}/${key}.txt`;
const sleep = (ms) => new Promise((resolve) => setTimeout(resolve, ms));

if (!repo || !sha) {
  console.log("IndexNow: no exact GitHub commit context; no URLs submitted.");
  process.exit(0);
}

async function readVercelState() {
  const headers = {
    accept: "application/vnd.github+json",
    "user-agent": "edebatte-indexnow",
  };
  if (process.env.GITHUB_TOKEN) headers.authorization = `Bearer ${process.env.GITHUB_TOKEN}`;
  const response = await fetch(`https://api.github.com/repos/${repo}/commits/${sha}/status`, { headers });
  if (!response.ok) throw new Error(`GitHub commit status HTTP ${response.status}`);
  const payload = await response.json();
  return payload.statuses?.find((status) => status.context === "Vercel")?.state ?? null;
}

let vercelState = null;
for (let attempt = 1; attempt <= 18; attempt += 1) {
  vercelState = await readVercelState();
  if (vercelState === "success" || vercelState === "failure" || vercelState === "error") break;
  console.log(`IndexNow: Vercel status ${vercelState ?? "pending"}; retry ${attempt}/18.`);
  await sleep(10_000);
}

if (vercelState !== "success") {
  console.log(`IndexNow: exact commit is not successfully deployed by Vercel (${vercelState ?? "unknown"}); no URLs submitted.`);
  process.exit(0);
}

let keyVerified = false;
for (let attempt = 1; attempt <= 6; attempt += 1) {
  const response = await fetch(`${keyLocation}?deployment=${encodeURIComponent(sha)}`, {
    headers: { "cache-control": "no-cache", "user-agent": "edebatte-indexnow" },
  }).catch(() => null);
  if (response?.ok && (await response.text()).trim() === key) {
    keyVerified = true;
    break;
  }
  if (attempt < 6) await sleep(5_000);
}

if (!keyVerified) {
  console.log("IndexNow: production domain does not yet expose the verification key; no URLs submitted.");
  process.exit(0);
}

const sitemapResponse = await fetch(`${site}/sitemap.xml?indexnow=${encodeURIComponent(sha)}`, {
  headers: { "cache-control": "no-cache", "user-agent": "edebatte-indexnow" },
});
if (!sitemapResponse.ok) throw new Error(`IndexNow: production sitemap HTTP ${sitemapResponse.status}`);
const sitemap = await sitemapResponse.text();
const urls = [...new Set(
  [...sitemap.matchAll(/<loc>(https:\/\/www\.edebatte\.org\/[^<]*)<\/loc>/g)].map((match) => match[1]),
)];

if (!urls.length) throw new Error("IndexNow: production sitemap contains no canonical eDebatte URLs.");

const response = await fetch("https://api.indexnow.org/indexnow", {
  method: "POST",
  headers: { "content-type": "application/json; charset=utf-8" },
  body: JSON.stringify({ host, key, keyLocation, urlList: urls }),
});

if (!response.ok) {
  const body = await response.text().catch(() => "");
  throw new Error(`IndexNow submission failed: HTTP ${response.status}${body ? ` ${body}` : ""}`);
}

console.log(`IndexNow accepted ${urls.length} deployed public URL(s) for ${sha} with HTTP ${response.status}.`);
