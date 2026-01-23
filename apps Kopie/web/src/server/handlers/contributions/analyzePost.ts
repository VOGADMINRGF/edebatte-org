type NextRequest = any;
type NextResponse = any;
import { analyzeAndTranslate } from "@/lib/contribution/analyzeAndTranslate";

export async function handleAnalyzePost(req: NextRequest) {
  const body = (await req?.json?.()) ?? {};
  const result = await analyzeAndTranslate(body);
  return {
    ok: true,
    data: { ...result, userId: String(body.userId ?? "") },
  } as NextResponse;
}
