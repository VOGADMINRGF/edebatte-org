"use client";
import { useEffect, useState } from "react";
import QRCode from "qrcode";

export default function TwoFASetup() {
  const [otpauth, setOtpauth] = useState<string>();
  const [qr, setQr] = useState<string>();
  const [code, setCode] = useState("");
  const [msg, setMsg] = useState<string>();
  const [ok, setOk] = useState(false);

  useEffect(() => {
    (async () => {
      const r = await fetch("/api/auth/totp/initiate", { method: "POST" });
      const j = await r.json();
      if (r.ok && j.otpauth) {
        setOtpauth(j.otpauth);
        setQr(await QRCode.toDataURL(j.otpauth));
      } else {
        setMsg(j?.error || "Fehler beim Starten des 2FA-Setups");
      }
    })();
  }, []);

  async function verify(e: React.FormEvent) {
    e.preventDefault();
    setMsg(undefined);
    const r = await fetch("/api/auth/totp/verify", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ code }),
    });
    const j = await r.json();
    if (r.ok) setOk(true);
    else setMsg(j?.error || "Verifizierung fehlgeschlagen");
  }

  return (
    <div className="max-w-lg mx-auto p-6 space-y-4">
      <h1 className="text-2xl font-bold">2-Faktor aktivieren</h1>
      {!ok ? (
        <>
          <p>
            Scanne den QR-Code mit deiner Authenticator-App und gib den
            6-stelligen Code ein.
          </p>
          {qr ? (
            <img src={qr} alt="QR" className="w-60 h-60" />
          ) : (
            <p>QR wird geladen…</p>
          )}
          <form onSubmit={verify} className="space-y-2">
            <input
              className="border rounded px-3 py-2 w-full"
              placeholder="Code"
              value={code}
              onChange={(e) => setCode(e.target.value)}
            />
            {msg && <p className="text-red-600 text-sm">{msg}</p>}
            <button className="bg-black text-white rounded px-4 py-2">
              Bestätigen
            </button>
          </form>
        </>
      ) : (
        <p className="text-green-700">
          2FA aktiv. Du kannst jetzt verifizierte Inhalte nutzen.
        </p>
      )}
    </div>
  );
}
