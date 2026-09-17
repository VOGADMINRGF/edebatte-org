import {
  renderTransactionalMail,
  type MailContentBlock,
  type TransactionalMail,
} from "@/utils/mailRenderer";
import { publicOrigin } from "@/utils/publicOrigin";
import { resolveNewsletterBriefingPolicy } from "@features/notifications/newsletterBriefingPolicy";
import type { NewsletterAudienceTier } from "@features/notifications/newsletterSubscriptionContract";

export type NewsletterDigestMailItem = {
  id: string;
  title: string;
  summary: string;
  href: string;
  topicLabel?: string | null;
  regionLabel?: string | null;
  relevanceReasons?: readonly string[] | null;
  verificationLabel?: string | null;
  limitations?: readonly string[] | null;
};

export type NewsletterDigestMailInput = {
  recipientName?: string | null;
  locale?: string | null;
  audienceTier: NewsletterAudienceTier;
  items: readonly NewsletterDigestMailItem[];
  preferenceUrl: string;
  unsubscribeUrl: string;
  generatedAt: Date;
};

function absoluteUrl(value: string) {
  const origin = publicOrigin().replace(/\/$/, "");
  try {
    return new URL(value, `${origin}/`).toString();
  } catch {
    return origin;
  }
}

function formatDate(date: Date, locale: string) {
  return new Intl.DateTimeFormat(locale.startsWith("en") ? "en-GB" : "de-DE", {
    day: "2-digit",
    month: "2-digit",
    year: "numeric",
  }).format(date);
}

function tierLabel(tier: NewsletterAudienceTier, isEnglish: boolean) {
  if (tier === "pro") return isEnglish ? "Pro briefing" : "Pro-Briefing";
  if (tier === "organization") return isEnglish ? "Organization briefing" : "Organisations-Briefing";
  if (tier === "staff") return isEnglish ? "Team briefing" : "Team-Briefing";
  if (tier === "plus") return isEnglish ? "Plus briefing" : "Plus-Briefing";
  return isEnglish ? "Weekly briefing" : "Wochen-Briefing";
}

const ENGLISH_RELEVANCE_LABELS: Record<string, string> = {
  "passt zu einem ausdrücklich gewählten Thema": "matches a topic you explicitly selected",
  "passt zu einer ausdrücklich gewählten Region": "matches a region you explicitly selected",
  "betrifft ein beobachtetes Thema": "affects a topic on your watchlist",
  "betrifft eine beobachtete Region": "affects a region on your watchlist",
  "betrifft ein eigenes Thema oder eine eigene Arbeit": "affects one of your own topics or contributions",
  "betrifft die Region einer eigenen Arbeit": "affects the region of one of your own contributions",
  "passt zur bevorzugten Sprache": "matches your preferred language",
  "ist als wichtige plattformweite Information markiert": "is marked as an important platform-wide update",
  "hat aktuell keinen erklärbaren Profilbezug": "has no explainable profile match and was selected as a general opted-in update",
};

function relevanceReasons(reasons: readonly string[], isEnglish: boolean) {
  if (!isEnglish) return reasons;
  return reasons.map((reason) => ENGLISH_RELEVANCE_LABELS[reason] ?? reason);
}

export function buildNewsletterDigestMail(input: NewsletterDigestMailInput): TransactionalMail {
  const isEnglish = String(input.locale ?? "de").toLowerCase().startsWith("en");
  const policy = resolveNewsletterBriefingPolicy(input.audienceTier);
  const date = formatDate(input.generatedAt, input.locale ?? "de");
  const label = tierLabel(input.audienceTier, isEnglish);
  const blocks: MailContentBlock[] = [];

  blocks.push({
    kind: "paragraph",
    text: isEnglish
      ? `Here are the eDebatte developments that are most relevant to your selected topics, regions and activity. ${input.items.length} update${input.items.length === 1 ? "" : "s"} made it into this briefing. Reviewed source content can remain in its original language so its approved wording is not silently changed.`
      : `Hier sind die eDebatte-Entwicklungen, die zu deinen gewählten Themen, Regionen und Aktivitäten passen. ${input.items.length} Update${input.items.length === 1 ? "" : "s"} haben es in dieses Briefing geschafft. Geprüfte Quellinhalte können in ihrer Originalsprache bleiben, damit freigegebene Formulierungen nicht still verändert werden.`,
  });

  for (const [index, item] of input.items.entries()) {
    blocks.push({
      kind: "notice",
      title: `${index + 1}. ${item.title}`,
      text: item.summary,
    });

    const details: Array<{ label: string; value: string }> = [];
    if (item.topicLabel) {
      details.push({ label: isEnglish ? "Topic" : "Thema", value: item.topicLabel });
    }
    if (item.regionLabel) {
      details.push({ label: "Region", value: item.regionLabel });
    }
    if (policy.includeRelevanceExplanation && item.relevanceReasons?.length) {
      details.push({
        label: isEnglish ? "Why this is here" : "Warum für dich",
        value: relevanceReasons(item.relevanceReasons, isEnglish).join(" · "),
      });
    }
    if (policy.includeEvidencePointers && item.verificationLabel) {
      details.push({
        label: isEnglish ? "Evidence status" : "Evidenzstatus",
        value: item.verificationLabel,
      });
    }
    if (details.length) blocks.push({ kind: "details", rows: details });

    if (policy.includeEvidencePointers && item.limitations?.length) {
      blocks.push({
        kind: "list",
        items: item.limitations.slice(0, 3).map((value) =>
          isEnglish ? `Limitation: ${value}` : `Einschränkung: ${value}`,
        ),
      });
    }

    blocks.push({
      kind: "cta",
      label: isEnglish ? "Open on eDebatte" : "Auf eDebatte öffnen",
      url: absoluteUrl(item.href),
    });
  }

  blocks.push({
    kind: "notice",
    title: isEnglish ? "You stay in control" : "Du behältst die Kontrolle",
    text: isEnglish
      ? "Personalization only uses topics, regions and product activity you explicitly selected or created. It does not infer a political ideology, party preference or voting intention."
      : "Die Personalisierung nutzt nur Themen, Regionen und Produktaktivitäten, die du ausdrücklich gewählt oder selbst erzeugt hast. Sie leitet keine politische Ideologie, Parteipräferenz oder Wahlabsicht ab.",
  });
  blocks.push({
    kind: "cta",
    label: isEnglish ? "Manage briefing preferences" : "Briefing-Einstellungen verwalten",
    url: absoluteUrl(input.preferenceUrl),
  });
  blocks.push({
    kind: "cta",
    label: isEnglish ? "Unsubscribe" : "Updates abbestellen",
    url: absoluteUrl(input.unsubscribeUrl),
  });

  const subject = `${label} · ${date}`;
  return renderTransactionalMail({
    locale: input.locale,
    subject,
    preheader: isEnglish
      ? `${input.items.length} relevant eDebatte updates for you.`
      : `${input.items.length} relevante eDebatte-Updates für dich.`,
    title: label,
    greeting: input.recipientName
      ? `${isEnglish ? "Hello" : "Hallo"} ${input.recipientName},`
      : isEnglish
        ? "Hello,"
        : "Hallo,",
    blocks,
    reason: isEnglish
      ? "you confirmed eDebatte updates and this briefing follows your communication preferences."
      : "du eDebatte-Updates bestätigt hast und dieses Briefing deinen Kommunikationseinstellungen folgt.",
  });
}
