import type { Metadata } from "next";
import Link from "next/link";
import FrontendAiTransparencyPanel from "@/features/create/FrontendAiTransparencyPanel";
import { buildRundenFrontendAiTransparencyReadModel } from "@/features/create/frontendAiTransparency";
import { readManualAnlassraumServerDraftForCurrentUser } from "@/features/surfaces/runden/manualAnlassraumServerDraft";
import { readRundenEntryCanonReadModel } from "@/features/surfaces/runden/rundenEntryCanon";
import AnlassraumSetupForm from "./AnlassraumSetupForm";
import GuidedBallotStart from "./GuidedBallotStart";

export const metadata: Metadata = {
  title: "Kostenlose Abstimmung starten - eDebatte",
  description: "Stelle eine Frage, lege Antworten fest und bereite deine Abstimmung in wenigen Schritten vor.",
};

type SearchParamsShape = Promise<Record<string, string | string[] | undefined>> | Record<string, string | string[] | undefined>;
function readParam(value?: string | string[]) { return Array.isArray(value) ? value[0] : value; }

export default async function RundenManualCreatePage(props: { searchParams?: SearchParamsShape }) {
  const resolved = props.searchParams ? await props.searchParams : undefined;
  const conversionMode = readParam(resolved?.gtm) === "1";
  const detailsMode = readParam(resolved?.details) === "1";
  const initialTemplateId = readParam(resolved?.template) ?? null;
  const initialServerDraft = await readManualAnlassraumServerDraftForCurrentUser(readParam(resolved?.draftId));
  const showGuidedStart = conversionMode && !detailsMode && !initialServerDraft;
  const entryCanon = readRundenEntryCanonReadModel();
  const frontendAiTransparency = buildRundenFrontendAiTransparencyReadModel(entryCanon, initialServerDraft);

  if (showGuidedStart) {
    return <section className="public-canvas vog-page-stage min-h-screen"><main className="public-shell vog-main-shell min-h-screen"><div className="mx-auto mb-10 flex w-full max-w-3xl items-center justify-between gap-3"><Link href="/" className="text-sm font-bold text-[rgb(var(--muted))] hover:text-[rgb(var(--fg))]">← eDebatte</Link><span className="text-xs font-black uppercase tracking-[0.16em] text-cyan-700 dark:text-cyan-300">Kostenlos starten</span></div><GuidedBallotStart initialTemplateId={initialTemplateId} /></main></section>;
  }

  if (conversionMode) {
    return <section className="public-canvas vog-page-stage min-h-screen"><main className="public-shell vog-main-shell min-h-screen"><div className="mx-auto w-full max-w-3xl"><Link href="/runden/new?gtm=1" className="text-sm font-bold text-[rgb(var(--muted))] hover:text-[rgb(var(--fg))]">← Zur einfachen Ansicht</Link><div className="mt-7 rounded-[2rem] border border-[rgb(var(--border))] p-6 sm:p-8"><p className="text-xs font-black uppercase tracking-[0.16em] text-cyan-700 dark:text-cyan-300">Bereit zum Teilen</p><h1 className="mt-3 text-3xl font-black tracking-tight text-[rgb(var(--fg))] sm:text-4xl">Deine Befragung steht.</h1><div className="mt-7 divide-y divide-[rgb(var(--border))] border-y border-[rgb(var(--border))]"><p className="flex justify-between gap-4 py-4 text-sm"><span>Frage & Antworten</span><strong>✓ vorbereitet</strong></p><p className="flex justify-between gap-4 py-4 text-sm"><span>Voxy</span><strong>✓ gewählt</strong></p><p className="flex justify-between gap-4 py-4 text-sm"><span>Sichtbarkeit</span><strong>privat bis zur Freigabe</strong></p></div><p className="mt-6 text-sm leading-6 text-[rgb(var(--muted))]">Nach dem Speichern erhältst du den Teilnahmelink und den echten QR-Code. Nichts wird automatisch veröffentlicht.</p></div><details className="mt-5 rounded-2xl border border-[rgb(var(--border))] bg-[rgb(var(--surface))]"><summary className="cursor-pointer list-none px-5 py-4 font-black text-[rgb(var(--fg))]">Weitere Einstellungen <span className="ml-2 text-[rgb(var(--muted))]">▾</span></summary><div className="border-t border-[rgb(var(--border))] p-4 sm:p-6"><p className="mb-5 text-sm leading-6 text-[rgb(var(--muted))]">Nur öffnen, wenn du Sichtbarkeit, Moderation, KI-Unterstützung oder den erweiterten Ablauf verändern möchtest.</p><AnlassraumSetupForm conversionMode initialServerDraft={initialServerDraft} initialTemplateId={initialTemplateId} /></div></details></div></main></section>;
  }

  return <section className="public-canvas vog-page-stage min-h-screen"><main className="public-shell vog-main-shell min-h-screen space-y-6"><div className="mx-auto flex w-full max-w-[78rem] flex-wrap items-center justify-between gap-3"><div><p className="text-xs font-semibold uppercase tracking-[0.16em] text-[rgb(var(--muted))]">Erweiterte Einstellungen</p><h1 className="mt-1 text-3xl font-semibold tracking-tight text-[rgb(var(--fg))] md:text-4xl">Deine Frage im Detail vorbereiten</h1><p className="mt-2 max-w-2xl text-sm leading-6 text-[rgb(var(--muted))]">Hier kannst du zusätzliche Einstellungen festlegen. Für einen schnellen Start reicht die einfache Ansicht.</p></div><div className="flex flex-wrap gap-2"><Link href="/runden/new?gtm=1" className="vog-btn-brand">Zur einfachen Ansicht</Link><Link href="/themen" className="vog-btn-secondary">Themen ansehen</Link></div></div><details className="mx-auto w-full max-w-[78rem] rounded-2xl border border-[rgb(var(--border))] bg-[rgb(var(--card))]"><summary className="cursor-pointer list-none px-5 py-4 font-semibold text-[rgb(var(--fg))]">Wie KI dich dabei unterstützt <span className="ml-2 text-[rgb(var(--muted))]">▾</span></summary><div className="border-t border-[rgb(var(--border))] p-4 sm:p-6"><FrontendAiTransparencyPanel model={frontendAiTransparency} /></div></details><AnlassraumSetupForm conversionMode={false} initialServerDraft={initialServerDraft} initialTemplateId={initialTemplateId} /></main></section>;
}
