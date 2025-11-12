// apps/web/src/middleware.ts
import { NextRequest, NextResponse } from "next/server";

export function middleware(_req: NextRequest) {
  // Einige Next 15 Typings enthalten .next() nicht – zur Laufzeit existiert es.
  // @ts-ignore
  return NextResponse.next();
}

// Nur echte Seiten, keine statics
export const config = {
  matcher: ["/((?!_next/static|_next/image|favicon.ico).*)"],
};
