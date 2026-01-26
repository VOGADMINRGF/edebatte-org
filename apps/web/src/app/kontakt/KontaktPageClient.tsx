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
};

export default function KontaktPageClient({ sent, error, challenge }: Props) {
  const { locale } = useLocale();
  const t = useAutoTranslateText({ locale, namespace: "kontakt-page" });

  return (
    <main className="min-h-screen bg-gradient-to-b from-[var(--brand-from)] via-white to-white pb-16">
      <section className="mx-auto max-w-5xl px-4 pt-14">
        <div className="rounded-3xl bg-white/90 p-6 shadow-[0_24px_70px_rgba(15,23,42,0.08)] ring-1 ring-slate-100 md:p-10">
          <header className="space-y-3 text-center">
            <p className="text-xs font-semibold uppercase tracking-[0.2em] text-sky-600">
              {t("Kontakt & Support", "kicker")}
            </p>
            <h1 className="headline-grad text-3xl font-extrabold leading-tight md:text-4xl">
              {t("Der schnellste Weg zu uns.", "title")}
            </h1>
            <p className="text-sm leading-relaxed text-slate-600 md:text-base">
              {t("Per Formular oder direkt per E-Mail.", "lead")}
            </p>
          </header>

          <section className="mt-8 rounded-2xl border border-slate-100 bg-slate-50/70 p-5 text-sm text-slate-800">
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
                <p className="text-xs text-slate-600">
                  {t("Anfragen versuchen wir binnen von 24 Stunden zu beantworten.", "email.sla")}
                </p>
              </div>

              <div className="space-y-1 md:text-right">
                <p className="font-semibold text-slate-900">
                  {t("Ladungsfähige Anschrift", "address.title")}
                </p>
                <p className="leading-relaxed text-slate-700">
                  {t("Siehe", "address.see")}{" "}
                  <Link
                    href="/impressum"
                    className="font-semibold text-sky-700 underline underline-offset-4"
                  >
                    {t("Impressum", "address.impressum")}
                  </Link>
                  .
                </p>
                <p className="mt-1 text-[11px] text-slate-500">
                  {t("Weitere Angaben findest du im Impressum.", "address.note")}
                </p>
              </div>
            </div>
          </section>

          <KontaktForm sent={sent} error={error} challenge={challenge} />

          <div className="mt-6 text-center text-xs text-slate-500">
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
