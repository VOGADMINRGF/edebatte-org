import Link from "next/link";
import { absUrl } from "@/utils/serverBaseUrl";

async function getSummary() {
  const r = await fetch(absUrl("/api/admin/analytics/summary"), {
    cache: "no-store",
  });
  return r.ok ? r.json() : null;
}
async function getErrors() {
  const r = await fetch(absUrl("/api/admin/errors/last24"), {
    cache: "no-store",
  });
  return r.ok ? r.json() : [];
}

export default async function AdminPage() {
  const [sum, errs] = await Promise.all([getSummary(), getErrors()]);
  return (
    <div className="max-w-6xl mx-auto p-6 space-y-6">
      <h1 className="text-2xl font-bold">Admin</h1>
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <div className="border rounded p-4">
          <div className="font-semibold mb-2">System</div>
          <ul className="text-sm space-y-1">
            <li>
              <Link href="/admin/system" className="underline">
                SystemMatrix
              </Link>
            </li>
            <li>
              <Link href="/admin/telemetry" className="underline">
                Telemetrie
              </Link>
            </li>
            <li>
              <Link href="/admin/users" className="underline">
                Benutzer
              </Link>
            </li>
          </ul>
        </div>
        <div className="border rounded p-4">
          <div className="font-semibold mb-2">Analytics</div>
          {sum ? (
            <ul className="text-sm">
              <li>Contributions: {sum.totals.contribs}</li>
              <li>Statements: {sum.totals.statements}</li>
              <li>Reports: {sum.totals.reports}</li>
              <li>Votes: {sum.totals.votes}</li>
            </ul>
          ) : (
            <div className="text-sm text-gray-500">Keine Daten.</div>
          )}
        </div>
        <div className="border rounded p-4">
          <div className="font-semibold mb-2">Errors (24h)</div>
          <ul className="text-sm list-disc pl-5">
            {(Array.isArray(errs) ? errs : []).slice(0, 5).map((e: any) => (
              <li key={e.id}>
                <Link className="underline" href={`/admin/errors/${e.id}`}>
                  {e.msg || e.name || "Error"}
                </Link>
              </li>
            ))}
          </ul>
        </div>
      </div>
    </div>
  );
}
