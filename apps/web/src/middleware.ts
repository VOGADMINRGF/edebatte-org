// apps/web/src/middleware.ts
import { NextRequest, NextResponse } from "next/server";
export async function middleware(req: NextRequest) {
  const pathname = req.nextUrl.pathname;

  // Statics und Next-Interna durchlassen
  if (pathname.startsWith("/_next") || pathname.startsWith("/favicon") || pathname.startsWith("/static")) {
    return allowNext();
  }

  // Nur /api/* prüfen
  if (!pathname.startsWith("/api")) {
    return allowNext();
  }

  // Auth-Endpoints immer durchlassen
  if (pathname.startsWith("/api/auth")) {
    return allowNext();
  }

  if (pathname === "/api/access/check") {
    return allowNext();
  }

  try {
    const checkUrl = new URL("/api/access/check", req.url);
    checkUrl.searchParams.set("path", pathname);
    const checkRes = await fetch(checkUrl, {
      headers: {
        cookie: req.headers.get("cookie") ?? "",
      },
    });
    const body = (await checkRes.json().catch(() => null)) as {
      decision?: "allowed" | "login_required" | "forbidden";
    } | null;
    if (body?.decision === "allowed") {
      return allowNext();
    }
    if (body?.decision === "login_required") {
      return NextResponse.json({ error: "unauthorized" }, { status: 401 });
    }
    if (body?.decision === "forbidden") {
      return NextResponse.json({ error: "forbidden" }, { status: 403 });
    }
  } catch {
    return allowNext();
  }

  return allowNext();
}

function allowNext() {
  return (NextResponse as any).next();
}

// Nur echte Seiten, keine statics
export const config = {
  matcher: ["/api/:path*"],
};
