import Link from "next/link";
import type { Metadata } from "next";
import PackagesGrid from "@/components/pricing/PackagesGrid";
import ProductSurfaceShell from "@/components/layout/ProductSurfaceShell";
import { buildPublicPageMetadata } from "@/lib/seo/publicDiscovery";
import {
  ORDER_SEGMENT_ORDER,
  PRICING_PATH_CONTRACT,
  getPackagesForJourneySegment,
  normalizePricingLocale,
  resolvePricingOrderEntrySelection,
  type PricingSegmentId,
  type PricingLocale,
} from "@features/pricing";

export const metadata: Metadata = buildPublicPageMetadata({
  path: "/pricing",
  title: "Pakete & Preise · eDebatte",
  description:
    "Preisübersicht für Einzelpersonen, Journalismus, Organisationen und öffentliche Auftraggeber – mit kostenfreier Beteiligung und klaren Zusatzleistungen.",
});

type PageProps = {
  searchParams?: Promise<Record<string, string | string[] | undefined>> | Record<string, string | string[] | undefined>;
};

function firstString(value?: string | string[]) {
  if (typeof value === "string") return value;
  if (Array.isArray(value)) return value[0];
  return null;
}

function withLocaleHref(href: string, locale: PricingLocale) {
  if (locale !== "en") return href;

  const [pathAndQuery, hash = ""] = href.split("#");
  const [path, query = ""] = pathAndQuery.split("?");
  const params = new URLSearchParams(query);
  params.set("lang", "en");
  const queryString = params.toString();
  return `${path}${queryString ? `?${queryString}` : ""}${hash ? `#${hash}` : ""}`;
}

function withSegmentOnInternalOrderHref(href: string, segment: PricingSegmentId) {
  if (!href.startsWith("/")) return href;
  const [pathAndQuery, hash = ""] = href.split("#");
  const [path, query = ""] = pathAndQuery.split("?");
  const params = new URLSearchParams(query);
  if (!params.get("segment")) params.set("segment", segment);
  const queryString = params.toString();
  const normalizedPath = path === PRICING_PATH_CONTRACT.legacyFallbackPath
    ? PRICING_PATH_CONTRACT.primaryOrderPath
    : path;
  return `${normalizedPath}${queryString ? `?${queryString}` : ""}${hash ? `#${hash}` : ""}`;
}

export default async function PricingPage({ searchParams }: PageProps = {}) {
  const params = (await searchParams) ?? {};
  const locale = normalizePricingLocale(firstString(params.lang));
  const selectedOrderEntry = resolvePricingOrderEntrySelection({
    segmentId: firstString(params.segment),
    packageId: firstString(params.paket),
  });
  const selectedSegment = selectedOrderEntry.segmentId;
  const isMunicipalBridge = selectedSegment === "kommunen";
  const segmentPackages = getPackagesForJourneySegment(selectedSegment, locale);
  const pricingPackages = segmentPackages.map((pkg) => ({
    ...pkg,
    ctaHref: withSegmentOnInternalOrderHref(pkg.ctaHref, selectedSegment),
    sekundarCtaHref: pkg.sekundarCtaHref
      ? withSegmentOnInternalOrderHref(pkg.sekundarCtaHref, selectedSegment)
      : pkg.sekundarCtaHref,
  }));
  const segmentHref = (segment: PricingSegmentId) =>
    withLocaleHref(`/pricing?segment=${segment}`, locale);

  const labels =
    locale === "en"
      ? {
          pageKicker: "Pricing",
          heroTitle: "Packages & pricing",
          heroText:
            "Participating and voting can stay free. Choose a paid package only when you need more research, moderation, drafting or professional support.",
          freeStartCta: "Start free",
          confidentialHintCta: "Submit confidential hint",
          packageCta: "Choose package",
          institutionalCta: "Use professionally",
          contactCta: "Contact",
          initiativeCta: "About the initiative",
          howItWorksCta: "How eDebatte works",
          privateKicker: "Private packages",
          privateTitle: "Packages for individuals",
          privateText:
            "eDebatte Free: €0 · Plus: €7.99/month incl. VAT · Pro: €19.99/month incl. VAT.",
          segmentTitle: "More segments",
          segmentLabels: {
            privat: "Individuals",
            journalismus: "Journalism",
            organisationen: "Organizations",
            kommunen: "Municipalities & public buyers",
          } as Record<PricingSegmentId, string>,
          segmentTexts: {
            privat:
              "eDebatte Free: €0 · Plus: €7.99/month incl. VAT · Pro: €19.99/month incl. VAT.",
            journalismus:
              "Journalism packages combine participation with defined research and editorial support quotas.",
            organisationen:
              "Organization packages add onboarding, role setup and support for recurring participation work.",
            kommunen:
              "Municipalities use procurement-ready participation services with individually agreed scope.",
          } as Record<PricingSegmentId, string>,
          municipalBridgeTitle: "Municipalities & public buyers",
          municipalBridgeIntro:
            "For municipalities we provide procurement-ready participation services — from an initial participation check to ongoing operation.",
          municipalBridgeHint: "The detailed selection happens in the institutional B2G configurator.",
          municipalBridgeCta: "Go to B2G configurator",
          municipalBridgeQuoteCta: "Request service description",
          municipalStagesTitle: "Compact B2G overview",
          municipalStages: [
            "Participation Check · from €2,500 one-time + VAT",
            "Dossier & Participation Round · project-based, quote-oriented + VAT",
            "Municipal Participation Operations · from €4,500/month + VAT",
            "Framework Package / Procurement Package · after clarification, quote-based + VAT",
          ],
          annualHint: "Current self-service B2C packages are billed monthly through Stripe.",
          trustTitle: "Trust & clarity",
          trustIntro:
            "Participation is voluntary. eDebatte structures information and does not guarantee political implementation.",
          trustOne: "Contributions can be anonymous, with nickname or clear name depending on context.",
          trustTwo: "Counting and status display are transparent and traceable.",
          trustThree: "Cancellation, revocation and data protection are documented clearly.",
          trustFour: "No official election result unless explicitly configured as legally binding.",
          trustFive: "Extra source verification or premium research is optional and clearly priced.",
          membershipTitle: "Support for the initiative",
          membershipIntro:
            "Support for VoiceOpenGov remains optional and separate from an eDebatte package purchase.",
          membershipPointOne: "eDebatte package prices are identical regardless of VoiceOpenGov support.",
          membershipPointTwo: "Support and eDebatte package activation remain separate and transparent.",
          membershipPointThree: "VoiceOpenGov support starts at €4.99 per month; an enhanced support tier is €15 per month.",
          membershipPointFour:
            "VoiceOpenGov support is managed separately on voiceopengov.org.",
          membershipPointFive:
            "eDebatte.org and VoiceOpenGov.org can be operated in separate systems with additional security boundaries.",
          addOnsTitle: "Optional add-ons",
          addOnsIntro: "Add-ons are optional and can be purchased individually as needed.",
          addOnsItems: [
            "Source verification / research quota: around €10 per quota (single purchase)",
            "Premium research / extended external source analysis: around €20 per activation (single purchase)",
            "Fact-check quota: from €290 / month",
            "Moderation and assistance: from €450 / month",
            "Event support: from €690 per engagement",
            "Reports and outcomes: from €390 / month",
          ],
          institutionalHintText:
            "For organizations, municipalities, associations, media and research we provide dedicated conditions.",
        }
      : {
          pageKicker: "Preise",
          heroTitle: "Kostenlos mitmachen. Mehr nur buchen, wenn du es brauchst.",
          heroText:
            "Abstimmen und teilnehmen kann kostenfrei bleiben. Kostenpflichtige Pakete brauchst du erst, wenn du mehr Recherche, Moderation, Entwurfsarbeit oder professionelle Begleitung möchtest.",
          freeStartCta: "Kostenlos starten",
          confidentialHintCta: "Vertraulichen Hinweis geben",
          packageCta: "Pakete ansehen",
          institutionalCta: "Professionell nutzen",
          contactCta: "Kontakt aufnehmen",
          initiativeCta: "Zur Initiative",
          howItWorksCta: "So funktioniert eDebatte",
          privateKicker: "Für Einzelpersonen",
          privateTitle: "Pakete für Einzelpersonen",
          privateText:
            "eDebatte Free: 0 € · Plus: 7,99 € mtl. inkl. MwSt. · Pro: 19,99 € mtl. inkl. MwSt.",
          segmentTitle: "Weitere Zielgruppen",
          segmentLabels: {
            privat: "Einzelpersonen",
            journalismus: "Journalismus",
            organisationen: "Organisationen",
            kommunen: "Kommunen & öffentliche Auftraggeber",
          } as Record<PricingSegmentId, string>,
          segmentTexts: {
            privat:
              "eDebatte Free: 0 € · Plus: 7,99 € mtl. inkl. MwSt. · Pro: 19,99 € mtl. inkl. MwSt.",
            journalismus:
              "Journalistische Pakete verbinden Beteiligung mit klar definierten Recherche- und Redaktionsleistungen.",
            organisationen:
              "Pakete für Organisationen ergänzen Einführung, Rollenaufbau und Begleitung für wiederkehrende Beteiligung.",
            kommunen:
              "Kommunen nutzen vergabefähige Beteiligungsleistungen mit individuell vereinbartem Umfang.",
          } as Record<PricingSegmentId, string>,
          municipalBridgeTitle: "Kommunen & öffentliche Auftraggeber",
          municipalBridgeIntro:
            "Für Kommunen gibt es vergabefähige Beteiligungsleistungen – vom ersten Beteiligungs-Check bis zum laufenden Betrieb.",
          municipalBridgeHint: "Die detaillierte Auswahl erfolgt im institutionellen B2G-Konfigurator.",
          municipalBridgeCta: "Zum B2G-Konfigurator",
          municipalBridgeQuoteCta: "Leistungsbeschreibung anfordern",
          municipalStagesTitle: "Kompakter Überblick",
          municipalStages: [
            "Beteiligungs-Check · ab 2.500 € einmalig zzgl. MwSt.",
            "Dossier & Beteiligungsrunde · projektbezogen, als Leistungsbaustein zzgl. MwSt.",
            "Beteiligungsbetrieb Kommune · ab 4.500 € / Monat zzgl. MwSt.",
            "Rahmenvertrag / Vergabepaket · Angebot nach Klärung zzgl. MwSt.",
          ],
          annualHint: "Die aktuellen B2C-Self-Service-Pakete werden über Stripe monatlich abgerechnet.",
          trustTitle: "Klare Regeln",
          trustIntro:
            "Nutzung ist freiwillig. eDebatte strukturiert Informationen und garantiert keine politische Umsetzung.",
          trustOne: "Beiträge sind je Kontext anonym, mit Nickname oder mit Klarname möglich.",
          trustTwo: "Zählung und Statusanzeige sind nachvollziehbar und transparent.",
          trustThree: "Widerruf, Kündigung und Datenschutz sind verständlich dokumentiert.",
          trustFour:
            "Keine amtliche Wahl oder verbindliche Abstimmung, außer wenn ein rechtssicheres Verfahren ausdrücklich eingerichtet ist.",
          trustFive:
            "Zusätzliche Quellenprüfung oder Premium-Recherche ist optional und wird klar ausgewiesen.",
          membershipTitle: "Unterstützung der Initiative",
          membershipIntro:
            "Die Unterstützung von VoiceOpenGov bleibt freiwillig und vom eDebatte-Paketkauf getrennt.",
          membershipPointOne: "eDebatte-Paketpreise bleiben unabhängig von einer VoiceOpenGov-Unterstützung gleich.",
          membershipPointTwo: "Unterstützung und eDebatte-Paketfreischaltung laufen als getrennte, transparente Schritte.",
          membershipPointThree: "VoiceOpenGov Unterstützend startet bei 4,99 € pro Monat; Fördernd liegt bei 15 € pro Monat.",
          membershipPointFour:
            "Die VoiceOpenGov-Unterstützung wird separat über voiceopengov.org verwaltet.",
          membershipPointFive:
            "eDebatte.org und VoiceOpenGov.org können organisatorisch und technisch getrennt geführt werden; zusätzliche Sicherheits- und Trennlogik ist bewusst möglich.",
          addOnsTitle: "Optionale Zusatzleistungen",
          addOnsIntro: "Zusatzleistungen sind freiwillig und können bei Bedarf einzeln hinzugebucht werden.",
          addOnsItems: [
            "Quellenprüfung / Recherche-Kontingent: ca. 10 € je Kontingent (einzeln buchbar)",
            "Premium-Recherche / vertiefte externe Quellenanalyse: ca. 20 € je Freigabe (einzeln buchbar)",
            "Faktencheck-Kontingent: ab 290 € / Monat",
            "Moderation und Assistenz: ab 450 € / Monat",
            "Event-Begleitung: ab 690 € je Einsatz",
            "Reports und Outcomes: ab 390 € / Monat",
          ],
          institutionalHintText:
            "Für Organisationen, Kommunen, Vereine, Verbände, Träger, Medien, Beteiligungsbüros, Agenturen, Stiftungen und Forschung gibt es gesonderte Konditionen.",
        };

  return (
    <ProductSurfaceShell>
      <header className="relative overflow-hidden rounded-[1.75rem] border border-[rgb(var(--border))] bg-[rgb(var(--card))] p-6 shadow-sm sm:p-8 lg:p-10">
        <div className="pointer-events-none absolute inset-0 bg-[radial-gradient(circle_at_95%_0%,rgba(14,165,233,0.1),transparent_42%)]" />
        <div className="relative">
          <p className="text-xs font-semibold uppercase tracking-wide text-[rgb(var(--muted))]">{labels.pageKicker}</p>
          <h1 className="mt-2 text-3xl font-bold tracking-tight text-[rgb(var(--fg))] sm:text-4xl">{labels.heroTitle}</h1>
          <p className="mt-4 max-w-4xl text-base leading-relaxed text-[rgb(var(--muted))]">{labels.heroText}</p>
          <p className="mt-2 max-w-4xl text-sm leading-relaxed text-[rgb(var(--muted))]">
            {locale === "en"
              ? "Paid packages add clearly defined services. Nothing is published or presented as official automatically."
              : "Kostenpflichtige Pakete ergänzen klar benannte Leistungen. Nichts wird dadurch automatisch veröffentlicht oder als amtlich dargestellt."}
          </p>
          <p className="mt-2 max-w-4xl text-sm leading-relaxed text-[rgb(var(--muted))]">
            {locale === "en"
              ? "Where a package requires a contract or manual activation, we show that openly instead of pretending there is an instant checkout."
              : "Wo ein Paket Vertrag oder manuelle Freischaltung braucht, zeigen wir das offen statt einen sofortigen Checkout vorzutäuschen."}
          </p>
          <div className="mt-6 flex flex-wrap gap-3">
            <Link href={withLocaleHref("/register", locale)} className="btn-primary">
              {labels.freeStartCta}
            </Link>
            <Link href={withLocaleHref("/community/contributions", locale)} className="btn-secondary">
              {labels.confidentialHintCta}
            </Link>
            <a href="#pricing-privat" className="btn-primary">
              {labels.packageCta}
            </a>
            <Link href={withLocaleHref("/pricing/institutionen", locale)} className="btn-secondary">
              {labels.institutionalCta}
            </Link>
            <Link href={withLocaleHref("/kontakt", locale)} className="btn-secondary">
              {labels.contactCta}
            </Link>
          </div>
        </div>
      </header>

      <section id="pricing-privat" className="mt-10 space-y-5 scroll-mt-28">
        <div className="max-w-5xl">
          <p className="text-xs font-semibold uppercase tracking-wide text-[rgb(var(--muted))]">{labels.privateKicker}</p>
          <h2 className="mt-2 text-2xl font-semibold text-[rgb(var(--fg))] sm:text-3xl">
            {isMunicipalBridge
              ? labels.municipalBridgeTitle
              : selectedSegment === "privat"
              ? labels.privateTitle
              : `${labels.segmentLabels[selectedSegment]} · ${locale === "en" ? "package overview" : "Paketübersicht"}`}
          </h2>
          <p className="mt-1 text-sm leading-relaxed text-[rgb(var(--muted))]">
            {isMunicipalBridge ? labels.municipalBridgeIntro : labels.segmentTexts[selectedSegment]}
          </p>
          <p className="mt-1 text-xs leading-relaxed text-[rgb(var(--muted))]">{labels.annualHint}</p>
          <details className="mt-4 rounded-2xl border border-[rgb(var(--border))] bg-[rgb(var(--bg))] px-3 py-2">
            <summary className="cursor-pointer text-xs font-semibold uppercase tracking-wide text-[rgb(var(--muted))]">
              {labels.segmentTitle}
            </summary>
            <div className="mt-2 flex flex-wrap gap-2">
              {ORDER_SEGMENT_ORDER.map((segment) => (
                <Link
                  key={`pricing-segment-${segment}`}
                  href={segmentHref(segment)}
                  className={[
                    "inline-flex items-center justify-center rounded-full border px-3 py-1.5 text-xs font-semibold",
                    selectedSegment === segment
                      ? "border-sky-300 bg-sky-50 text-sky-800"
                      : "border-[rgb(var(--border))] bg-[rgb(var(--card))] text-[rgb(var(--muted))]",
                  ].join(" ")}
                >
                  {labels.segmentLabels[segment]}
                </Link>
              ))}
            </div>
          </details>
        </div>

        {selectedSegment === "privat" ? (
          <article className="rounded-3xl border border-[rgb(var(--border))] bg-[rgb(var(--card))] p-6 shadow-sm">
            <p className="text-xs font-semibold uppercase tracking-wide text-[rgb(var(--muted))]">
              {locale === "en" ? "Participation Free" : "Beteiligung frei"}
            </p>
            <h3 className="mt-2 text-2xl font-semibold text-[rgb(var(--fg))]">
              {locale === "en" ? "eDebatte Participation" : "eDebatte Beteiligung"}
            </h3>
            <p className="mt-3 text-sm leading-relaxed text-[rgb(var(--muted))]">
              {locale === "en"
                ? "Voting and participation remain free. This path includes no research quotas and no paid drafting quota."
                : "Abstimmung und Teilnahme bleiben kostenfrei. Dieser Weg enthält keine Recherche-Kontingente und kein bezahltes Entwurfskontingent."}
            </p>
            <div className="mt-4">
              <Link href={withLocaleHref("/register", locale)} className="btn-secondary inline-flex">
                {locale === "en" ? "Start free participation" : "Kostenfrei teilnehmen"}
              </Link>
            </div>
          </article>
        ) : null}

        {isMunicipalBridge ? (
          <article className="rounded-3xl border border-sky-300 bg-sky-50/70 p-6 shadow-sm">
            <p className="text-xs font-semibold uppercase tracking-wide text-sky-900">{labels.municipalStagesTitle}</p>
            <ul className="mt-3 space-y-2 text-sm text-sky-900">
              {labels.municipalStages.map((line) => (
                <li key={line}>{line}</li>
              ))}
            </ul>
            <p className="mt-4 text-sm text-sky-900">{labels.municipalBridgeHint}</p>
            <div className="mt-4 flex flex-wrap gap-3">
              <Link
                href={withLocaleHref("/pricing/institutionen?segment=kommunen#guided-selection", locale)}
                className="btn-primary inline-flex"
              >
                {labels.municipalBridgeCta}
              </Link>
              <Link
                href={withLocaleHref(
                  "/pricing/institutionen?segment=kommunen&goal=oeffentliche_anschlussfaehigkeit&frame=laufender_betrieb#guided-selection",
                  locale,
                )}
                className="btn-secondary inline-flex"
              >
                {labels.municipalBridgeQuoteCta}
              </Link>
            </div>
          </article>
        ) : (
          <PackagesGrid packages={pricingPackages} locale={locale} compact />
        )}

        <p className="mt-2 text-sm font-semibold text-[rgb(var(--fg))]">
          {locale === "en"
            ? "What is included is shown directly in each package card."
            : "Was enthalten ist, siehst du direkt in jeder Paketkarte."}
        </p>

        <section className="rounded-3xl border border-[rgb(var(--border))] bg-[rgb(var(--card))] p-5 shadow-sm sm:p-6">
          <p className="text-xs font-semibold uppercase tracking-wide text-[rgb(var(--muted))]">{labels.trustTitle}</p>
          <p className="mt-2 text-sm font-semibold text-[rgb(var(--fg))]">{labels.trustIntro}</p>
          <ul className="mt-3 space-y-1.5 text-sm text-[rgb(var(--muted))]">
            <li>{labels.trustOne}</li>
            <li>{labels.trustTwo}</li>
            <li>{labels.trustThree}</li>
            <li>{labels.trustFour}</li>
            <li>{labels.trustFive}</li>
          </ul>
          <p className="mt-6 text-xs font-semibold uppercase tracking-wide text-[rgb(var(--muted))]">{labels.membershipTitle}</p>
          <p className="mt-2 text-sm font-semibold text-[rgb(var(--fg))]">{labels.membershipIntro}</p>
          <ul className="mt-3 space-y-1.5 text-sm text-[rgb(var(--muted))]">
            <li>{labels.membershipPointOne}</li>
            <li>{labels.membershipPointTwo}</li>
            <li>{labels.membershipPointThree}</li>
            <li>{labels.membershipPointFour}</li>
            <li>{labels.membershipPointFive}</li>
          </ul>
          <div className="mt-5 rounded-2xl border border-[rgb(var(--border))] bg-[rgb(var(--bg))] px-4 py-3">
            <p className="text-xs font-semibold uppercase tracking-wide text-[rgb(var(--muted))]">{labels.addOnsTitle}</p>
            <p className="mt-2 text-sm text-[rgb(var(--muted))]">{labels.addOnsIntro}</p>
            <ul className="mt-2 space-y-1.5 text-sm text-[rgb(var(--muted))]">
              {labels.addOnsItems.map((item) => (
                <li key={item}>{item}</li>
              ))}
            </ul>
          </div>
          <div className="mt-4 flex flex-wrap gap-3">
            <Link href={withLocaleHref("/howtoworks/initiative", locale)} className="btn-secondary inline-flex">
              {labels.initiativeCta}
            </Link>
            <Link href={withLocaleHref("/howtoworks/edebatte", locale)} className="btn-secondary inline-flex">
              {labels.howItWorksCta}
            </Link>
          </div>
        </section>
      </section>

      <section className="mt-8 rounded-3xl border border-[rgb(var(--border))] bg-[rgb(var(--card))] p-4 shadow-sm sm:p-5">
        <p className="text-sm leading-relaxed text-[rgb(var(--muted))]">{labels.institutionalHintText}</p>
        <div className="mt-3">
          <Link href={withLocaleHref("/pricing/institutionen", locale)} className="btn-secondary inline-flex">
            {labels.institutionalCta}
          </Link>
        </div>
      </section>
    </ProductSurfaceShell>
  );
}
