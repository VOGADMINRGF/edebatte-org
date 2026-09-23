import type { Metadata } from "next";
import DecisionIntelligenceLanding from "./DecisionIntelligenceLanding";
import { BRAND } from "@/lib/brand";
import { buildPublicPageMetadata } from "@/lib/seo/publicDiscovery";
import { GO_TO_MARKET_PACKAGING } from "@features/pricing/goToMarketPackaging";

/* page-contract: delegated-h1 */

const PATH = "/pricing/institutionen/decision-intelligence";
const TITLE = "Decision Intelligence für Organisationen | eDebatte";
const DESCRIPTION =
  "Decision Dossiers, Policy Intelligence und strukturierte Themenbeobachtung für Unternehmen, Verbände, Medien und NGOs. Founding 100: 50 % auf den ersten Auftrag.";

export const metadata: Metadata = {
  ...buildPublicPageMetadata({
    path: PATH,
    title: TITLE,
    description: DESCRIPTION,
    ogType: "website",
  }),
  title: { absolute: TITLE },
};

function buildDecisionIntelligenceStructuredData() {
  const offer = GO_TO_MARKET_PACKAGING.foundingDecisionIntelligence;
  const products = Object.values(offer.products);

  return {
    "@context": "https://schema.org",
    "@graph": [
      {
        "@type": "Service",
        "@id": `${new URL(PATH, BRAND.baseUrl).toString()}#service`,
        name: "eDebatte Decision Intelligence",
        description: DESCRIPTION,
        provider: {
          "@type": "Organization",
          name: BRAND.name,
          url: BRAND.baseUrl,
        },
        areaServed: "DE",
        serviceType: [
          "Decision Intelligence",
          "Policy Intelligence",
          "Entscheidungsanalyse",
          "Themenmonitoring",
        ],
        hasOfferCatalog: {
          "@type": "OfferCatalog",
          name: "Founding 100 Decision Intelligence",
          itemListElement: products.map((product) => ({
            "@type": "Offer",
            name: product.name.de,
            price: product.foundingPriceEur.toString(),
            priceCurrency: "EUR",
            availability: "https://schema.org/LimitedAvailability",
            url: new URL(PATH, BRAND.baseUrl).toString(),
            description:
              product.billing === "monthly"
                ? `Founding-Preis im ersten Monat; danach regulär ${product.listPriceEur} EUR pro Monat.`
                : `Founding-Preis für den ersten Auftrag; regulär ${product.listPriceEur} EUR.`,
          })),
        },
      },
      {
        "@type": "FAQPage",
        mainEntity: [
          {
            "@type": "Question",
            name: "Ist Founding 100 eine Spende an eDebatte?",
            acceptedAnswer: {
              "@type": "Answer",
              text: "Nein. Beauftragt wird eine konkrete professionelle Leistung. Einnahmen aus diesen Aufträgen werden für den weiteren Aufbau von eDebatte und VoiceOpenGov eingesetzt.",
            },
          },
          {
            "@type": "Question",
            name: "Wie lange gilt der Founding-100-Preis?",
            acceptedAnswer: {
              "@type": "Answer",
              text: "Der Founding-Preis gilt für den ersten Auftrag. Bei laufenden Paketen gilt er ausschließlich im ersten Monat; danach gilt der reguläre Preis.",
            },
          },
          {
            "@type": "Question",
            name: "Kann Decision Intelligence direkt online gekauft werden?",
            acceptedAnswer: {
              "@type": "Answer",
              text: "Nein. Checkout ist in dieser Phase deaktiviert. Scope, Eignung und Beauftragung werden nach einer Anfrage individuell bestätigt.",
            },
          },
        ],
      },
    ],
  };
}

const STRUCTURED_DATA = JSON.stringify(buildDecisionIntelligenceStructuredData());

export default function DecisionIntelligencePage() {
  return (
    <>
      <script
        type="application/ld+json"
        suppressHydrationWarning
        dangerouslySetInnerHTML={{ __html: STRUCTURED_DATA }}
      />
      <DecisionIntelligenceLanding />
    </>
  );
}
