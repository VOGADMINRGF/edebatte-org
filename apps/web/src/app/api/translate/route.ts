// apps/web/src/app/api/translate/route.ts
export const runtime = "nodejs";
export const dynamic = "force-dynamic";

import { NextRequest, NextResponse } from "next/server";
import { fetchGptTranslation } from "@/utils/gptTranslator";
import { analyzeContribution } from "@/features/analysis/extract";
import { extractStatementsFromText } from "@/lib/contribution/extractStatements";
import { translateAndCache } from "@/lib/contribution/translateAndCache";
import { storeContribution } from "@/lib/contribution/storeContribution";
import type { ContributionAnalysisRequest } from "@/types/contribution";
import { ensureUserMeetsVerificationLevel } from "@features/auth/verificationAccess";

type TranslateBody = { pipeline?: "translate"; text: string; to: string };
type ContributionBody = {
  pipeline?: "contribution";
  text: string;
  region?: string | null;
  userId?: string | null;
  locales?: string[];
};
type Body = TranslateBody | ContributionBody;

function isContributionBody(b: Partial<Body>): b is ContributionBody {
  return (
    b?.pipeline === "contribution" ||
    "userId" in (b as any) ||
    "region" in (b as any) ||
    Array.isArray((b as any)?.locales)
  );
}

export async function POST(req: NextRequest) {
  try {
    const body = (await req.json()) as Partial<Body>;

    // A) Nur Übersetzen
    if (!isContributionBody(body)) {
      const text = String((body as any)?.text ?? "");
      const to = String((body as any)?.to ?? "")
        .trim()
        .toLowerCase();
      if (!text || !to) {
        return NextResponse.json(
          { ok: false, error: "Missing 'text' or 'to'." },
          { status: 400 },
        );
      }
      const translated = await fetchGptTranslation(text, to);
      return NextResponse.json({
        ok: true,
        mode: "translate",
        result: translated,
      });
    }

    // B) Contribution-Pipeline
    const cookieUserId = req.cookies.get("u_id")?.value ?? null;
    const levelCheck = await ensureUserMeetsVerificationLevel(cookieUserId, "soft");
    if (!levelCheck.ok) {
      const status = levelCheck.error === "login_required" ? 401 : 403;
      return NextResponse.json(
        {
          ok: false,
          error: levelCheck.error,
          requiredLevel: "soft",
          currentLevel: levelCheck.level,
        },
        { status },
      );
    }

    const text = String(body.text ?? "");
    if (!text)
      return NextResponse.json(
        { ok: false, error: "Missing 'text'." },
        { status: 400 },
      );

    const region = body.region ?? null;
    const userId = cookieUserId;
    const locales =
      Array.isArray(body.locales) && body.locales.length
        ? body.locales
        : ["de", "en"];

    // 1) Analyse
    const analysisReq: ContributionAnalysisRequest = {
      text,
      region: region ?? undefined,
    };
    const analysis = await analyzeContribution(String((analysisReq as any)?.text ?? ""));

    // 2) Statements aus Originaltext (Objekte)
    const statementObjs = extractStatementsFromText(text, {
      max: Number(process.env.EXTRACT_MAX_STATEMENTS ?? 20),
      minChars: Number(process.env.EXTRACT_MIN_CHARS ?? 12),
    });

    // Strings für Funktionen, die string[] erwarten
    const statements = statementObjs.map((s) => s.text);

    // 3) Übersetzungen — deine Signatur: (texts: string[], locales: string[])
    const translations = await translateAndCache(statements, locales);

    // 4) Persistenz — Signatur erwartet string statt undefined/null
    const saved = await storeContribution({
      originalText: text,
      statements, // string[]
      translations,
      region: region ?? "", // erzwinge string
      userId: userId ?? "", // erzwinge string
    });

    return NextResponse.json({
      ok: true,
      mode: "contribution",
      saved,
      analysis,
      statements: statementObjs, // gib gern die reicheren Objekte zurück
      translations,
    });
  } catch (err: any) {
    console.error("POST /api/translate failed:", err?.message || err);
    return NextResponse.json(
      { ok: false, error: "internal_error" },
      { status: 500 },
    );
  }
}
