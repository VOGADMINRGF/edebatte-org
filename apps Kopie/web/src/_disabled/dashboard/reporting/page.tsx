// apps/web/src/app/dashboard/reporting/page.tsx
"use client";

import { useEffect, useState } from "react";

interface Report {
  id: string;
  title: string;
  createdAt: string;
  votesPro: number;
  votesContra: number;
  statements: number;
  status: "aktiv" | "inaktiv" | "ausgewertet";
}

export default function ReportingDashboard() {
  const [reports, setReports] = useState<Report[]>([]);

  useEffect(() => {
    // Platzhalter: Später per API laden
    setReports([
      {
        id: "rpt-1",
        title: "Verkehrswende 2035",
        createdAt: "2025-05-15",
        votesPro: 1243,
        votesContra: 879,
        statements: 5,
        status: "aktiv",
      },
      {
        id: "rpt-2",
        title: "Digitale Bildung",
        createdAt: "2025-05-14",
        votesPro: 643,
        votesContra: 391,
        statements: 3,
        status: "ausgewertet",
      },
    ]);
  }, []);

  return (
    <div className="space-y-6">
      <h2 className="text-xl font-bold text-coral">Report-Analyse</h2>

      <div className="overflow-x-auto">
        <table className="min-w-full bg-white shadow rounded">
          <thead>
            <tr className="text-left bg-gray-100">
              <th className="p-3">Titel</th>
              <th className="p-3">Datum</th>
              <th className="p-3">Pro</th>
              <th className="p-3">Contra</th>
              <th className="p-3">Statements</th>
              <th className="p-3">Status</th>
            </tr>
          </thead>
          <tbody>
            {reports.map((r) => (
              <tr key={r.id} className="border-t hover:bg-gray-50">
                <td className="p-3 font-medium">{r.title}</td>
                <td className="p-3">{r.createdAt}</td>
                <td className="p-3 text-green-700">{r.votesPro}</td>
                <td className="p-3 text-red-600">{r.votesContra}</td>
                <td className="p-3">{r.statements}</td>
                <td className="p-3">
                  <span
                    className={`px-2 py-1 text-xs rounded ${
                      r.status === "aktiv"
                        ? "bg-green-100 text-green-800"
                        : r.status === "ausgewertet"
                          ? "bg-blue-100 text-blue-800"
                          : "bg-gray-100 text-gray-600"
                    }`}
                  >
                    {r.status}
                  </span>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}
