/**
 * Drift8: VoiceRegistry - operationalizes missing voices as roles (not persons).
 */

export type VoiceRole =
  | "power_government"
  | "power_military"
  | "affected_local"
  | "medical_on_ground"
  | "human_rights_monitor"
  | "international_law"
  | "independent_academic"
  | "on_the_ground_journalist"
  | "opposition_alt_position"
  | "other";

export type VoiceRegistry = {
  id: string;
  version: string;
  requiredByDomain: Record<string, VoiceRole[]>;
};

export const CURRENT_VOICE_REGISTRY: VoiceRegistry = {
  id: "vog_voice_registry",
  version: "2026-01-02.1",
  requiredByDomain: {
    sonstiges: ["affected_local", "independent_academic", "on_the_ground_journalist"],
    gesellschaft: ["affected_local", "human_rights_monitor", "independent_academic"],
    sicherheit: ["international_law", "human_rights_monitor", "on_the_ground_journalist", "affected_local"],
    aussenbeziehungen_eu: ["international_law", "independent_academic", "opposition_alt_position"],
    aussenbeziehungen_nachbarlaender: ["international_law", "on_the_ground_journalist", "affected_local"],
  },
};

export function getVoiceRegistry() {
  return CURRENT_VOICE_REGISTRY;
}

export function requiredVoicesFor(domains: string[] | undefined): VoiceRole[] {
  const reg = CURRENT_VOICE_REGISTRY;
  const ds = Array.isArray(domains) && domains.length ? domains : ["sonstiges"];
  const set = new Set<VoiceRole>();
  for (const d of ds) {
    const roles = reg.requiredByDomain[d] ?? reg.requiredByDomain["sonstiges"] ?? [];
    roles.forEach((r) => set.add(r));
  }
  return Array.from(set);
}
