"use client";

import { DEFAULT_LOCALE, type SupportedLocale } from "@/config/locales";

type LocaleString = Record<"de", string> & Partial<Record<SupportedLocale, string>>;

const TABS = [
  {
    label: {
      de: "Was ist eDebatte?",
    } as LocaleString,
    body: {
      de: "eDebatte ist die direktdemokratische Bewegung. Wir heißen alle willkommen, die das Mehrheitsprinzip stärken und an eine gerechtere Welt glauben. eDebatte ist unser eigens entwickeltes Werkzeug.",
    } as LocaleString,
  },
  {
    label: {
      de: "Wie funktioniert die Abstimmung?",
    } as LocaleString,
    body: {
      de: "In eDebatte werden Anliegen vorbereitet, diskutiert und abgestimmt. Ergebnisse, Quoren und Prüfprotokolle bleiben transparent, anonym und nachvollziehbar.",
    } as LocaleString,
  },
  {
    label: {
      de: "Wer kann mitmachen?",
    } as LocaleString,
    body: {
      de: "Alle! Egal ob Bürger:in, Verein, Unternehmen, NGO oder Verwaltung – wir freuen uns über jedes Interesse an fairer, direktdemokratischer Teilhabe.",
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
