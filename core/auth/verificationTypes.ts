export type VerificationLevel = "none" | "email" | "soft" | "strong";

export type IdentityMethod =
  | "email_link"
  | "email_code"
  | "sms_tan"
  | "otb_app"
  | "eid_scan"
  | "id_upload"
  | "offline_code";

export type UserVerification = {
  level: VerificationLevel;
  methods: IdentityMethod[];
  lastVerifiedAt?: Date | null;
  preferredRegionCode?: string | null;
};

const LEVEL_ORDER: VerificationLevel[] = ["none", "email", "soft", "strong"];

export function ensureVerificationDefaults(input?: Partial<UserVerification> | null): UserVerification {
  return {
    level: input?.level ?? "none",
    methods: Array.isArray(input?.methods) ? [...input!.methods] : [],
    lastVerifiedAt: input?.lastVerifiedAt ?? null,
    preferredRegionCode: input?.preferredRegionCode ?? null,
  };
}

export function upgradeVerificationLevel(
  current: VerificationLevel,
  candidate: VerificationLevel,
): VerificationLevel {
  const currentIdx = LEVEL_ORDER.indexOf(current);
  const candidateIdx = LEVEL_ORDER.indexOf(candidate);
  if (candidateIdx > currentIdx) return candidate;
  return current;
}
