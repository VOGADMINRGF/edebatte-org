"use client";
import { useEffect, useState } from "react";

export default function HealthPage() {
  const [snap, setSnap] = useState<any>(null);
  useEffect(() => {
    fetch("/api/ai/health")
      .then((r) => r.json())
      .then(setSnap)
      .catch(() => setSnap({ ok: false }));
  }, []);
  if (!snap) return <div className="p-6">Lade…</div>;
  return (
    <div className="p-6">
      <h1 className="text-xl font-semibold mb-4">AI Health</h1>
      <pre className="bg-gray-100 p-4 rounded text-sm overflow-auto">
        {JSON.stringify(snap, null, 2)}
      </pre>
    </div>
  );
}
