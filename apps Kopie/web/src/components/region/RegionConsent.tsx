"use client";

import { useEffect, useState } from "react";
import { useRegionPreference } from "@/hooks/useRegionPreference";

export default function RegionConsent({
  className = "",
}: {
  className?: string;
}) {
  const { region, checking, askGeolocationOnce, setManualRegion } =
    useRegionPreference();
  const [open, setOpen] = useState(false);
  const [status, setStatus] = useState<PermissionState | "unknown">("unknown");

  useEffect(() => {
    if (!("permissions" in navigator)) {
      setStatus("unknown");
      return;
    }
    // Permissons API: Geolocation
    // @ts-ignore
    navigator.permissions
      .query({ name: "geolocation" })
      .then((result: any) => {
        setStatus(result.state);
        result.onchange = () => setStatus(result.state);
      })
      .catch(() => setStatus("unknown"));
  }, []);

  useEffect(() => {
    if (!checking && !region && status !== "denied") setOpen(true);
  }, [checking, region, status]);

  if (!open || region) return null;

  return (
    <div
      className={`fixed inset-0 z-50 flex items-center justify-center bg-black/40 ${className}`}
    >
      <div className="bg-white dark:bg-neutral-900 rounded-2xl shadow-xl p-6 w-[min(94vw,560px)]">
        <h2 className="text-xl font-semibold mb-2">
          Standort für lokale Inhalte verwenden?
        </h2>
        <p className="text-sm text-neutral-600 dark:text-neutral-300">
          Wir fragen einmalig nach deiner aktuellen Position, um{" "}
          <b>nahe Themen</b> zu priorisieren. Deine Position wird{" "}
          <b>nicht gespeichert</b>, außer du möchtest deine Region im Profil
          übernehmen. Du kannst das jederzeit in den Einstellungen ändern.
        </p>

        <div className="mt-4 flex flex-wrap gap-2">
          <button
            className="px-4 py-2 rounded-xl bg-black text-white hover:opacity-90"
            onClick={async () => {
              try {
                await askGeolocationOnce();
              } catch {
                /* ignore */
              }
              setOpen(false);
            }}
          >
            Jetzt erlauben
          </button>

          <button
            className="px-4 py-2 rounded-xl border border-neutral-300 dark:border-neutral-700"
            onClick={() => setOpen(false)}
          >
            Später
          </button>

          <a
            className="px-4 py-2 rounded-xl underline underline-offset-4"
            href="/settings/region"
          >
            Region manuell wählen
          </a>
        </div>

        {status === "denied" && (
          <p className="mt-3 text-xs text-red-600">
            Zugriff aktuell blockiert. Bitte erlaube Standort in den
            Browser-Einstellungen.
          </p>
        )}
      </div>
    </div>
  );
}
