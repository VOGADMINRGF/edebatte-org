// apps/web/src/app/apple-touch-icon.png/route.ts
import { NextRequest } from "next/server";

// 1x1 transparent PNG
const PNG_1x1 = Uint8Array.from(
  atob("iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVR42mP8Xw8AApEBgWcJgN0AAAAASUVORK5CYII="),
  (c) => c.charCodeAt(0)
);

export function GET(_req: NextRequest) {
  return new Response(PNG_1x1, {
    status: 200,
    headers: {
      "content-type": "image/png",
      "cache-control": "public, max-age=31536000, immutable",
    },
  });
}
