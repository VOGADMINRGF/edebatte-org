"use client";

import Link from "next/link";
import { useLocale } from "@/context/LocaleContext";
import { useAutoTranslateText } from "@/lib/i18n/autoTranslate";

const CONTACT_EMAIL = "kontakt@edebatte.org";
const VERSION = "16.09.2026";

export default function WiderrufPage() {
  const { locale } = useLocale();
  const t = useAutoTranslateText({ locale, namespace: "widerruf" });

  return (
    <main className="min-h-screen bg-[rgb(var(--bg))] pb-16">
      <section className="mx-auto max-w-5xl px-4 pt-14">
        <div className="rounded-3xl bg-[rgb(var(--card))] p-6 shadow-[0_24px_70px_rgba(15,23,42,0.08)] ring-1 ring-[rgb(var(--border))] md:p-10">
          <header className="space-y-3 text-center">
            <p className="text-xs font-semibold uppercase tracking-[0.2em] text-sky-600">{t("Rechtliches", "kicker")}</p>
            <h1 className="text-3xl font-extrabold leading-tight text-[rgb(var(--fg))] md:text-4xl">{t("Widerrufsbelehrung", "title")}</h1>
            <p className="text-sm leading-relaxed text-[rgb(var(--muted))] md:text-base">
              {t("Diese Belehrung gilt für Verbraucherinnen und Verbraucher, soweit für den jeweiligen Fernabsatzvertrag ein gesetzliches Widerrufsrecht besteht.", "lead")}
            </p>
            <p className="text-xs text-[rgb(var(--muted))]">{t(`Stand: ${VERSION}. Rechtlich maßgeblich ist die deutsche Fassung.`, "version")}</p>
          </header>

          <div className="mt-8 grid gap-4">
            <InfoCard
              title={t("Widerrufsrecht", "right.title")}
              body={t(
                "Du hast das Recht, einen vom gesetzlichen Widerrufsrecht erfassten Vertrag innerhalb von 14 Tagen ohne Angabe von Gründen zu widerrufen. Die Widerrufsfrist beträgt 14 Tage ab dem Tag des Vertragsschlusses, soweit gesetzlich nichts anderes bestimmt ist.",
                "right.body",
              )}
            />

            <InfoCard
              title={t("So übst du den Widerruf aus", "exercise.title")}
              body={t(
                "Um dein Widerrufsrecht auszuüben, musst du uns mit einer eindeutigen Erklärung über deinen Entschluss informieren. Eine E-Mail an kontakt@edebatte.org genügt. Du kannst auch das unten stehende Muster-Widerrufsformular verwenden; vorgeschrieben ist dieses Formular nicht. Zur Wahrung der Frist genügt die rechtzeitige Absendung der Widerrufserklärung.",
                "exercise.body",
              )}
            />

            <div className="rounded-2xl border border-[rgb(var(--border))] bg-[rgb(var(--bg))] p-4 text-sm text-[rgb(var(--fg))]">
              <p className="font-semibold">{t("Empfänger des Widerrufs", "recipient.title")}</p>
              <p className="mt-2 whitespace-pre-line leading-relaxed text-[rgb(var(--muted))]">
                {t(
                  "Ricky G. Fleischer\nVoiceOpenGov / eDebatte\nClara-Müller-Jahnke-Str. 41\n12589 Berlin\nDeutschland\nE-Mail: kontakt@edebatte.org",
                  "recipient.body",
                )}
              </p>
            </div>

            <InfoCard
              title={t("Folgen des Widerrufs", "effects.title")}
              body={t(
                "Wenn du einen wirksamen Widerruf erklärst, erstatten wir die von dir für den widerrufenen Vertrag erhaltenen Zahlungen nach den gesetzlichen Vorgaben, grundsätzlich spätestens innerhalb von 14 Tagen ab Eingang deiner Widerrufserklärung. Für die Rückzahlung verwenden wir grundsätzlich dasselbe Zahlungsmittel, das du bei der ursprünglichen Zahlung eingesetzt hast, sofern nicht ausdrücklich etwas anderes vereinbart wurde und dir dadurch keine Kosten entstehen.",
                "effects.body",
              )}
            />

            <InfoCard
              title={t("Beginn der Leistung während der Widerrufsfrist", "service.title")}
              body={t(
                "Wenn du ausdrücklich verlangst, dass eine entgeltliche Dienstleistung bereits während der Widerrufsfrist beginnt, kann im Fall eines späteren Widerrufs unter den gesetzlichen Voraussetzungen Wertersatz für die bis zum Widerruf bereits erbrachten Leistungen geschuldet sein. Ob und in welchem Umfang das gilt, richtet sich nach den gesetzlichen Voraussetzungen des konkreten Vertrags.",
                "service.body",
              )}
            />

            <InfoCard
              title={t("Kündigung ist etwas anderes als Widerruf", "cancel.title")}
              body={t(
                "Der Widerruf betrifft den Vertragsschluss innerhalb der gesetzlichen Widerrufsfrist. Eine normale Kündigung beendet ein laufendes monatliches Paket zum Ende des jeweiligen Abrechnungszeitraums. Die Kündigung kannst du über die bereitgestellte Kontoverwaltung beziehungsweise das Zahlungsportal, soweit freigeschaltet, oder per E-Mail an kontakt@edebatte.org erklären.",
                "cancel.body",
              )}
            />

            <div className="rounded-2xl border border-sky-200 bg-sky-50 p-5 text-sm text-sky-950">
              <h2 className="font-semibold">{t("Muster-Widerrufsformular", "form.title")}</h2>
              <p className="mt-2 text-xs leading-relaxed">{t("Wenn du den Vertrag widerrufen willst, kannst du folgenden Text verwenden und an uns senden:", "form.intro")}</p>
              <pre className="mt-4 whitespace-pre-wrap rounded-xl bg-white/70 p-4 font-sans text-sm leading-relaxed text-sky-950">{t(
`An:
Ricky G. Fleischer
VoiceOpenGov / eDebatte
Clara-Müller-Jahnke-Str. 41
12589 Berlin
E-Mail: kontakt@edebatte.org

Hiermit widerrufe ich den von mir abgeschlossenen Vertrag über die Erbringung der folgenden Dienstleistung:

________________________________________

Bestellt am: ___________________________
Name: __________________________________
Anschrift: ______________________________
E-Mail: _________________________________
Datum: __________________________________
Unterschrift (nur bei Erklärung auf Papier): __________________`,
                "form.template",
              )}</pre>
            </div>

            <div className="grid gap-3 md:grid-cols-3">
              <LinkCard href="/agb" label={t("AGB", "links.agb")} />
              <LinkCard href="/datenschutz" label={t("Datenschutz", "links.privacy")} />
              <LinkCard href="/impressum" label={t("Impressum", "links.imprint")} />
            </div>

            <div className="rounded-2xl border border-[rgb(var(--border))] bg-[rgb(var(--card))] p-4 text-sm text-[rgb(var(--fg))] shadow-sm">
              <p className="text-xs font-semibold uppercase tracking-wide text-[rgb(var(--muted))]">{t("Kontakt", "contact.title")}</p>
              <p className="mt-2">{t("Fragen zum Widerruf? Schreib uns:", "contact.body")}</p>
              <a className="mt-2 inline-flex font-semibold text-sky-700 underline underline-offset-4" href={`mailto:${CONTACT_EMAIL}`}>{CONTACT_EMAIL}</a>
            </div>
          </div>
        </div>
      </section>
    </main>
  );
}

function InfoCard({ title, body }: { title: string; body: string }) {
  return (
    <div className="rounded-2xl border border-[rgb(var(--border))] bg-[rgb(var(--card))] p-4 text-sm text-[rgb(var(--fg))] shadow-sm">
      <h2 className="text-sm font-semibold text-[rgb(var(--fg))]">{title}</h2>
      <p className="mt-2 whitespace-pre-line leading-relaxed text-[rgb(var(--muted))]">{body}</p>
    </div>
  );
}

function LinkCard({ href, label }: { href: string; label: string }) {
  return <Link href={href} className="rounded-2xl border border-[rgb(var(--border))] bg-[rgb(var(--card))] px-4 py-3 text-sm font-semibold text-[rgb(var(--muted))] shadow-sm transition hover:text-[rgb(var(--fg))]">{label}</Link>;
}
