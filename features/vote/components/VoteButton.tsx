// features/vote/components/VoteButton.tsx
"use client";

import { useState } from "react";
import { safeRandomId } from "@core/utils/random";

type Val = "agree" | "neutral" | "disagree";
type Summary = { agree: number; neutral: number; disagree: number };

function ensureFp(): string {
  try {
    // robuste Fallback-ID: nutzt intern crypto/random, falls vorhanden
    const uuid = safeRandomId();

    // sollte in einem Client-Component immer vorhanden sein,
    // aber wir guard-en trotzdem für Sicherheit / Tests
    if (typeof window === "undefined" || typeof window.localStorage === "undefined") {
      return uuid;
    }

    let fp =
      window.localStorage.getItem("vog_fp") ||
      uuid; // durch "|| uuid" ist der Typ sicher string

    if (!window.localStorage.getItem("vog_fp")) {
      window.localStorage.setItem("vog_fp", fp);
    }

    return fp;
  } catch {
    return "fp-unavailable";
  }
}

const baseBtn =
  "px-3 py-1 rounded text-sm border transition disabled:opacity-50 focus:outline-none focus:ring-2 focus:ring-offset-1";

type Props = {
  statementId: string;
  initialSummary?: Summary;
  onAfter?: (value: Val) => void;
  lockAfterVote?: boolean;
  userHash?: string;
};

function VoteButton({
  statementId,
  initialSummary,
  onAfter,
  lockAfterVote = false,
  userHash,
}: Props) {
  const [busy, setBusy] = useState<Val | null>(null);
  const [voted, setVoted] = useState<Val | null>(null);
  const [summary, setSummary] = useState<Summary | undefined>(initialSummary);

  async function cast(value: Val) {
    if (busy) return;
    setBusy(value);

    const prevSummary = summary ? { ...summary } : undefined;
    const prevVote = voted;

    if (summary) {
      const next = { ...summary };
      next[value] += 1;
      if (!lockAfterVote && prevVote && prevVote !== value) {
        next[prevVote] = Math.max(0, next[prevVote] - 1);
      }
      setSummary(next);
    }

    try {
      const fp = ensureFp();
      const headers: Record<string, string> = {
        "Content-Type": "application/json",
        "x-fp": fp,
      };
      if (userHash) headers["x-user-hash"] = userHash;

      const r = await fetch("/api/votes/cast", {
        method: "POST",
        headers,
        body: JSON.stringify({ statementId, value }),
      });

      const j = await r.json().catch(() => ({} as any));
      if (!r.ok || !j?.ok) throw new Error(j?.error || "Vote fehlgeschlagen");

      // SERVER-KONTRAKT: { ok, data: { agree, neutral, disagree }, meta: {...} }
      if (j?.data && typeof j.data === "object") {
        const s = j.data as Partial<Summary>;
        setSummary({
          agree: Number(s.agree ?? 0),
          neutral: Number(s.neutral ?? 0),
          disagree: Number(s.disagree ?? 0),
        });
      }

      setVoted(value);
      onAfter?.(value);
    } catch (e: any) {
      if (prevSummary) setSummary(prevSummary);
      alert(e?.message || "Fehler");
    } finally {
      setBusy(null);
    }
  }

  const disabled = !!busy || (lockAfterVote && !!voted);

  return (
    <div className="flex flex-col gap-2">
      <div role="group" aria-label="Abstimmen" className="flex gap-2">
        <button
          disabled={disabled}
          className={`${baseBtn} border-green-600 text-green-700 hover:bg-green-50`}
          onClick={() => cast("agree")}
          title="Zustimmen"
          aria-busy={busy === "agree"}
          aria-pressed={voted === "agree"}
        >
          {busy === "agree" ? "…" : "Zustimmen"}
        </button>
        <button
          disabled={disabled}
          className={`${baseBtn} border-gray-400 text-gray-700 hover:bg-gray-50`}
          onClick={() => cast("neutral")}
          title="Neutral"
          aria-busy={busy === "neutral"}
          aria-pressed={voted === "neutral"}
        >
          {busy === "neutral" ? "…" : "Neutral"}
        </button>
        <button
          disabled={disabled}
          className={`${baseBtn} border-red-600 text-red-700 hover:bg-red-50`}
          onClick={() => cast("disagree")}
          title="Ablehnen"
          aria-busy={busy === "disagree"}
          aria-pressed={voted === "disagree"}
        >
          {busy === "disagree" ? "…" : "Ablehnen"}
        </button>
      </div>

      {voted && (
        <span className="text-sm text-gray-600">
          Danke für deine Stimme{summary ? "!" : "."}
          {summary && (
            <>
              {" "}
              Aktuelle Stimmen: 👍 {summary.agree} | 🤔 {summary.neutral} | 👎{" "}
              {summary.disagree}
            </>
          )}
        </span>
      )}

      {!voted && summary && (
        <span className="text-xs text-gray-500">
          Aktuell: 👍 {summary.agree} | 🤔 {summary.neutral} | 👎{" "}
          {summary.disagree}
        </span>
      )}
    </div>
  );
}

export default VoteButton;
export { VoteButton };
