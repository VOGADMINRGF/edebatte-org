export const dynamic = "force-dynamic";
export const runtime = "nodejs";

export async function GET() {
  return new Response(null, {
    status: 404,
    headers: { "cache-control": "no-store" },
  });
}
