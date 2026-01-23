"use client";

const logs = [
  {
    code: "ANALYSIS_ERROR",
    count: 6,
    traceIds: ["ERR-12AB34CD", "ERR-56EF78GH"],
    path: "/api/contribution/analyze",
    lastSeen: "vor 4 Min",
  },
  {
    code: "SAVE_ERROR",
    count: 2,
    traceIds: ["ERR-9XYZ1234"],
    path: "/api/contribution/save",
    lastSeen: "vor 13 Min",
  },
];

export default function AdminErrorLog() {
  return (
    <div className="p-6 space-y-6 max-w-5xl mx-auto">
      <h1 className="text-2xl font-bold">Fehlerprotokoll</h1>
      <table className="w-full text-sm border">
        <thead className="bg-gray-100 text-left">
          <tr>
            <th className="px-4 py-2">Code</th>
            <th className="px-4 py-2">Anzahl</th>
            <th className="px-4 py-2">Pfad</th>
            <th className="px-4 py-2">Zuletzt</th>
            <th className="px-4 py-2">Trace-IDs</th>
          </tr>
        </thead>
        <tbody>
          {logs.map((e, i) => (
            <tr key={i} className="border-t">
              <td className="px-4 py-2 font-mono">{e.code}</td>
              <td className="px-4 py-2">{e.count}</td>
              <td className="px-4 py-2">{e.path}</td>
              <td className="px-4 py-2">{e.lastSeen}</td>
              <td className="px-4 py-2 text-xs">
                {e.traceIds.map((id) => (
                  <div
                    key={id}
                    className="inline-block bg-gray-200 rounded px-2 py-1 mr-1"
                  >
                    {id}
                  </div>
                ))}
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
