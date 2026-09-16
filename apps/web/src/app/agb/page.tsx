"use client";

import Link from "next/link";
import { useLocale } from "@/context/LocaleContext";
import { useAutoTranslateText } from "@/lib/i18n/autoTranslate";

const CONTACT_EMAIL = "kontakt@edebatte.org";
const VERSION = "16.09.2026";

export default function AgbPage() {
  const { locale } = useLocale();
  const t = useAutoTranslateText({ locale, namespace: "agb" });

  const sections = [
    {
      title: "1. Anbieter und Geltungsbereich",
      body: [
        "Diese AGB gelten für die Nutzung von eDebatte und für entgeltliche eDebatte-Pakete, die über die Website gebucht werden.",
        "Aktueller Anbieter und Vertragspartner ist Ricky G. Fleischer als natürliche Person. eDebatte wird derzeit als Angebot innerhalb der Initiative VoiceOpenGov betrieben. Eine eDebatte.org GmbH, VOG Holding oder ein anderer separater Rechtsträger ist derzeit nicht Anbieter oder Vertragspartner.",
        "Die vollständigen Anbieter- und Kontaktdaten stehen im Impressum. Für die kostenfreie Nutzung gelten diese Regeln entsprechend, soweit sie ihrem Inhalt nach passen.",
      ],
    },
    {
      title: "2. Kostenfreie Beteiligung und entgeltliche Pakete",
      body: [
        "Die grundlegende Beteiligung auf eDebatte kann kostenfrei genutzt werden. Entgeltliche Pakete wie eDebatte Plus oder eDebatte Pro ergänzen klar bezeichnete Arbeits-, Analyse-, Recherche- oder Komfortfunktionen.",
        "Ein entgeltliches Paket verschafft keine zusätzlichen politischen Stimmrechte, kein höheres Stimmgewicht und keine amtliche oder institutionelle Stellung.",
        "Der konkrete Leistungsumfang und der aktuelle Preis ergeben sich aus der jeweiligen Produkt- und Preisseite zum Zeitpunkt der Buchung.",
      ],
    },
    {
      title: "3. Vertragsschluss",
      body: [
        "Die Darstellung eines kostenpflichtigen Pakets ist noch kein verbindliches Vertragsangebot. Vor Abschluss werden Paket, Preis, Abrechnungszeitraum und die wesentlichen Vertragsinformationen im Checkout angezeigt.",
        "Der Vertrag über ein entgeltliches Paket kommt zustande, wenn die Buchung über den bereitgestellten Checkout erfolgreich bestätigt und von eDebatte angenommen wird. Die Bestätigung wird elektronisch bereitgestellt.",
        "Für die Nutzung ist ein eDebatte-Konto erforderlich, soweit dies beim jeweiligen Paket angegeben ist.",
      ],
    },
    {
      title: "4. Preise, Steuern und Zahlung",
      body: [
        "Es gelten die im Buchungsprozess angezeigten Preise. Umsatzsteuer wird nur ausgewiesen und erhoben, soweit sie nach dem für den jeweiligen Leistungsvorgang tatsächlich geltenden Steuerstatus geschuldet wird.",
        "Die Zahlungsabwicklung erfolgt über Stripe. Im Checkout können je nach Verfügbarkeit und Eignung unterschiedliche Zahlungsarten angezeigt werden, zum Beispiel Karte, Wallets oder PayPal. Maßgeblich sind die im konkreten Checkout tatsächlich angebotenen Zahlungsarten.",
        "eDebatte speichert keine vollständigen Karten- oder PayPal-Zugangsdaten. Zahlungsdienstleister verarbeiten die für die Zahlung erforderlichen Daten nach ihren eigenen Bedingungen und Datenschutzhinweisen.",
      ],
    },
    {
      title: "5. Laufzeit und Kündigung",
      body: [
        "Monatliche Self-Service-Pakete laufen jeweils für einen Abrechnungsmonat und verlängern sich um einen weiteren Monat, wenn sie nicht zum Ende des laufenden Abrechnungszeitraums gekündigt werden.",
        "Eine Kündigung ist jederzeit mit Wirkung zum Ende des laufenden Abrechnungszeitraums möglich. Sie kann über die bereitgestellte Kontoverwaltung beziehungsweise das Zahlungsportal erfolgen, soweit diese Funktion freigeschaltet ist, oder per E-Mail an kontakt@edebatte.org.",
        "Gesetzliche Rechte, insbesondere ein gegebenenfalls bestehendes Widerrufsrecht für Verbraucherinnen und Verbraucher, bleiben unberührt.",
      ],
    },
    {
      title: "6. Widerruf und Erstattungen",
      body: [
        "Für Verbraucherinnen und Verbraucher gelten die gesetzlichen Widerrufsrechte. Einzelheiten stehen in der Widerrufsbelehrung.",
        "Gesetzlich geschuldete Rückzahlungen werden nach den gesetzlichen Vorgaben abgewickelt. Darüber hinaus besteht kein allgemeiner Anspruch auf eine freiwillige Erstattung bereits ordnungsgemäß erbrachter Leistungen; zwingende gesetzliche Ansprüche bleiben unberührt.",
      ],
    },
    {
      title: "7. Pflichten bei der Nutzung",
      body: [
        "Nutzerinnen und Nutzer dürfen eDebatte nicht rechtswidrig, missbräuchlich oder zur Umgehung von Sicherheits- und Moderationsmechanismen verwenden.",
        "Für selbst eingestellte Inhalte bleiben die jeweiligen Nutzerinnen und Nutzer verantwortlich. Rechte Dritter, Datenschutz, Urheberrechte und geltendes Recht sind zu beachten.",
        "Bei erheblichen oder wiederholten Verstößen können Inhalte eingeschränkt und Zugänge im erforderlichen Umfang gesperrt werden. Gesetzliche Rechte auf Widerspruch, Auskunft oder Löschung bleiben unberührt.",
      ],
    },
    {
      title: "8. Verfügbarkeit und Leistungsänderungen",
      body: [
        "eDebatte wird fortlaufend weiterentwickelt. Wartungen, Sicherheitsmaßnahmen und technische Störungen können zu vorübergehenden Einschränkungen führen.",
        "Wesentliche entgeltliche Vertragsleistungen werden nicht willkürlich entzogen. Notwendige Änderungen erfolgen unter Wahrung der gesetzlichen Rechte und der berechtigten Interessen der Nutzerinnen und Nutzer.",
        "eDebatte schuldet keine bestimmte politische, behördliche oder gesellschaftliche Entscheidung und keine Veröffentlichung eines eingereichten Inhalts.",
      ],
    },
    {
      title: "9. Haftung",
      body: [
        "Für Vorsatz und grobe Fahrlässigkeit sowie für Schäden aus der Verletzung von Leben, Körper oder Gesundheit wird nach den gesetzlichen Vorschriften gehaftet.",
        "Bei leicht fahrlässiger Verletzung wesentlicher Vertragspflichten ist die Haftung auf den vertragstypischen, vorhersehbaren Schaden begrenzt, soweit das Gesetz eine solche Begrenzung zulässt. Zwingende gesetzliche Haftung, insbesondere nach dem Produkthaftungsrecht, bleibt unberührt.",
      ],
    },
    {
      title: "10. VoiceOpenGov-Unterstützung",
      body: [
        "Eine freiwillige Unterstützung von VoiceOpenGov ist von einem eDebatte-Paketkauf getrennt. Die Mitgliedschaft bei VoiceOpenGov ist derzeit kostenfrei.",
        "Freiwillige Unterstützung verschafft keine zusätzlichen Stimm-, Beteiligungs- oder Zugangsrechte. Sie wird derzeit nicht als steuerbegünstigte Spende angeboten; es werden keine Spendenquittungen oder Zuwendungsbestätigungen versprochen.",
      ],
    },
    {
      title: "11. Künftiger Rechtsträger",
      body: [
        "Soll künftig eine eDebatte.org GmbH, eine VOG Holding oder ein anderer Rechtsträger einzelne Angebote übernehmen, wird dieser Wechsel nicht rückwirkend fingiert. Anbieter-, Vertrags-, Datenschutz- und Zahlungsinformationen werden zum wirksamen Umstellungszeitpunkt transparent aktualisiert.",
        "Eine Übertragung bestehender Vertragsverhältnisse erfolgt nur im Rahmen der gesetzlichen und vertraglichen Voraussetzungen.",
      ],
    },
    {
      title: "12. Recht, Verbraucherschutz und Streitbeilegung",
      body: [
        "Es gilt deutsches Recht. Zwingende Verbraucherschutzvorschriften des Staates, in dem eine Verbraucherin oder ein Verbraucher ihren beziehungsweise seinen gewöhnlichen Aufenthalt hat, bleiben unberührt.",
        "Ricky G. Fleischer / VoiceOpenGov ist derzeit weder verpflichtet noch bereit, an einem Streitbeilegungsverfahren vor einer Verbraucherschlichtungsstelle teilzunehmen.",
      ],
    },
  ];

  return (
    <main className="min-h-screen bg-[rgb(var(--bg))] pb-16">
      <section className="mx-auto max-w-5xl px-4 pt-14">
        <div className="rounded-3xl bg-[rgb(var(--card))] p-6 shadow-[0_24px_70px_rgba(15,23,42,0.08)] ring-1 ring-[rgb(var(--border))] md:p-10">
          <header className="space-y-3 text-center">
            <p className="text-xs font-semibold uppercase tracking-[0.2em] text-sky-600">{t("Rechtliches", "kicker")}</p>
            <h1 className="text-3xl font-extrabold leading-tight text-[rgb(var(--fg))] md:text-4xl">{t("Allgemeine Geschäftsbedingungen (AGB)", "title")}</h1>
            <p className="text-sm leading-relaxed text-[rgb(var(--muted))] md:text-base">
              {t("Diese Fassung beschreibt die aktuell angebotene Nutzung und die derzeit verfügbaren entgeltlichen Self-Service-Pakete von eDebatte.", "lead")}
            </p>
            <p className="text-xs text-[rgb(var(--muted))]">{t(`Stand: ${VERSION}. Rechtlich maßgeblich ist die deutsche Fassung.`, "version")}</p>
          </header>

          <div className="mt-8 grid gap-4">
            <div className="rounded-2xl border border-sky-200 bg-sky-50 p-4 text-sm text-sky-950">
              <p className="font-semibold">{t("Transparenz zur Aufbauphase", "build.title")}</p>
              <p className="mt-2">{t("Aktueller Vertragspartner ist Ricky G. Fleischer als natürliche Person. Eine eDebatte.org GmbH oder VOG Holding besteht derzeit nicht als Anbieter dieser Leistungen.", "build.body")}</p>
            </div>

            {sections.map((section, index) => (
              <InfoCard key={section.title} title={t(section.title, `section.${index}.title`)} body={section.body.map((line, lineIndex) => t(line, `section.${index}.body.${lineIndex}`)).join("\n\n")} />
            ))}

            <div className="grid gap-3 md:grid-cols-3">
              <LinkCard href="/widerrufsbelehrung" label={t("Widerrufsbelehrung", "links.withdraw")} />
              <LinkCard href="/datenschutz" label={t("Datenschutz", "links.privacy")} />
              <LinkCard href="/impressum" label={t("Impressum", "links.imprint")} />
            </div>

            <div className="rounded-2xl border border-[rgb(var(--border))] bg-[rgb(var(--card))] p-4 text-sm text-[rgb(var(--fg))] shadow-sm">
              <p className="text-xs font-semibold uppercase tracking-wide text-[rgb(var(--muted))]">{t("Kontakt", "contact.title")}</p>
              <p className="mt-2">{t("Fragen zu einer Buchung oder zu diesen Bedingungen? Schreib uns:", "contact.body")}</p>
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
