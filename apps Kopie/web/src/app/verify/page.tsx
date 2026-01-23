// apps/web/src/app/verify/page.tsx (final)
"use client";

import { useCallback, useEffect, useState } from "react";
import { useSearchParams, useRouter } from "next/navigation";
import Link from "next/link";

export default function VerifyPage() {
  const sp = useSearchParams();
  const router = useRouter();

  const [email, setEmail] = useState("");
  const [token, setToken] = useState("");
  const [busy, setBusy] = useState(false);
  const [ok, setOk] = useState(false);
  const [errMsg, setErrMsg] = useState<string>();
  const [okMsg, setOkMsg] = useState<string>();
  const [infoMsg, setInfoMsg] = useState<string>();

  // Prefill aus URL (email, token)
  useEffect(() => {
    const em = sp.get("email") ?? "";
    const tk = sp.get("token") ?? "";
    if (em) setEmail(em);
    if (tk) setToken(tk);
  }, [sp]);

  const verifyNow = useCallback(
    async (em: string, tk: string) => {
      setBusy(true);
      setErrMsg(undefined);
      setOkMsg(undefined);
      setOk(false);
      try {
        if (!em || !tk) throw new Error("Bitte E-Mail und Token angeben.");

        const ac = new AbortController();
        const to = setTimeout(() => ac.abort("timeout"), 15_000);

        const r = await fetch("/api/auth/verify", {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            Accept: "application/json",
          },
          credentials: "include",
          cache: "no-store",
          body: JSON.stringify({ email: em, token: tk }),
          signal: ac.signal,
        });

        clearTimeout(to);

        const ct = r.headers.get("content-type") || "";
        const data = ct.includes("application/json")
          ? await r.json().catch(() => ({}))
          : { error: (await r.text()).slice(0, 500) };

        if (!r.ok)
          throw new Error(data?.error || data?.message || `HTTP ${r.status}`);

        setOk(true);
        setOkMsg("Verifiziert! Weiterleitung …");

        // 1) API bevorzugen (nextUrl vom Server)
        const serverNext =
          typeof data?.nextUrl === "string" && data.nextUrl.length > 0
            ? data.nextUrl
            : null;
        // 2) ansonsten clientseitiges ?next= aus der URL beachten
        const qpNext = sp.get("next");
        const next =
          serverNext ||
          (qpNext ? decodeURIComponent(qpNext) : "/login?verified=1");
        router.replace(next);
      } catch (err: any) {
        setErrMsg(
          err?.name === "AbortError"
            ? "Zeitüberschreitung. Bitte erneut versuchen."
            : err?.message || "Unbekannter Fehler",
        );
      } finally {
        setBusy(false);
      }
    },
    [router, sp],
  );

  // Auto-Submit, wenn beide Query-Parameter vorhanden
  useEffect(() => {
    const em = sp.get("email");
    const tk = sp.get("token");
    if (em && tk) {
      verifyNow(em, tk);
    }
  }, [sp, verifyNow]);

  async function onSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    verifyNow(email, token);
  }

  async function resend() {
    setInfoMsg(undefined);
    try {
      const r = await fetch("/api/auth/verify/resend", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email }),
      });
      const j = await r.json().catch(() => ({}));
      if (r.ok) {
        setInfoMsg(
          j?.verifyUrl
            ? `Neuer Link gesendet. (Dev: ${j.verifyUrl})`
            : "Neuer Verifizierungslink gesendet (Postfach prüfen).",
        );
      } else {
        setInfoMsg(j?.error || "Senden nicht möglich.");
      }
    } catch {
      setInfoMsg("Senden nicht möglich.");
    }
  }

  return (
    <div className="mx-auto max-w-md p-6">
      <h1 className="text-2xl font-semibold mb-4">E-Mail verifizieren</h1>

      <form onSubmit={onSubmit} className="space-y-4">
        <label className="block">
          <span className="sr-only">E-Mail</span>
          <input
            className="w-full border rounded px-3 py-2"
            type="email"
            name="email"
            placeholder="E-Mail"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            required
            autoComplete="email"
            inputMode="email"
            disabled={busy}
          />
        </label>

        <label className="block">
          <span className="sr-only">Token</span>
          <input
            className="w-full border rounded px-3 py-2"
            type="text"
            name="token"
            placeholder="Token"
            value={token}
            onChange={(e) => setToken(e.target.value)}
            required
            autoComplete="one-time-code"
            disabled={busy}
          />
        </label>

        {errMsg && (
          <p className="text-red-600 text-sm" aria-live="assertive">
            {String(errMsg)}
          </p>
        )}
        {okMsg && (
          <p className="text-green-700 text-sm" aria-live="polite">
            {okMsg}
          </p>
        )}
        {infoMsg && <p className="text-sm">{infoMsg}</p>}

        <div className="flex items-center gap-3">
          <button
            type="submit"
            disabled={busy}
            className="bg-black text-white rounded px-4 py-2 disabled:opacity-50"
          >
            {busy ? "…" : "Verifizieren"}
          </button>
          <button
            type="button"
            onClick={resend}
            disabled={!email || busy}
            className="text-sm underline"
          >
            Code erneut senden
          </button>
        </div>
      </form>

      <p className="text-sm mt-4 text-neutral-600">
        Hinweis: Im lokalen Dev steht der Verify-Link in der Server-Konsole.
      </p>

      <p className="text-sm mt-2">
        Zurück zum{" "}
        <Link className="underline" href="/login">
          Login
        </Link>
      </p>
    </div>
  );
}
