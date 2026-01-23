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


const STORAGE_PREFIX = "edb_human_check";
const TOKEN_TTL_MS = 10 * 60 * 1000;

type StoredHumanCheck = {
  token: string;
  solvedAt: number;
  formId: string;
};

function storageKey(formId: string) {
  return `${STORAGE_PREFIX}:${formId}`;
}

function readStoredToken(formId: string): StoredHumanCheck | null {
  if (typeof window === "undefined") return null;
  const raw = window.sessionStorage.getItem(storageKey(formId));
  if (!raw) return null;
  try {
    const parsed = JSON.parse(raw) as StoredHumanCheck;
    if (!parsed?.token || !parsed?.solvedAt || parsed.formId !== formId) return null;
    if (Date.now() - parsed.solvedAt > TOKEN_TTL_MS) return null;
    return parsed;
  } catch {
    return null;
  }
}

function storeToken(formId: string, token: string) {
  if (typeof window === "undefined") return;
  const payload: StoredHumanCheck = { token, solvedAt: Date.now(), formId };
  window.sessionStorage.setItem(storageKey(formId), JSON.stringify(payload));
}

function clearStoredToken(formId: string) {
  if (typeof window === "undefined") return;
  window.sessionStorage.removeItem(storageKey(formId));
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
  const solvedRef = useRef(false);
  const [puzzleSeed, setPuzzleSeed] = useState<string | null>(null);
  const answerValue = answer.trim();
  const isAnswerValid = /^\d+$/.test(answerValue);

  useEffect(() => {
    // Erst auf dem Client einen Seed erzeugen, damit SSR/CSR übereinstimmen.
    const seed = safeRandomId();
    setPuzzleSeed(seed);
    startRef.current = performance.now();
  }, []);

  useEffect(() => {
    const cached = readStoredToken(formId);
    if (!cached || solvedRef.current) return;
    solvedRef.current = true;
    setStatus("solved");
    setMessage("Sicherheitscheck bereits erledigt.");
    if (isCompact) setIsOpen(true);
    onSolved({ token: cached.token, meta: { restored: true } });
  }, [formId, isCompact, onSolved]);

  const puzzle = useMemo(() => (puzzleSeed ? derivePuzzle(puzzleSeed) : null), [puzzleSeed]);
  const refreshPuzzle = () => {
    const seed = safeRandomId();
    setPuzzleSeed(seed);
    startRef.current = performance.now();
    setAnswer("");
  };

  const handleVerify = async () => {
    if (!isAnswerValid) {
      setStatus("error");
      setMessage("Bitte trage das Ergebnis als Zahl ein.");
      return;
    }
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
          puzzleAnswer: Number(answerValue),
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
        clearStoredToken(formId);
        refreshPuzzle();
        return;
      }

      setStatus("solved");
      setMessage("Danke – kurz bestätigt.");
      solvedRef.current = true;
      storeToken(formId, data.humanToken);
      onSolved({ token: data.humanToken, meta: { timeToSolve, puzzleSeed } });
    } catch (err) {
      setStatus("error");
      setMessage("Es gab ein technisches Problem. Bitte später erneut versuchen.");
      onError?.(err instanceof Error ? err.message : "unknown");
      clearStoredToken(formId);
      refreshPuzzle();
    }
  };

  if (isCompact && !isOpen && status !== "solved") {
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
    <div
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
          onChange={(e) => {
            setAnswer(e.target.value);
            if (status !== "checking") {
              if (status !== "idle") setStatus("idle");
              if (message) setMessage(null);
            }
          }}
          onKeyDown={(e) => {
            if (e.key !== "Enter") return;
            e.preventDefault();
            e.stopPropagation();
            if (status !== "checking") void handleVerify();
          }}
          className={`w-24 rounded-lg border bg-white px-3 py-2 text-sm outline-none ${
            isCompact
              ? "border-slate-200 text-slate-900 focus:border-slate-400 focus:ring-2 focus:ring-slate-100"
              : "border-emerald-200 text-emerald-900 focus:border-emerald-400 focus:ring-2 focus:ring-emerald-100"
          }`}
          aria-label="Ergebnis eintragen"
        />
        <button
          type="button"
          disabled={status === "checking"}
          onClick={() => {
            if (status !== "checking") void handleVerify();
          }}
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
    </div>
  );
}
