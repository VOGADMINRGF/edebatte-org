import { analyzeContribution } from "@lib/contribution/analyzeContribution";
import { extractStatements } from "@lib/contribution/extractStatements";
import { translateAndCache } from "@lib/contribution/translateAndCache";
import { storeContribution } from "@lib/contribution/storeContribution";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function POST(req: Request) {
  const { text, region = "de", userId = "anonymous" } = await req.json();

  if (!text || text.length < 10) {
    return new Response(JSON.stringify({ error: "Text too short" }), {
      status: 400,
    });
  }

  const analysis = await analyzeContribution(text);
  const __text = typeof analysis === "string" ? analysis : ((analysis as any)?.text ?? JSON.stringify(analysis));
const statements = await extractStatements(__text);
  const translations = await translateAndCache(statements, ["de", "en"]);

  const saved = await storeContribution({
    originalText: text,
    statements,
    translations,
    region,
    userId,
  });

  return new Response(JSON.stringify({ success: true, saved }), {
    status: 200,
  });
}
