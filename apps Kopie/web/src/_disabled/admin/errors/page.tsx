import { ErrorLogModel } from "@/models/ErrorLog";
import ErrorTable from "./ErrorTable";

export const dynamic = "force-dynamic";

export default async function AdminErrorsPage() {
  const docs = await ErrorLogModel.find(
    {},
    {
      projection: { traceId: 1, code: 1, path: 1, status: 1, resolved: 1, timestamp: 1 },
      sort: { timestamp: -1 },
      limit: 50,
    },
  );

  const initial = docs.map((d: any) => ({
    _id: String(d._id),
    traceId: String(d.traceId ?? ""),
    code: d.code ?? "",
    path: d.path ?? "",
    status: typeof d.status === "number" ? d.status : undefined,
    resolved: Boolean(d.resolved),
    timestamp: d.timestamp
      ? new Date(d.timestamp).toISOString()
      : new Date().toISOString(),
  }));

  return (
    <main className="max-w-6xl mx-auto p-6">
      <h1 className="text-3xl font-bold mb-6">Fehlerprotokoll</h1>
      <ErrorTable initial={initial} />
    </main>
  );
}
