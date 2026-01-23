type NextRequest = any;

export async function POST(req: NextRequest) {
  const body = (await req?.json?.()) ?? {};
  return new Response(JSON.stringify({ ok: true, data: { body } }), {
    headers: { "content-type": "application/json" },
  });
}
