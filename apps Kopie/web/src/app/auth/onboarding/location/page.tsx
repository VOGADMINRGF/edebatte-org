"use client";
import { useEffect, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";

export default function OnboardingLocation() {
  const [city, setCity] = useState("");
  const [zip, setZip] = useState("");
  const [country, setCountry] = useState("DE");
  const [msg, setMsg] = useState<string>();
  const [busy, setBusy] = useState(false);
  const router = useRouter();
  const qp = useSearchParams();
  const wantsVerified = qp.get("wantsVerified") === "1";

  useEffect(() => {
    if (!navigator.geolocation) return;
    navigator.geolocation.getCurrentPosition((pos) => {
      (window as any).__ll = {
        lat: pos.coords.latitude,
        lng: pos.coords.longitude,
      };
    });
  }, []);

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    setBusy(true);
    setMsg(undefined);
    try {
      const ll = (window as any).__ll;
      const r = await fetch("/api/auth/location", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          city,
          zip,
          country: country.toUpperCase(),
          ...(ll || {}),
        }),
      });
      const j = await r.json();
      if (!r.ok) throw new Error(j?.error || "HTTP " + r.status);
      router.push(wantsVerified ? "/auth/2fa-setup" : "/");
    } catch (e: any) {
      setMsg(e.message);
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="max-w-xl mx-auto p-6 space-y-3">
      <h1 className="text-2xl font-bold">Dein Ort</h1>
      <p className="text-sm text-neutral-600">
        Wir zeigen dir Inhalte aus deiner Region.
      </p>
      <form onSubmit={submit} className="space-y-3">
        <input
          className="border rounded px-3 py-2 w-full"
          placeholder="Stadt / Ort"
          value={city}
          onChange={(e) => setCity(e.target.value)}
          required
        />
        <div className="grid grid-cols-2 gap-3">
          <input
            className="border rounded px-3 py-2"
            placeholder="PLZ"
            value={zip}
            onChange={(e) => setZip(e.target.value)}
          />
          <input
            className="border rounded px-3 py-2"
            placeholder="Land (DE, FR, …)"
            value={country}
            onChange={(e) => setCountry(e.target.value.toUpperCase())}
            maxLength={2}
          />
        </div>
        {msg && <p className="text-red-600 text-sm">{msg}</p>}
        <button
          disabled={busy}
          className="bg-black text-white rounded px-4 py-2 disabled:opacity-50"
        >
          {busy ? "…" : "Weiter"}
        </button>
      </form>
    </div>
  );
}
