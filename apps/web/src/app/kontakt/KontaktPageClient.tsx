"use client";

import Link from "next/link";
import { BRAND } from "@/lib/brand";
import { useLocale } from "@/context/LocaleContext";
import { useAutoTranslateText } from "@/lib/i18n/autoTranslate";
import type { HumanChallenge } from "@/lib/spam/humanChallenge";
import KontaktForm from "./KontaktForm";

type Props = {
  sent: boolean;
  error?: string;
  challenge: HumanChallenge;
  professionalOfferLabel?: string;
};

export default function KontaktPageClient({
  sent,
  error,
  challenge,
  professionalOfferLabel,
}: Props) {
  const { locale } = useLocale();
  const t = useAutoTranslateText({ locale, namespace: "kontakt-page" });

  return (
    <main className="min-h-screen bg-[rgb(var(--bg))] pb-16">
      <section className="mx-auto max-w-5xl px-4 pt-14">
        <div className="rounded-3xl bg-[rgb(var(--card))] p-6 shadow-[0_24px_70px_rgba(15,23,42,0.08)] ring-1 ring-[rgb(var(--border))] md:p-10">
          <header className="space-y-3 text-center">
            <p className="text-xs font-semibold uppercase tracking-[0.2em] text-sky-600">
              {t("Kontakt & Support", "kicker")}
            </p>
            <h1 className="headline-grad text-3xl font-extrabold leading-tight md:text-4xl">
              {professionalOfferLabel
                ? t("Lass uns über deinen Pilot sprechen.", "professional.title")
                : t("Der schnellste Weg zu uns.", "title")}
            </h1>
            <p className="text-sm leading-relaxed text-[rgb(var(--muted))] md:text-base">
              {professionalOfferLabel
                ? t(
                    `Du interessierst dich für ${professionalOfferLabel}. Schreib uns kurz, welches Thema oder welchen Einsatz du im Blick hast.`,
                    "professional.lead",
                  )
                : t("Per Formular oder direkt per E-Mail.", "lead")}
            </p>
          </header>

          <section className="mt-8 rounded-2xl border border-[rgb(var(--border))] bg-[rgb(var(--bg))] p-5 text-sm text-[rgb(var(--fg))]">
            <div className="grid gap-4 md:grid-cols-2 md:items-start">
              <div className="space-y-1">
                <p>
                  <span className="font-semibold">{t("E-Mail:", "email.label")}</span>{" "}
                  <a
                    href={`mailto:${BRAND.contactEmail}`}
                    className="font-semibold text-sky-700 underline underline-offset-4"
                  >
                    {BRAND.contactEmail}
                  </a>
                </p>
                <p>{t("Direkt an das eDebatte-Team", "email.direct")}</p>
                <p className="text-xs text-[rgb(var(--muted))]">
                  {t("Anfragen versuchen wir binnen von 24 Stunden zu beantworten.", "email.sla")}
                </p>
              </div>

              <div className="space-y-1 md:text-right">
                <p className="font-semibold text-[rgb(var(--fg))]">
                  {t("Ladungsfähige Anschrift", "address.title")}
                </p>
                <p className="leading-relaxed text-[rgb(var(--muted))]">
                  {t("Siehe", "address.see")}{" "}
                  <Link
                    href="/impressum"
                    className="font-semibold text-sky-700 underline underline-offset-4"
                  >
                    {t("Impressum", "address.impressum")}
                  </Link>
                  .
                </p>
                <p className="mt-1 text-[11px] text-[rgb(var(--muted))]">
                  {t("Weitere Angaben findest du im Impressum.", "address.note")}
                </p>
              </div>
            </div>
          </section>

          <KontaktForm sent={sent} error={error} challenge={challenge} />

          <div className="mt-6 text-center text-xs text-[rgb(var(--muted))]">
            {t(
              "Sollte das Formular einmal nicht funktionieren, erreichst du uns jederzeit unter",
              "fallback.copy",
            )}{" "}
            <a
              href={`mailto:${BRAND.contactEmail}`}
              className="font-semibold text-sky-700 underline underline-offset-4"
            >
              {BRAND.contactEmail}
            </a>
            .
          </div>
        </div>
      </section>
    </main>
  );
}
