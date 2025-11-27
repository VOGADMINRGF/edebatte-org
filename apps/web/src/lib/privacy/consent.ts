// E200: Minimal consent parsing and cookie serialization for VOG banner.
export const CONSENT_COOKIE_NAME = "vog_consent";
export type VogConsent = { essential: true; analytics: boolean };

const SIX_MONTHS_IN_SECONDS = 60 * 60 * 24 * 30 * 6;

export function parseConsentCookie(rawValue?: string | null): VogConsent | null {
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

export function serializeConsent(consent: VogConsent): string {
  return encodeURIComponent(JSON.stringify({ essential: true, analytics: consent.analytics }));
}

export function buildConsentCookie(consent: VogConsent) {
  const value = serializeConsent(consent);
  const secure = typeof location !== "undefined" ? location.protocol === "https:" : true;
  return `${CONSENT_COOKIE_NAME}=${value}; Path=/; Max-Age=${SIX_MONTHS_IN_SECONDS}; SameSite=Lax;${
    secure ? " Secure" : ""
  }`;
}
