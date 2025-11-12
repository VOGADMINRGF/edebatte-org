"use client";
import * as React from "react";
import type { SwipeCard, SwipeChoice } from "@features/swipe/types/swipe";

const demo: SwipeCard[] = [
  { id: "s1", question: "Soll Social-Media automatisch beleidigende Kommentare ausblenden?", sachverhalt: "Moderation", zustaendigkeit: "Bund", tags:["Digitale Räume"], evidenceCount: 4 },
  { id: "s2", question: "Brauchen Pflegekräfte bundesweit einheitliche Personalstandards?", sachverhalt: "Pflege", zustaendigkeit: "Bund", tags:["Gesundheit"], evidenceCount: 3 },
  { id: "s3", question: "Soll der ÖPNV bis 2030 in Städten gebührenfrei werden?", sachverhalt: "Mobilität", zustaendigkeit: "Kommune", tags:["Klima","Städte"], evidenceCount: 5 },
];

function Pill({ children }: { children: React.ReactNode }) {
  return <span className="rounded-full px-2 py-0.5 text-xs bg-white/70">{children}</span>;
}

export default function SwipesPage() {
  const [votes, setVotes] = React.useState<Record<string, SwipeChoice>>({});

  function setVote(id: string, v: SwipeChoice) {
    setVotes((s) => ({ ...s, [id]: v }));
  }

  return (
    <div className="mx-auto max-w-6xl px-4 py-10">
      <div className="glass p-6">
        <h1 className="text-3xl sm:text-4xl font-extrabold tracking-tight">
          <span className="bg-gradient-to-r from-[#06b6d4] to-[#2196F3] bg-clip-text text-transparent">Swipes</span>{" "}
          – schnelle, faire Entscheidungen.
        </h1>
        <p className="mt-3 text-neutral-700">
          Links/rechts entscheiden, Quellen prüfen, später vertiefen – die Karten können aus deinen Analysen
          oder aktuellen Themen gespeist werden.
        </p>
      </div>

      <div className="mt-6 grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
        {demo.map((c) => (
          <article key={c.id} className="glass-sm p-4">
            <div className="text-base font-semibold leading-snug">{c.question}</div>
            <div className="mt-1 text-sm text-neutral-700">{c.sachverhalt ?? "—"}</div>
            <div className="mt-2 flex flex-wrap items-center gap-2 text-xs">
              <Pill>Zuständigkeit: {c.zustaendigkeit ?? "-"}</Pill>
              {c.tags?.slice(0,3).map((t) => <Pill key={t}>{t}</Pill>)}
              {typeof c.evidenceCount === "number" && <Pill>Belege: {c.evidenceCount}</Pill>}
            </div>
            <div className="mt-3 flex gap-2">
              <button
                className={`btn ${votes[c.id]==="agree" ? "btn-grad" : "btn-ghost"}`}
                onClick={() => setVote(c.id, "agree")}
              >
                Zustimmen
              </button>
              <button
                className={`btn ${votes[c.id]==="neutral" ? "btn-grad" : "btn-ghost"}`}
                onClick={() => setVote(c.id, "neutral")}
              >
                Neutral
              </button>
              <button
                className={`btn ${votes[c.id]==="disagree" ? "btn-grad" : "btn-ghost"}`}
                onClick={() => setVote(c.id, "disagree")}
              >
                Ablehnen
              </button>
            </div>
          </article>
        ))}
      </div>
    </div>
  );
}
