import OpenAI from "openai";
import path from "node:path";
import fs from "node:fs/promises";
import { uploadFileAndGetUrl } from "./storage";

// OpenAI-Client (nutzt deinen normalen OPENAI_API_KEY)
const openai = process.env.OPENAI_API_KEY
  ? new OpenAI({ apiKey: process.env.OPENAI_API_KEY })
  : null;

// "sora-2" = Standard, "sora-2-pro" = höherer Detailgrad / teurer
const SORA_MODEL = process.env.PROMO_SORA_MODEL ?? "sora-2";

export type SoraVideoRequest = {
  script: string;
  hook: string;
  cta: string;
};

export type SoraVideoResult = {
  videoUrl: string;
  jobId: string;
};

export async function createPromoVideoWithSora(
  req: SoraVideoRequest
): Promise<SoraVideoResult> {
  if (!openai) {
    throw new Error("OPENAI_API_KEY not set; cannot call Sora 2 API");
  }

  const prompt = buildSoraPrompt(req);

  // 1) Job anlegen
  let job = await openai.videos.create({
    model: SORA_MODEL,
    prompt,
    size: "720x1280", // vertikal (9:16) für TikTok/Reels/Shorts
    seconds: "8",     // 8-Sekunden-Teaser
  });

  // 2) Polling, bis fertig
  while (job.status === "queued" || job.status === "in_progress") {
    await new Promise((r) => setTimeout(r, 8000));
    job = await openai.videos.retrieve(job.id);
  }

  if (job.status !== "completed") {
    throw new Error(`Sora job failed: ${job.status}`);
  }

  // 3) Videodaten herunterladen
  const body = await openai.videos.downloadContent(job.id);
  const arrayBuffer = await body.arrayBuffer();
  const buffer = Buffer.from(arrayBuffer);

  // 4) Lokal zwischenspeichern, dann über dein Storage-Helper veröffentlichen
  const tmpDir = path.resolve(process.cwd(), ".tmp", "promos");
  await fs.mkdir(tmpDir, { recursive: true });

  const tmpPath = path.join(tmpDir, `promo-sora-${job.id}.mp4`);
  await fs.writeFile(tmpPath, buffer);

  const videoUrl = await uploadFileAndGetUrl(tmpPath);

  return { videoUrl, jobId: job.id };
}

function buildSoraPrompt(req: SoraVideoRequest): string {
  const summary = truncate(req.script, 260);

  return [
    "Create a vertical social-media teaser video (9:16) for a civic-tech project called eDebatte / eDebatte.",
    "Visual style: clean, modern, trustworthy. Soft turquoise and blue gradients, simple motion graphics, high legibility.",
    "The video should feel like a short, serious but motivating explainer, not like an ad for a political party.",
    "",
    `1) Start with this HOOK as spoken voice and big on-screen text: "${req.hook}".`,
    `2) Then briefly explain the topic in 2–3 short sentences based on this summary: "${summary}".`,
    `3) End with this call to action, spoken and on screen: "${req.cta}".`,
    "",
    "Include light background music and subtle ambient sound if appropriate.",
    "Do not mention specific real politicians or parties. Focus on citizens, questions and participation.",
  ].join(" ");
}

function truncate(text: string, max: number): string {
  const s = text.trim().replace(/\s+/g, " ");
  if (s.length <= max) return s;
  return s.slice(0, max - 1) + "…";
}
