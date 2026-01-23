// E200: Minimal consent parsing and cookie serialization for the cookie banner.
export const CONSENT_COOKIE_NAME = "edb_consent";
export const LEGACY_CONSENT_COOKIE_NAME = "vog_consent";
export type Consent = { essential: true; analytics: boolean };

const SIX_MONTHS_IN_SECONDS = 60 * 60 * 24 * 30 * 6;

export function parseConsentCookie(rawValue?: string | null): Consent | null {
  if (!rawValue) return null;
  try {
    const decoded = decodeURIComponent(rawValue);
    const parsed = JSON.parse(decoded);
    if (typeof parsed?.analytics === "boolean") {
      return { essential: true, analytics: parsed.analytics };
    }
  } catch {
    return null;
  }
  return null;
}

export function serializeConsent(consent: Consent): string {
  return encodeURIComponent(JSON.stringify({ essential: true, analytics: consent.analytics }));
}

export function buildConsentCookie(consent: Consent) {
  const value = serializeConsent(consent);
  const secure = typeof location !== "undefined" ? location.protocol === "https:" : true;
  return `${CONSENT_COOKIE_NAME}=${value}; Path=/; Max-Age=${SIX_MONTHS_IN_SECONDS}; SameSite=Lax;${
    secure ? " Secure" : ""
  }`;
}
