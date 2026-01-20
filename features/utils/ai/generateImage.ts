// features/utils/ai/generateImage.ts
import { OpenAI } from "openai"; // npm install openai

type GenerateVOGImageParams = {
  prompt: string;
  fallbackText?: string;
  aspectRatio?: string;   // "16:9" | "9:16" | "1:1" | frei
  ciColors?: string[];    // z.B. ["#FF6F61", "#00B3A6", "#4B0082"]
};

/** Mappt aspectRatio auf von OpenAI unterstützte Größen. */
function mapAspectRatioToSize(ar?: string): "1792x1024" | "1024x1792" | "1024x1024" {
  const s = (ar || "").trim();
  if (!s) return "1024x1024";

  // exakte Strings gängigster Fälle
  if (s === "16:9") return "1792x1024";
  if (s === "9:16") return "1024x1792";
  if (s === "1:1" || s === "square") return "1024x1024";

  // generische Parser (z.B. "4:3", "3:4" -> wähle nächstliegenden Support)
  const m = s.match(/^(\d+(?:\.\d+)?):(\d+(?:\.\d+)?)$/);
  if (m) {
    const w = parseFloat(m[1]);
    const h = parseFloat(m[2]);
    if (isFinite(w) && isFinite(h) && h > 0) {
      const ratio = w / h;
      const d169 = Math.abs(ratio - 16 / 9);
      const d916 = Math.abs(ratio - 9 / 16);
      const d11  = Math.abs(ratio - 1);
      if (d169 <= d916 && d169 <= d11) return "1792x1024";
      if (d916 <= d169 && d916 <= d11) return "1024x1792";
      return "1024x1024";
    }
  }
  // Fallback
  return "1024x1024";
}

export async function generateVOGImage({
  prompt,
  fallbackText = "eDebatte",
  aspectRatio = "16:9",
  ciColors = ["#FF6F61", "#00B3A6", "#4B0082"],
}: GenerateVOGImageParams): Promise<string> {
  const apiKey = process.env.OPENAI_API_KEY;

  if (!apiKey) {
    console.warn("[generateVOGImage] Kein OpenAI-API-Key in .env.local gefunden!");
    return "/dummy/vog-default.jpg";
  }

  const colorStr = ciColors.filter(Boolean).join(", ");
  const size = mapAspectRatioToSize(aspectRatio);

  // Prompt defensiv säubern & konsistent halten
  const safePrompt = `
    ${String(prompt || "").trim()}
    Stil: moderne Illustration, hohe Farbigkeit, klar, jugendlich, Farbschema: ${colorStr}.
    Füge subtil den Schriftzug '${fallbackText}' als Wasserzeichen unten rechts ein.
    Keine fremden Logos, kein zusätzlicher Text außer dem Wasserzeichen.
    Format: ${aspectRatio}, ideal für Social/Feed.
    Hintergrund neutral, keine realen Personen, keine Markennamen.
  `.replace(/\s+/g, " ").trim();

  try {
    const openai = new OpenAI({ apiKey });

    const response = await openai.images.generate({
      // Model explizit benennen ist robuster:
      model: "gpt-image-1",
      prompt: safePrompt,
      n: 1,
      size, // ✅ 16:9 → 1792x1024, 9:16 → 1024x1792, 1:1 → 1024x1024
    });

    // Defensive Zugriffe auf API-Response
    const imageUrl = (response as any)?.data?.[0]?.url as string | undefined;
    return imageUrl || "/dummy/vog-default.jpg";
  } catch (err) {
    console.error("[generateVOGImage] Fehler:", err);
    return "/dummy/vog-default.jpg";
  }
}
