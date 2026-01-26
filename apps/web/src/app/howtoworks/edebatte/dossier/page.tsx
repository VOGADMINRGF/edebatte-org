"use client";

import * as React from "react";
import Link from "next/link";
import { useLocale } from "@/context/LocaleContext";
import { resolveLocalizedField } from "@/lib/localization/getLocalizedField";
import { useAutoTranslateText } from "@/lib/i18n/autoTranslate";

const hero = {
  kicker_de: "eDebatte Modul",
  title_de: "Dossier & Faktencheck",
  lead_de:
    "Hier bündeln wir Quellen, prüfen Aussagen und machen Wissensstand, Gegenpositionen und Unsicherheiten transparent – als auditierbare Grundlage für Entscheidungen.",
};

const heroChips = [
  "Quellenlage",
  "Pro & Contra",
  "Unsicherheiten",
  "Evidenz-Graph",
  "Versionierung",
  "Einspruch",
];

const heroImage = {
  src: "/edebattepage_default/dossier/flow_pipeline.svg",
  alt: "Flowchart: Vom Anliegen zum Dossier",
};

const introBlocks = [
  {
    id: "einfach",
    title_de: "Einfach gesagt",
    body_de:
      "Ein Dossier zeigt nicht nur Meinungen. Es zeigt, worauf Aussagen beruhen: Quellen, Gegenpositionen, Kontext – und auch, was (noch) unklar ist.",
  },
  {
    id: "worum",
    title_de: "Worum es geht",
    body_de:
      "eDebatte und eDebatte übersetzen Anliegen aus Alltagssprache in prüfbare Aussagen und klare Fragestellungen. Das Dossier verknüpft diese mit Quellen und Gegenbelegen. So wird sichtbar, worauf eine Entscheidung aufbaut – und wo Daten fehlen.",
  },
  {
    id: "trennung",
    title_de: "Wissenschaftliche Sorgfalt",
    body_de:
      "Wir unterscheiden sichtbar: Tatsachenbehauptung (prüfbar), Interpretation (ableitend), Werturteil (normativ) und offene Frage. So entsteht Klarheit statt Vermischung.",
  },
  {
    id: "warum",
    title_de: "Warum das wichtig ist",
    body_de:
      "Gute Entscheidungen brauchen denselben Wissensstand für alle. Das schützt vor Stimmungsschwankungen, selektiven Fakten und „laut gewinnt“. Minderheitenpositionen bleiben sichtbar.",
  },
];

const visuals = {
  title_de: "So funktioniert es (Visuals)",
  items_de: [
    {
      title: "1) Vom Anliegen zum Dossier",
      body: "Aus einem Anliegen wird eine prüfbare Frage. Quellen und Kontext werden ergänzt. Findings zeigen: stützt, widerspricht oder unklar.",
      imgSrc: "/edebattepage_default/dossier/flow_pipeline.svg",
      imgAlt: "Flowchart: Vom Anliegen zum Dossier",
    },
    {
      title: "2) Evidenz-Graph",
      body: "Der Evidenz-Graph zeigt Verbindungen: Aussage ↔ Quelle ↔ Finding ↔ offene Fragen. Alles ist anklickbar und nachvollziehbar.",
      imgSrc: "/edebattepage_default/dossier/flow_evidence_graph.svg",
      imgAlt: "Grafik: Evidenz-Graph",
    },
    {
      title: "3) Korrekturen & Einspruch",
      body: "Fehler passieren. Wichtig ist: Änderungen sind begründet, versioniert und bleiben sichtbar. Einsprüche werden dokumentiert.",
      imgSrc: "/edebattepage_default/dossier/flow_corrections.svg",
      imgAlt: "Flowchart: Korrektur und Einspruch",
    },
    {
      title: "4) Evidenz-Indikator (optional)",
      body: "Wenn wir ein Signal anzeigen, dann mit Rubrik und Begründung. Kein „Wahrheits-Score“, sondern ein erklärtes Indiz.",
      imgSrc: "/edebattepage_default/dossier/flow_rubric.svg",
      imgAlt: "Grafik: Evidenz-Indikator",
    },
  ],
};

const features = {
  title_de: "Funktionen im Überblick",
  items_de: [
    "Aussagen aus Alltagssprache in klare, prüfbare Fragestellungen überführen (Begriffe, Messgrößen, Geltungsbereich).",
    "Quellen sammeln, typisieren und mit Kontext markieren (Zeit, Ort, Zielgruppe, Annahmen).",
    "Pro/Contra sichtbar machen; Gegenpositionen nicht ausblenden; Minderheitenargumente dokumentieren.",
    "Unsicherheiten und Datenlücken explizit markieren („unklar“ ist ein Ergebnis).",
    "Evidenz-Graph verknüpft Aussagen, Quellen, Gegenbelege und offene Fragen.",
    "Korrekturen, Einsprüche und Entscheidungen nachvollziehbar versionieren (Audit-Trail).",
    "Exporte (CSV/JSON) und Einbettungen für Redaktion, Verbände und Mitgliederportale.",
  ],
};

const outputs = {
  title_de: "Ergebnisse & Nutzen",
  items_de: [
    "Auditierbares Dossier mit Quellenlage, Kontext, Pro/Contra und sichtbaren Unsicherheiten.",
    "Schneller Überblick über Konsens, Streitpunkte, offene Fragen und Datenlücken.",
    "Nachvollziehbare Grundlage für Abstimmung, Mandat und Umsetzung (ohne Scheinsicherheit).",
    "Redaktionell nutzbares Material für Beiträge, Dossiers, Podcasts oder Streams.",
  ],
};

const safeguards = {
  title_de: "Qualität & Fairness-Regeln",
  items_de: [
    "Quellenpflicht und transparente Verweise statt Behauptungen ohne Beleg.",
    "Gegenpositionen werden sichtbar gemacht; Gewichtung orientiert sich an Nachprüfbarkeit und Evidenz.",
    "Korrekturen bleiben nachvollziehbar (Änderungsprotokoll); nichts verschwindet heimlich.",
    "Interessenkonflikte können kenntlich gemacht werden (z. B. Stakeholder-Material).",
    "KI kann Vorschläge strukturieren; Freigaben und Streitentscheidungen bleiben begründet und auditierbar.",
  ],
};

const example = {
  title_de: "Mini-Beispiel: So sieht ein Dossier aus",
  body_de:
    "Sichere Radwege: Ein Verein sammelt Quellen zu Unfallzahlen, Alternativen und Kosten. Journalist:innen prüfen Belege, markieren Datenlücken und unterschiedliche Messmethoden. Das Dossier zeigt Pro/Contra, Minderheitenargumente und offene Fragen – als saubere Basis für die Abstimmung.",
};

const roadmap = {
  id: "roadmap",
  title_de: "Was als Nächstes kommt (Level 2/3)",
  title_en: "What’s next (Level 2/3)",
  body_de:
    "Ziel ist Level 3 und darüber hinaus: Dossiers sollen als belastbare Arbeitsgrundlage dienen – für Öffentlichkeit, Redaktionen und Entscheidungsträger. Transparent, nachvollziehbar und zitierfähig.",
  body_en:
    "Goal: Level 3 and beyond — dossiers should serve as a robust working base for the public, newsrooms, and decision makers. Transparent, traceable, and citable.",
  items: [
    {
      id: "level-2",
      label_de:
        "Level 2: Quellen-Snapshots, Zitat-Locator, Editorial-Inbox, Watchlists & Updates, semantische Suche.",
      label_en:
        "Level 2: source snapshots, quote locator, editorial inbox, watchlists & updates, semantic search.",
      status_de: "geplant",
      status_en: "planned",
    },
    {
      id: "level-3",
      label_de:
        "Level 3: Signierte Exporte, Provenienz-Nachweise, Methoden-Checklisten für Studien, Mehrsprachigkeit, CMS-Embeds, Journalist:innen-API.",
      label_en:
        "Level 3: signed exports, provenance proofs, methods checklists for studies, multilingual, CMS embeds, journalist API.",
      status_de: "geplant",
      status_en: "planned",
    },
  ],
};

export default function DossierPage() {
  const { locale } = useLocale();
  const t = useAutoTranslateText({ locale, namespace: "howtoworks-dossier" });
  const text = React.useCallback(
    (entry: Record<string, any>, key: string) => {
      const base = resolveLocalizedField(entry, key, locale);
      const hint = entry?.id ? `${entry.id}.${key}` : key;
      return t(base, hint);
    },
    [locale, t],
  );
  const sectionTitleClass =
    "text-base font-semibold text-transparent bg-clip-text bg-gradient-to-r from-sky-800 via-cyan-700 to-teal-700";

  return (
    <main className="min-h-screen bg-gradient-to-b from-[var(--brand-from)] via-white to-white pb-16">
      <section className="mx-auto max-w-5xl px-4 py-16 space-y-10">
        <header className="space-y-4">
          <p className="text-xs font-semibold uppercase tracking-wide text-sky-700">
            {text(hero, "kicker")}
          </p>
          <h1 className="headline-grad text-4xl font-extrabold leading-tight">
            {text(hero, "title")}
          </h1>
          <p className="text-lg text-slate-700">{text(hero, "lead")}</p>

          <div className="flex flex-wrap gap-2 text-xs font-medium text-slate-700">
            {heroChips.map((chip, idx) => (
              <span
                key={chip}
                className="rounded-full border px-3 py-1 shadow-sm"
                style={{ borderColor: "var(--chip-border)", background: "rgba(14,165,233,0.08)" }}
              >
                {t(chip, `heroChip.${idx}`)}
              </span>
            ))}
          </div>

          <div className="flex flex-wrap gap-3">
            <Link href="/howtoworks/edebatte#rolle-vereine" className="btn btn-primary">
              {t("Zur Rolle Vereine & Journalist:innen", "cta.role")}
            </Link>
            <Link href="/howtoworks/edebatte/abstimmen" className="btn btn-ghost">
              {t("Weiter zu Abstimmen & Ergebnis", "cta.vote")}
            </Link>
          </div>
        </header>

        <div className="overflow-hidden rounded-3xl border border-slate-200 bg-white/90 shadow-sm">
          <div className="aspect-[16/9]">
            <img
              src={heroImage.src}
              alt={t(heroImage.alt, "hero.imageAlt")}
              className="h-full w-full object-cover"
              loading="lazy"
            />
          </div>
        </div>

        <section className="grid gap-4 md:grid-cols-2">
          {introBlocks.map((block) => (
            <article key={block.id} className="rounded-2xl border border-slate-200 bg-white/90 p-4 shadow-sm">
              <h2 className={sectionTitleClass}>{text(block, "title")}</h2>
              <p className="mt-2 text-sm text-slate-700">{text(block, "body")}</p>
            </article>
          ))}
        </section>

        <section className="space-y-3">
          <h2 className={sectionTitleClass}>{text(visuals, "title")}</h2>
          <div className="grid gap-4 md:grid-cols-2">
            {visuals.items_de.map((v, idx) => (
              <article key={v.title} className="rounded-2xl border border-slate-200 bg-white/90 p-4 shadow-sm">
                <div className="overflow-hidden rounded-xl border border-slate-200 bg-white">
                  <img
                    src={v.imgSrc}
                    alt={t(v.imgAlt, `visuals.${idx}.alt`)}
                    className="h-auto w-full"
                    loading="lazy"
                  />
                </div>
                <h3 className="mt-3 text-sm font-semibold text-slate-900">
                  {t(v.title, `visuals.${idx}.title`)}
                </h3>
                <p className="mt-1 text-sm text-slate-700">
                  {t(v.body, `visuals.${idx}.body`)}
                </p>
              </article>
            ))}
          </div>
        </section>

        <section className="grid gap-4 md:grid-cols-2">
          <article className="rounded-2xl border border-slate-200 bg-white/90 p-4 shadow-sm">
            <h2 className={sectionTitleClass}>{text(features, "title")}</h2>
            <ul className="mt-3 list-disc space-y-1 pl-5 text-sm text-slate-700">
              {features.items_de.map((item, idx) => (
                <li key={item}>{t(item, `features.${idx}`)}</li>
              ))}
            </ul>
          </article>
          <article className="rounded-2xl border border-slate-200 bg-white/90 p-4 shadow-sm">
            <h2 className={sectionTitleClass}>{text(outputs, "title")}</h2>
            <ul className="mt-3 list-disc space-y-1 pl-5 text-sm text-slate-700">
              {outputs.items_de.map((item, idx) => (
                <li key={item}>{t(item, `outputs.${idx}`)}</li>
              ))}
            </ul>
          </article>
        </section>

        <section className="grid gap-4 md:grid-cols-2">
          <article className="rounded-2xl border border-slate-200 bg-white/90 p-4 shadow-sm">
            <h2 className={sectionTitleClass}>{text(safeguards, "title")}</h2>
            <ul className="mt-3 list-disc space-y-1 pl-5 text-sm text-slate-700">
              {safeguards.items_de.map((item, idx) => (
                <li key={item}>{t(item, `safeguards.${idx}`)}</li>
              ))}
            </ul>
          </article>
          <article className="rounded-2xl border border-slate-200 bg-white/90 p-4 shadow-sm">
            <h2 className={sectionTitleClass}>{text(example, "title")}</h2>
            <p className="mt-2 text-sm text-slate-700">{text(example, "body")}</p>

            <div className="mt-4 rounded-xl border border-slate-200 bg-slate-50 p-3 text-xs text-slate-600">
              {t(
                "Hinweis: Ein Dossier ist kein Wahrheitsurteil. Es zeigt transparent, was belegt ist – und was noch offen bleibt.",
                "note.dossier",
              )}
            </div>
          </article>
        </section>

        <section className="rounded-2xl border border-slate-200 bg-white/90 p-4 shadow-sm">
          <h2 className={sectionTitleClass}>{text(roadmap, "title")}</h2>
          <p className="mt-2 text-sm text-slate-700">{text(roadmap, "body")}</p>
          <ul className="mt-3 list-disc space-y-1 pl-5 text-sm text-slate-700">
            {roadmap.items.map((item) => (
              <li key={item.id}>
                <span>{text(item, "label")}</span>
                <span className="ml-2 inline-flex items-center rounded-full border border-sky-200 bg-sky-50 px-2 py-0.5 text-[10px] font-semibold uppercase tracking-wide text-sky-700">
                  {text(item, "status")}
                </span>
              </li>
            ))}
          </ul>
        </section>
      </section>
    </main>
  );
}
