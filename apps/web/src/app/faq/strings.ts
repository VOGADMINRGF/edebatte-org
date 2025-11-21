"use client";

import { DEFAULT_LOCALE, type SupportedLocale } from "@/config/locales";

type LocaleString = Record<"de", string> & Partial<Record<SupportedLocale, string>>;

const TABS = [
  {
    label: {
      de: "Was ist VoiceOpenGov?",
    } as LocaleString,
    body: {
      de: "VoiceOpenGov ist eine unabhängige Beteiligungsplattform, die echte Mitbestimmung, Transparenz und nachvollziehbare Entscheidungen für alle Menschen ermöglicht – digital, datenschutzfreundlich, ohne Parteienzwang.",
    } as LocaleString,
  },
  {
    label: {
      de: "Wie funktioniert die Abstimmung?",
    } as LocaleString,
    body: {
      de: "Jeder kann Anliegen einbringen, Kernbotschaften zustimmen oder ablehnen. Die Auswertung ist jederzeit live einsehbar, anonym und repräsentativ.",
    } as LocaleString,
  },
  {
    label: {
      de: "Wer kann mitmachen?",
    } as LocaleString,
    body: {
      de: "Alle! Egal ob Bürger:in, Verein, Unternehmen, NGO oder Verwaltung – Beteiligung ist offen für jede Person und Gruppe.",
    } as LocaleString,
  },
] as const;

function pick(entry: LocaleString, locale: SupportedLocale | string): string {
  const normalized = (locale || DEFAULT_LOCALE) as SupportedLocale;
  return entry[normalized] ?? entry.de;
}

export function getFaqTabs(locale: SupportedLocale | string) {
  return TABS.map((tab) => ({
    label: pick(tab.label, locale),
    body: pick(tab.body, locale),
  }));
}
