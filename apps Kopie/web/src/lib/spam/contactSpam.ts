type Classification = "ham" | "spam" | "suspicious";

export const SPAM_KEYWORDS = [
  "webseitenpreis",
  "website preis",
  "webdesign angebot",
  "seo optimierung",
  "backlinks",
  "backlink",
  "traffic auf ihre seite",
  "google ranking verbessern",
  "guest post",
  "guest posting",
  "sponsored post",
  "guest article",
  "guest author",
  "sponsored article",
  "sponsor link",
  "link einfügen",
  "link insertion",
  "link platzieren",
  "link placement",
  "link placement fee",
  "domain authority",
  "seo service",
  "seo agency",
  "seo expert",
  "marketing service",
  "digital marketing",
  "social media marketing",
  "promotion service",
  "promotion offer",
  "werbung schalten",
  "placement fee",
  "advertorial",
  "sponsored content",
  "webagentur",
  "seo team",
  "traffic boost",
  "dofollow link",
  "link building",
  "paid post",
  "content writing",
  "content writer",
  "copywriter",
  "betting",
  "casino",
  "crypto",
  "cryptocurrency",
  "blockchain",
  "outreach",
  "partnership request",
  "collaboration request",
  "cooperation",
  "coop request",
  "payment via",
  "dear sir",
  "dear madam",
  "da50",
  "da 50",
  "dr 50",
  "domain rating",
];

const GENERIC_IDENTIFIERS = [
  "seo",
  "webagentur",
  "marketing",
  "agency",
  "linkbuilding",
  "guest post",
  "webdesign",
  "outreach",
  "promotion",
  "partnership",
  "cooperation",
];

const URL_REGEX = /(https?:\/\/|www\.)\S+/gi;

export function countUrls(message: string): number {
  if (!message) return 0;
  const matches = message.match(URL_REGEX);
  return matches ? matches.length : 0;
}

type SpamInput = {
  name: string;
  subject?: string;
  message: string;
  userAgent?: string;
  urlCount?: number;
};

export function evaluateContactSpam(input: SpamInput): {
  spamScore: number;
  reasons: string[];
  classification: Classification;
  urlCount: number;
} {
  const { name, subject, message, userAgent } = input;
  const reasons: string[] = [];
  let spamScore = 0;

  const normalizedMessage = `${subject ?? ""}\n${message}`.toLowerCase();
  const keywordHits = SPAM_KEYWORDS.filter((kw) => normalizedMessage.includes(kw));
  if (keywordHits.length) {
    spamScore += Math.min(3, keywordHits.length + 1);
    reasons.push(`keywords:${keywordHits.slice(0, 3).join(",")}${keywordHits.length > 3 ? "+" : ""}`);
  }

  const urls = input.urlCount ?? countUrls(message);
  if (urls >= 5) {
    spamScore += 3;
    reasons.push(`many_urls:${urls}`);
  } else if (urls >= 3) {
    spamScore += 2;
    reasons.push(`many_urls:${urls}`);
  } else if (urls >= 1) {
    spamScore += 1;
    reasons.push(`url_present:${urls}`);
  }

  const len = message.trim().length;
  if (len < 20) {
    spamScore += 1;
    reasons.push("too_short");
  } else if (len > 5000) {
    spamScore += 2;
    reasons.push("too_long");
  }

  const nonAlphaRatio = len
    ? message.replace(/[a-z]/gi, "").length / len
    : 0;
  if (len > 40 && nonAlphaRatio > 0.6) {
    spamScore += 2;
    reasons.push(`non_alpha_ratio:${nonAlphaRatio.toFixed(2)}`);
  }

  const normalizedName = (name || "").toLowerCase();
  const normalizedSubject = (subject || "").toLowerCase();
  const genericIdentity = GENERIC_IDENTIFIERS.some(
    (kw) => normalizedName.includes(kw) || normalizedSubject.includes(kw),
  );
  if (genericIdentity) {
    spamScore += 1;
    reasons.push("generic_identity");
  }

  if (/whatsapp|telegram|skype|viber/.test(normalizedMessage)) {
    spamScore += 1;
    reasons.push("messenger_contact");
  }

  if (/\bda\s*\d{1,3}\b/.test(normalizedMessage) || /\bdr\s*\d{1,3}\b/.test(normalizedMessage)) {
    spamScore += 1;
    reasons.push("da_dr_claim");
  }

  if (userAgent && /headless|crawler|bot|spider/i.test(userAgent)) {
    spamScore += 1;
    reasons.push("suspicious_ua");
  }

  const classification: Classification =
    spamScore >= 3 ? "spam" : spamScore === 2 ? "suspicious" : "ham";

  return { spamScore, reasons, classification, urlCount: urls };
}
