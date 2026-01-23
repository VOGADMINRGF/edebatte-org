"use client";

import { useEffect, useState, useTransition } from "react";

type AlertSettings = { enabled: boolean; recipients: string[] };

export default function MonitoringControls() {
  const [settings, setSettings] = useState<AlertSettings>({
    enabled: true,
    recipients: [],
  });
  const [loading, startTransition] = useTransition();
  const [saving, setSaving] = useState(false);
  const [sending, setSending] = useState(false);

  useEffect(() => {
    (async () => {
      const r = await fetch("/api/admin/alerts/settings", {
        cache: "no-store",
      });
      if (r.ok) setSettings(await r.json());
    })();
  }, []);

  async function save() {
    setSaving(true);
    try {
      const r = await fetch("/api/admin/alerts/settings", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify(settings),
      });
      alert(r.ok ? "Gespeichert." : "Speichern fehlgeschlagen.");
    } finally {
      setSaving(false);
    }
  }

  async function testMail() {
    setSending(true);
    try {
      const r = await fetch("/api/admin/alerts/test", { method: "POST" });
      alert(r.ok ? "Test-Mail versendet." : "Test-Mail fehlgeschlagen.");
    } finally {
      setSending(false);
    }
  }

  // führt einen frischen Health-Check aus und lädt die Seite neu
  async function manualCheck() {
    await fetch("/api/admin/health/check", { method: "POST" });
    startTransition(() => window.location.reload());
  }

  return (
    <div className="rounded-xl border p-4 space-y-4">
      <h3 className="font-semibold text-lg">Monitoring</h3>

      <label className="flex items-center gap-2">
        <input
          type="checkbox"
          checked={settings.enabled}
          onChange={(e) =>
            setSettings((s) => ({ ...s, enabled: e.target.checked }))
          }
        />
        Alerts aktiv
      </label>

      <label className="block">
        <div className="text-sm text-gray-600 mb-1">
          Empfänger (Komma oder Zeilenumbruch)
        </div>
        <textarea
          className="w-full border rounded p-2"
          rows={3}
          value={settings.recipients.join("\n")}
          onChange={(e) =>
            setSettings((s) => ({
              ...s,
              recipients: e.target.value
                .split(/\s*,\s*|\n+/)
                .map((x) => x.trim())
                .filter(Boolean),
            }))
          }
          placeholder="alerts@example.com, ops@example.com"
        />
      </label>

      <div className="flex gap-8 flex-wrap">
        <button
          onClick={save}
          disabled={saving}
          className="px-3 py-2 rounded bg-black text-white disabled:opacity-50"
        >
          {saving ? "Speichere…" : "Speichern"}
        </button>

        <button
          onClick={testMail}
          disabled={sending}
          className="px-3 py-2 rounded border disabled:opacity-50"
        >
          {sending ? "Sende…" : "Test-Mail senden"}
        </button>

        <button
          onClick={manualCheck}
          disabled={loading}
          className="px-3 py-2 rounded border disabled:opacity-50"
          title="Führt sofort einen frischen Health-Check aus"
        >
          Jetzt prüfen
        </button>
      </div>
    </div>
  );
}
