"use client";
import { useEffect, useState } from "react";

interface TranslationStat {
  path: string;
  language: string;
  status: "cached" | "translated" | "confirmed" | "error";
  date: string;
  source?: "GPT" | "human";
}

export default function TranslationDashboard() {
  const [stats, setStats] = useState<TranslationStat[]>([]);

  useEffect(() => {
    fetch("/api/translation-stats")
      .then((res) => res.json())
      .then((data) => setStats(data))
      .catch(() => setStats([]));
  }, []);

  return (
    <section className="space-y-6">
      <h2 className="text-xl font-bold text-coral">
        Sprach- & Übersetzungsstatus
      </h2>
      <table className="w-full text-sm bg-white rounded shadow border">
        <thead>
          <tr className="bg-gray-100 text-left">
            <th className="p-3">Pfad</th>
            <th className="p-3">Sprache</th>
            <th className="p-3">Status</th>
            <th className="p-3">Quelle</th>
            <th className="p-3">Zuletzt aktualisiert</th>
          </tr>
        </thead>
        <tbody>
          {stats.map((s, i) => (
            <tr key={i} className="border-t hover:bg-gray-50">
              <td className="p-3 font-medium">{s.path}</td>
              <td className="p-3">{s.language.toUpperCase()}</td>
              <td className="p-3">
                <span
                  className={`inline-block px-2 py-1 rounded text-xs font-semibold ${
                    s.status === "confirmed"
                      ? "bg-green-100 text-green-800"
                      : s.status === "cached"
                        ? "bg-yellow-100 text-yellow-800"
                        : s.status === "error"
                          ? "bg-red-100 text-red-700"
                          : "bg-blue-100 text-blue-800"
                  }`}
                >
                  {s.status}
                </span>
              </td>
              <td className="p-3">{s.source}</td>
              <td className="p-3">{s.date}</td>
            </tr>
          ))}
        </tbody>
      </table>
    </section>
  );
}
