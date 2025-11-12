"use client";

import { useState } from "react";
import { colors } from "../theme";

const faqTabs = [
  {
    label: "Was ist VoiceOpenGov?",
    content: (
      <p>
        VoiceOpenGov ist eine unabhängige Beteiligungsplattform, die echte
        Mitbestimmung, Transparenz und nachvollziehbare Entscheidungen für alle
        Menschen ermöglicht – digital, datenschutzfreundlich, ohne
        Parteienzwang.
      </p>
    ),
  },
  {
    label: "Wie funktioniert die Abstimmung?",
    content: (
      <p>
        Jeder kann Anliegen einbringen, Kernbotschaften zustimmen oder ablehnen.
        Die Auswertung ist jederzeit live einsehbar, anonym und repräsentativ.
      </p>
    ),
  },
  {
    label: "Wer kann mitmachen?",
    content: (
      <p>
        Alle! Egal ob Bürger:in, Verein, Unternehmen, NGO oder Verwaltung –
        Beteiligung ist offen für jede Person und Gruppe.
      </p>
    ),
  },
];

export function FAQTabs() {
  const [tab, setTab] = useState(0);
  return (
    <section className="mb-10">
      <div className="flex gap-2 justify-center mb-4 flex-wrap">
        {faqTabs.map((item, idx) => (
          <button
            key={item.label}
            onClick={() => setTab(idx)}
            className={`px-4 py-2 rounded-full font-semibold
              ${tab === idx ? "bg-coral text-white shadow" : "bg-gray-50 text-coral border border-coral"}
              transition`}
            style={{ minWidth: 170 }}
            aria-selected={tab === idx}
          >
            {item.label}
          </button>
        ))}
      </div>
      <div className="bg-white p-6 rounded-xl shadow border border-coral text-gray-800 min-h-[80px]">
        {faqTabs[tab].content}
      </div>
    </section>
  );
}
