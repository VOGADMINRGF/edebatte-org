function baseUrl(): string {
  if (process.env.NEXT_PUBLIC_BASE_URL) return process.env.NEXT_PUBLIC_BASE_URL;
  if (process.env.VERCEL_URL) return `https://${process.env.VERCEL_URL}`;
  return "http://localhost:3000";
}

export default async function VerifyPage({ params }: { params: { receiptHash: string } }) {
  const hash = params.receiptHash;
  const res = await fetch(`${baseUrl()}/api/runreceipts/by-hash/${hash}`, { cache: "no-store" }).catch(() => null);
  const data = res ? await res.json().catch(() => null) : null;
  return (
    <div className="mx-auto max-w-3xl p-4">
      <h1 className="text-xl font-semibold">Verify</h1>
      <p className="mt-1 text-sm text-slate-600">Lookup by receiptHash (metadata only)</p>
      <pre className="mt-4 overflow-auto rounded-xl border border-slate-200 bg-white p-4 text-xs">
        {JSON.stringify(data, null, 2)}
      </pre>
    </div>
  );
}
