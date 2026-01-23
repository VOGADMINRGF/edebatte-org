import type { MembershipIntentPayload } from "./types";

/**
 * Placeholder – hier können wir später echte API-Aufrufe integrieren
 * (z. B. POST /api/support/intent oder Stripe/Payment-Provider).
 */
export async function submitMembershipIntent(
  payload: MembershipIntentPayload
): Promise<{ ok: boolean }> {
  console.warn("[membership/api] submitMembershipIntent placeholder", payload);
  return { ok: true };
}
