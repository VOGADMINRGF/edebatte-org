// E200: Public updates endpoint guarded by HumanCheck tokens.
import { NextResponse, type NextRequest } from "next/server";
import { verifyHumanToken } from "@/lib/security/human-token";

export async function POST(request: NextRequest) {
  let body: any;
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ ok: false, code: "bad_request" }, { status: 400 });
  }

  const { email, interests, humanToken } = body ?? {};

  if (!humanToken || typeof humanToken !== "string") {
    return NextResponse.json({ ok: false, code: "missing_token" }, { status: 400 });
  }

  const verified = await verifyHumanToken(humanToken);
  if (!verified) {
    return NextResponse.json({ ok: false, code: "invalid_token" }, { status: 403 });
  }

  if (email && typeof email !== "string") {
    return NextResponse.json({ ok: false, code: "invalid_email" }, { status: 400 });
  }

  if (interests && typeof interests !== "string") {
    return NextResponse.json({ ok: false, code: "invalid_interests" }, { status: 400 });
  }

  // Placeholder for future persistence: keep payload minimal and avoid logging PII.
  return NextResponse.json({ ok: true });
}
