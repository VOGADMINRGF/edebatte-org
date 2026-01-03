"use client";
// E200: Lightweight anti-bot check with honeypot, puzzle, and time heuristic.

import { useEffect, useMemo, useRef, useState } from "react";
import { derivePuzzle } from "@/lib/security/human-puzzle";
import { safeRandomId } from "@core/utils/random";

interface HumanCheckProps {
  formId?: string;
  onSolved: (result: { token: string; meta?: Record<string, unknown> }) => void;
  onError?: (reason: string) => void;
  variant?: "full" | "compact";
}

export function HumanCheck({
  formId = "public-updates",
  onSolved,
  onError,
  variant = "full",
}: HumanCheckProps) {
  const isCompact = variant === "compact";
  const [isOpen, setIsOpen] = useState(!isCompact);
  const [honeypot, setHoneypot] = useState("");
  const [answer, setAnswer] = useState("");
  const [status, setStatus] = useState<"idle" | "checking" | "solved" | "error">("idle");
  const [message, setMessage] = useState<string | null>(null);
  const startRef = useRef<number | null>(null);
  const [puzzleSeed, setPuzzleSeed] = useState<string | null>(null);

  useEffect(() => {
    // Erst auf dem Client einen Seed erzeugen, damit SSR/CSR übereinstimmen.
    const seed = safeRandomId();
    setPuzzleSeed(seed);
    startRef.current = performance.now();
  }, []);

  const puzzle = useMemo(() => (puzzleSeed ? derivePuzzle(puzzleSeed) : null), [puzzleSeed]);

  const handleVerify = async (e: React.FormEvent) => {
    e.preventDefault();
    setStatus("checking");
    setMessage(null);

    const startedAt = startRef.current ?? performance.now();
    const timeToSolve = Math.max(0, Math.floor(performance.now() - startedAt));

    try {
      const res = await fetch("/api/security/verify-human", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          formId,
          honeypotValue: honeypot,
          puzzleAnswer: Number(answer),
          puzzleSeed,
          timeToSolve,
        }),
      });

      const data = await res.json();
      if (!res.ok || !data?.ok) {
        const reason = data?.code ?? "unknown";
        setStatus("error");
        setMessage("Die Bestätigung hat nicht geklappt. Bitte kurz erneut versuchen.");
        onError?.(reason);
        return;
      }

      setStatus("solved");
      setMessage("Danke – kurz bestätigt.");
      onSolved({ token: data.humanToken, meta: { timeToSolve, puzzleSeed } });
    } catch (err) {
      setStatus("error");
      setMessage("Es gab ein technisches Problem. Bitte später erneut versuchen.");
      onError?.(err instanceof Error ? err.message : "unknown");
    }
  };

  if (isCompact && !isOpen) {
    return (
      <div className="space-y-2 rounded-xl border border-slate-200 bg-white/95 p-4 text-xs text-slate-600 shadow-sm">
        <p className="text-sm font-semibold text-slate-900">Kurze Bestätigung</p>
        <p>
          Kurzer Anti-Spam-Check. Öffne die Aufgabe nur, wenn du das Formular absenden willst.
        </p>
        <button
          type="button"
          onClick={() => setIsOpen(true)}
          className="inline-flex items-center rounded-full bg-slate-900 px-4 py-2 text-xs font-semibold text-white shadow hover:bg-slate-800"
        >
          Bestätigung öffnen
        </button>
      </div>
    );
  }

  if (!puzzle) {
    return (
      <div
        className={`space-y-2 rounded-xl border p-4 text-xs ${
          isCompact
            ? "border-slate-200 bg-white/95 text-slate-600 shadow-sm"
            : "border-emerald-100 bg-emerald-50/70 text-emerald-800"
        }`}
      >
        Lade kurze Bestätigung …
      </div>
    );
  }

  return (
    <form
      onSubmit={handleVerify}
      className={`space-y-3 rounded-xl border p-4 ${
        isCompact
          ? "border-slate-200 bg-white/95 shadow-sm"
          : "border-emerald-100 bg-emerald-50/70"
      }`}
    >
      <div className="flex items-center justify-between gap-2">
        <p
          className={`text-sm font-semibold ${
            isCompact ? "text-slate-900" : "text-emerald-900"
          }`}
        >
          Kurze Bestätigung: Bist du ein Mensch?
        </p>
        {status === "solved" && (
          <span
            className={`text-xs font-semibold ${
              isCompact ? "text-slate-600" : "text-emerald-700"
            }`}
          >
            ✓ geprüft
          </span>
        )}
      </div>
      <p className={`text-xs ${isCompact ? "text-slate-600" : "text-emerald-800"}`}>
        Wir schützen Formulare vor Spam. Kein Tracking, nur ein kleiner Check: Bitte rechne die Aufgabe und lass das versteckte
        Feld leer.
      </p>

      <label className="sr-only" aria-hidden>
        Bitte leer lassen
        <input
          tabIndex={-1}
          autoComplete="off"
          value={honeypot}
          onChange={(e) => setHoneypot(e.target.value)}
          className="absolute opacity-0"
        />
      </label>

      <div
        className={`flex items-center gap-3 rounded-lg border px-3 py-2 ${
          isCompact
            ? "border-slate-200 bg-slate-50/60"
            : "border-emerald-200 bg-white/70"
        }`}
      >
        <span
          className={`text-sm font-semibold ${
            isCompact ? "text-slate-900" : "text-emerald-900"
          }`}
        >
          {puzzle.first} + {puzzle.second} =
        </span>
        <input
          required
          inputMode="numeric"
          pattern="[0-9]*"
          value={answer}
          onChange={(e) => setAnswer(e.target.value)}
          className={`w-24 rounded-lg border bg-white px-3 py-2 text-sm outline-none ${
            isCompact
              ? "border-slate-200 text-slate-900 focus:border-slate-400 focus:ring-2 focus:ring-slate-100"
              : "border-emerald-200 text-emerald-900 focus:border-emerald-400 focus:ring-2 focus:ring-emerald-100"
          }`}
          aria-label="Ergebnis eintragen"
        />
        <button
          type="submit"
          disabled={status === "checking"}
          className={`ml-auto inline-flex items-center rounded-full px-4 py-2 text-xs font-semibold text-white shadow disabled:opacity-60 ${
            isCompact
              ? "bg-slate-900 hover:bg-slate-800"
              : "bg-emerald-600 hover:brightness-110"
          }`}
        >
          {status === "checking" ? "Prüfen …" : status === "solved" ? "Bestätigt" : "Kurz prüfen"}
        </button>
      </div>

      {message && (
        <p className={`text-xs ${isCompact ? "text-slate-600" : "text-emerald-700"}`}>
          {message}
        </p>
      )}
    </form>
  );
}
