import type { Lang } from "@features/landing/landingCopy";

export const PRELAUNCH_GATE_COPY: Record<
  Lang,
  {
    brand: string;
    title: string;
    lead: string;
    bullets: string[];
    refineTitle: string;
    refineText: string;
    refineCta: string;
    submitTitle: string;
    submitText: string;
    submitCta: string;
    productsTitle: string;
    productsHint: string;
    products: {
      id: "donate" | "free" | "pro";
      eyebrow: string;
      title: string;
      text: string;
      note?: string;
      cta: string;
    }[];
    contactCta: string;
    later: string;
  }
> = {
  de: {
    brand: "eDebatte",
    title: "Wir prüfen jeden Beitrag vor Freigabe",
    lead:
      "Bis zum finalen Rollout prüfen wir Beiträge manuell. Beiträge anlegen und abstimmen bleibt kostenfrei.",
    bullets: [
      "Entwürfe ohne Registrierung möglich",
      "Abstimmen auf vorhandene Beiträge ist offen",
      "Freigabe nach Prüfung (redaktionell)",
    ],
    refineTitle: "Noch ergänzen?",
    refineText: "Sichtweisen, Adressat und Bewertung genauer einordnen.",
    refineCta: "Ergänzen & qualifizieren",
    submitTitle: "So zur Prüfung stellen",
    submitText: "Wir übernehmen dein Anliegen wie eingereicht und prüfen es vor Veröffentlichung.",
    submitCta: "Zur Prüfung einreichen",
    productsTitle: "Vorbestellen / unterstützen",
    productsHint: "Wischen",
    products: [
      {
        id: "donate",
        eyebrow: "Spenden",
        title: "Einfach unterstützen",
        text: "Wenn du uns einfach etwas Gutes tun willst.",
        note: "Einmalig oder flexibel, ganz frei.",
        cta: "Spenden",
      },
      {
        id: "free",
        eyebrow: "Kostenfrei",
        title: "Vormerken lassen",
        text: "Ohne Zahlungsangaben. Früh dabei sein.",
        note: "Kein Beitrag nötig.",
        cta: "Kostenfrei vormerken",
      },
      {
        id: "pro",
        eyebrow: "Vorbestellung",
        title: "Pro Jahreslizenz",
        text: "Pro-Version als Jahreslizenz mit 25 % Nachlass.",
        note: "Abrechnung erst zum Launch.",
        cta: "Pro vorbestellen",
      },
    ],
    contactCta: "Kontakt / Demo-Liste",
    later: "Später",
  },
  en: {
    brand: "eDebatte",
    title: "Every contribution is reviewed before release",
    lead: "Until launch, we review submissions manually. Posting and voting stay free.",
    bullets: [
      "Drafts without registration",
      "Voting on existing contributions is open",
      "Release after editorial review",
    ],
    refineTitle: "Want to add details?",
    refineText: "Add context, audience, and evaluation.",
    refineCta: "Refine & qualify",
    submitTitle: "Submit as-is",
    submitText: "We take it as submitted and review it before publishing.",
    submitCta: "Submit for review",
    productsTitle: "Pre-order / support",
    productsHint: "Swipe",
    products: [
      {
        id: "donate",
        eyebrow: "Donate",
        title: "Just support us",
        text: "If you simply want to do something good for us.",
        note: "One-time or flexible, entirely up to you.",
        cta: "Donate",
      },
      {
        id: "free",
        eyebrow: "Free",
        title: "Get on the list",
        text: "No payment details. Be in early.",
        note: "No obligation.",
        cta: "Free pre-signup",
      },
      {
        id: "pro",
        eyebrow: "Pre-order",
        title: "Pro annual license",
        text: "Pro version annual license with 25% discount.",
        note: "Billing starts at launch.",
        cta: "Pre-order Pro",
      },
    ],
    contactCta: "Contact / demo list",
    later: "Later",
  },
};
