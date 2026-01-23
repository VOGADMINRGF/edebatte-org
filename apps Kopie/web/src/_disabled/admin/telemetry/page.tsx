import { absUrl } from "@/utils/serverBaseUrl";

async function getAI() {
  const r = await fetch(absUrl("/api/admin/telemetry/ai"), {
    cache: "no-store",
  });
  return r.ok ? r.json() : { providers: [] };
}

export default async function TelemetryPage() {
  const data = await getAI();
  return (
    <div className="max-w-4xl mx-auto p-6 space-y-6">
      <h1 className="text-2xl font-bold">Telemetrie</h1>
      <section>
        <h2 className="text-xl font-semibold mb-3">AI-Provider</h2>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {data.providers.map((p: any) => (
            <div
              key={p.name}
              className={`border rounded p-4 ${p.ok ? "border-green-400" : p.skipped ? "border-yellow-400" : "border-red-400"}`}
            >
              <div className="font-medium">{p.label}</div>
              <div className="text-sm">
                {p.ok && "OK"}
                {p.skipped && "Skipped (no key)"}
                {p.error && `Fehler: ${p.error}`}
              </div>
              {p.note && (
                <div className="text-xs text-gray-500 mt-1">{p.note}</div>
              )}
            </div>
          ))}
        </div>
      </section>
    </div>
  );
}
