export const runtime = "nodejs";
// Backwards-Compat: create ⇒ persist
export { POST } from "../route";

export async function GET() {
  return new Response(JSON.stringify({ error: "GET not allowed. Use POST." }), {
    status: 405,
    headers: { "Content-Type": "application/json" }
  });
}
