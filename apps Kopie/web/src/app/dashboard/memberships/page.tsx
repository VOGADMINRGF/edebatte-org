import { cookies } from "next/headers";

type MembershipRow = {
  id: string;
  userId: string;
  amountPerPeriod: number;
  rhythm: string;
  householdSize: number;
  status: string;
  createdAt: string | null;
};

export default async function MembershipAdminPage() {
  const cookieStore = cookies();
  const session = cookieStore.get("u_id")?.value;
  if (!session) {
    return (
      <main className="mx-auto max-w-5xl px-4 py-10">
        <p className="text-sm text-slate-700">Bitte einloggen.</p>
      </main>
    );
  }

  const cookieHeader = cookieStore
    .getAll()
    .map((c) => `${c.name}=${c.value}`)
    .join("; ");

  const res = await fetch(`${process.env.NEXT_PUBLIC_BASE_URL || ""}/api/admin/memberships`, {
    cache: "no-store",
    headers: cookieHeader ? { cookie: cookieHeader } : undefined,
  }).catch(() => null);
  const data = res ? await res.json().catch(() => null) : null;
  const items: MembershipRow[] = data?.items ?? [];

  return (
    <main className="mx-auto max-w-6xl px-4 py-10 space-y-6">
      <div>
        <p className="text-xs font-semibold uppercase tracking-wide text-slate-500">Admin</p>
        <h1 className="text-2xl font-bold text-slate-900">Mitgliedsanträge</h1>
        <p className="text-sm text-slate-600">Eingegangene Anträge mit Betrag, Rhythmus, Haushalt und Status.</p>
      </div>
      <div className="overflow-x-auto rounded-2xl border border-slate-100 bg-white shadow-sm">
        <table className="min-w-full text-sm">
          <thead className="bg-slate-50 text-left text-xs uppercase tracking-wide text-slate-500">
            <tr>
              <th className="px-4 py-3">Datum</th>
              <th className="px-4 py-3">User</th>
              <th className="px-4 py-3">Betrag</th>
              <th className="px-4 py-3">Rhythmus</th>
              <th className="px-4 py-3">Haushalt</th>
              <th className="px-4 py-3">Status</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-100">
            {items.map((row) => (
              <tr key={row.id} className="hover:bg-slate-50/70">
                <td className="px-4 py-3">{row.createdAt ? new Date(row.createdAt).toLocaleDateString("de-DE") : "—"}</td>
                <td className="px-4 py-3 font-mono text-xs text-slate-700">{row.userId}</td>
                <td className="px-4 py-3">{row.amountPerPeriod.toFixed(2)} €</td>
                <td className="px-4 py-3">{row.rhythm}</td>
                <td className="px-4 py-3">{row.householdSize}</td>
                <td className="px-4 py-3">
                  <span className="rounded-full bg-slate-100 px-3 py-1 text-xs font-semibold text-slate-700">
                    {row.status}
                  </span>
                </td>
              </tr>
            ))}
            {items.length === 0 && (
              <tr>
                <td colSpan={6} className="px-4 py-6 text-center text-sm text-slate-500">
                  Keine Anträge gefunden.
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>
    </main>
  );
}
