export type NewsletterDeliveryActivation = {
  enabled: boolean;
  reason: "enabled" | "delivery_gate_disabled";
};

/**
 * External newsletter delivery is an explicit production activation decision.
 * Missing, empty or unrecognised values always fail closed.
 */
export function resolveNewsletterDeliveryActivation(value: unknown): NewsletterDeliveryActivation {
  const normalized = typeof value === "string" ? value.trim().toLowerCase() : "";
  const enabled = normalized === "1" || normalized === "true" || normalized === "yes" || normalized === "on";
  return {
    enabled,
    reason: enabled ? "enabled" : "delivery_gate_disabled",
  };
}
