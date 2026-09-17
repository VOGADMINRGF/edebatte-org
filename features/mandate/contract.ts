import { z } from "zod";

export const MANDATE_HOLDER_KINDS = ["person", "organisation"] as const;
export type MandateHolderKind = (typeof MANDATE_HOLDER_KINDS)[number];

export const MANDATE_STATUSES = [
  "entwurf",
  "in_pruefung",
  "aktiv",
  "in_umsetzung",
  "abgeschlossen",
  "ausgesetzt",
] as const;
export type MandateStatus = (typeof MANDATE_STATUSES)[number];

export const DECISION_STATUSES = ["draft", "in_review", "valid", "superseded", "revoked"] as const;
export type DecisionStatus = (typeof DECISION_STATUSES)[number];

export const DECISION_SCOPE_LEVELS = [
  "municipal",
  "regional",
  "national",
  "european",
  "international",
] as const;
export type DecisionScopeLevel = (typeof DECISION_SCOPE_LEVELS)[number];

export const DECISION_INTEGRITY_STATUSES = ["pending", "verified", "failed"] as const;
export type DecisionIntegrityStatus = (typeof DECISION_INTEGRITY_STATUSES)[number];

export const MANDATE_VISIBILITIES = ["public_readonly", "restricted", "internal"] as const;
export type MandateVisibility = (typeof MANDATE_VISIBILITIES)[number];

export const CONSENT_STATUSES = ["pending", "granted", "withdrawn", "not_required"] as const;
export type ConsentStatus = (typeof CONSENT_STATUSES)[number];

export const VERIFICATION_STATUSES = ["unverified", "pending", "verified", "rejected"] as const;
export type VerificationStatus = (typeof VERIFICATION_STATUSES)[number];

export const MandateResponsibilitySchema = z
  .object({
    holderId: z.string().trim().min(1),
    holderKind: z.enum(MANDATE_HOLDER_KINDS),
    holderLabel: z.string().trim().min(1),
    roleLabel: z.string().trim().min(1),
  })
  .strict();

export type MandateResponsibility = z.infer<typeof MandateResponsibilitySchema>;

export const DecisionLegitimacySchema = z
  .object({
    eligibilityRuleId: z.string().trim().min(1),
    electorateDescription: z.string().trim().min(1),
    eligiblePopulation: z.number().int().positive().nullable(),
    ballotsCast: z.number().int().positive(),
    validBallots: z.number().int().positive(),
    quorumRuleId: z.string().trim().min(1),
    quorumMet: z.boolean(),
    integrityStatus: z.enum(DECISION_INTEGRITY_STATUSES),
  })
  .strict()
  .superRefine((value, ctx) => {
    if (value.validBallots > value.ballotsCast) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        path: ["validBallots"],
        message: "valid_ballots_must_not_exceed_ballots_cast",
      });
    }
    if (value.eligiblePopulation !== null && value.ballotsCast > value.eligiblePopulation) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        path: ["ballotsCast"],
        message: "ballots_cast_must_not_exceed_known_eligible_population",
      });
    }
  });

export type DecisionLegitimacy = z.infer<typeof DecisionLegitimacySchema>;

export const DecisionMandateSchema = z
  .object({
    status: z.enum(DECISION_STATUSES),
    snapshotId: z.string().trim().min(1),
    ruleId: z.string().trim().min(1),
    scopeLevel: z.enum(DECISION_SCOPE_LEVELS),
    scopeKey: z.string().trim().min(1),
    question: z.string().trim().min(1),
    majorityPosition: z.string().trim().min(1),
    majorityShare: z.number().gt(0).lte(1),
    minorityPositions: z.array(z.string().trim().min(1)),
    legitimacy: DecisionLegitimacySchema,
    decidedAt: z.string().datetime({ offset: true }).nullable(),
    supersedesMandateId: z.string().trim().min(1).nullable(),
  })
  .strict()
  .superRefine((value, ctx) => {
    if (value.status === "valid" && !value.decidedAt) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        path: ["decidedAt"],
        message: "valid_decision_requires_decided_at",
      });
    }
    if (value.status === "valid" && !value.legitimacy.quorumMet) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        path: ["legitimacy", "quorumMet"],
        message: "valid_decision_requires_quorum",
      });
    }
    if (value.status === "valid" && value.legitimacy.integrityStatus !== "verified") {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        path: ["legitimacy", "integrityStatus"],
        message: "valid_decision_requires_verified_integrity",
      });
    }
  });

export type DecisionMandate = z.infer<typeof DecisionMandateSchema>;

export const MandateProvenanceSchema = z
  .object({
    registerLabel: z.literal("eDebatte Entscheidungsmandat"),
    origin: z.enum(["dossier_round_outcome", "manual_register_entry", "hosted_room_followup"]),
    sourceLabel: z.string().trim().min(1),
  })
  .strict();

export type MandateProvenance = z.infer<typeof MandateProvenanceSchema>;

export const MandateTransparencySchema = z
  .object({
    publicNote: z.string().trim().min(1),
    scopeNote: z.string().trim().min(1),
    confidentialHintBoundary: z.string().trim().min(1),
  })
  .strict();

export type MandateTransparency = z.infer<typeof MandateTransparencySchema>;

export const MandateSchema = z
  .object({
    id: z.string().trim().min(1),
    title: z.string().trim().min(1),
    subject: z.string().trim().min(1),
    publicSummary: z.string().trim().min(1),
    status: z.enum(MANDATE_STATUSES),
    visibility: z.enum(MANDATE_VISIBILITIES),
    consentStatus: z.enum(CONSENT_STATUSES),
    verificationStatus: z.enum(VERIFICATION_STATUSES),
    decision: DecisionMandateSchema,
    responsibility: MandateResponsibilitySchema,
    provenance: MandateProvenanceSchema,
    transparency: MandateTransparencySchema,
    sourceDossierId: z.string().trim().min(1).nullable(),
    sourceRoundId: z.string().trim().min(1).nullable(),
    sourceAnlassraumId: z.string().trim().min(1).nullable(),
    validFrom: z.string().date(),
    validUntil: z.string().date().nullable(),
    lastUpdatedAt: z.string().date(),
    isReadOnlyPublic: z.literal(true),
  })
  .strict();

export type Mandate = z.infer<typeof MandateSchema>;

export const MANDATE_REGISTER_FIXTURES: readonly Mandate[] = [
  {
    id: "decision-mandate-001",
    title: "Energetische Sanierung kommunaler Gebäude",
    subject: "Entscheidungsgegenstand: Reduktion des Energieverbrauchs um 15 % bis 2027",
    publicSummary:
      "Der Eintrag dokumentiert einen gültigen eDebatte-Entscheidungssnapshot und den daraus für VoiceOpenGov folgenden politischen Repräsentationsauftrag.",
    status: "in_umsetzung",
    visibility: "public_readonly",
    consentStatus: "granted",
    verificationStatus: "verified",
    decision: {
      status: "valid",
      snapshotId: "decision-snapshot-energy-2026-01",
      ruleId: "simple-majority",
      scopeLevel: "municipal",
      scopeKey: "kommune-beispielstadt",
      question: "Soll der Energieverbrauch kommunaler Gebäude bis 2027 um 15 % reduziert werden?",
      majorityPosition: "Ja",
      majorityShare: 0.62,
      minorityPositions: ["Nein", "Ziel später erreichen"],
      legitimacy: {
        eligibilityRuleId: "verified-residents-v1",
        electorateDescription: "Für diese kommunale Beispielentscheidung verifizierte abstimmungsberechtigte Personen im definierten Gebiet.",
        eligiblePopulation: 2500,
        ballotsCast: 475,
        validBallots: 468,
        quorumRuleId: "ten-percent-v1",
        quorumMet: true,
        integrityStatus: "verified",
      },
      decidedAt: "2026-03-01T18:00:00.000Z",
      supersedesMandateId: null,
    },
    responsibility: {
      holderId: "person-keller-01",
      holderKind: "person",
      holderLabel: "Lea Keller",
      roleLabel: "VoiceOpenGov-Repräsentation für Klima und Gebäude",
    },
    provenance: {
      registerLabel: "eDebatte Entscheidungsmandat",
      origin: "dossier_round_outcome",
      sourceLabel: "Gültig abgeschlossene Dossier/Runde mit versioniertem Entscheidungssnapshot",
    },
    transparency: {
      publicNote:
        "Das eDebatte-Ergebnis ist innerhalb seines definierten Geltungsbereichs der verbindliche Repräsentationsauftrag für VoiceOpenGov.",
      scopeNote:
        "Der Auftrag beschreibt das gültige Ergebnis des definierten Abstimmungskreises. Er behauptet ohne entsprechenden Nachweis keine statistische Mehrheit aller Einwohnerinnen und Einwohner.",
      confidentialHintBoundary:
        "Vertrauliche Hinweise werden nicht automatisch an die verantwortliche Person oder Organisation weitergeleitet.",
    },
    sourceDossierId: "dossier-31",
    sourceRoundId: "round-energie-2026-01",
    sourceAnlassraumId: "anlass-energie-2030",
    validFrom: "2026-03-01",
    validUntil: null,
    lastUpdatedAt: "2026-05-02",
    isReadOnlyPublic: true,
  },
  {
    id: "decision-mandate-002",
    title: "Sichere Schulwege im Quartier Nord",
    subject: "Entscheidungsgegenstand: Querungshilfen, Beleuchtung und Temporeduktion",
    publicSummary:
      "Der Eintrag zeigt den gültigen Mehrheitsauftrag, sichtbare Minderheitenpositionen und die zuständige politische Umsetzung.",
    status: "aktiv",
    visibility: "public_readonly",
    consentStatus: "granted",
    verificationStatus: "pending",
    decision: {
      status: "valid",
      snapshotId: "decision-snapshot-schoolway-2026-04",
      ruleId: "simple-majority",
      scopeLevel: "regional",
      scopeKey: "quartier-nord",
      question: "Sollen Querungshilfen, Beleuchtung und Temporeduktion gemeinsam umgesetzt werden?",
      majorityPosition: "Ja",
      majorityShare: 0.57,
      minorityPositions: ["Nur Querungshilfen und Beleuchtung"],
      legitimacy: {
        eligibilityRuleId: "verified-residents-v1",
        electorateDescription: "Für diese regionale Beispielentscheidung verifizierte abstimmungsberechtigte Personen im definierten Quartier.",
        eligiblePopulation: 1800,
        ballotsCast: 322,
        validBallots: 316,
        quorumRuleId: "ten-percent-v1",
        quorumMet: true,
        integrityStatus: "verified",
      },
      decidedAt: "2026-04-10T19:30:00.000Z",
      supersedesMandateId: null,
    },
    responsibility: {
      holderId: "org-ordnungsamt-02",
      holderKind: "organisation",
      holderLabel: "Ordnungsamt Beispielstadt",
      roleLabel: "Verantwortliche Umsetzungsstelle für Verkehrsmaßnahmen",
    },
    provenance: {
      registerLabel: "eDebatte Entscheidungsmandat",
      origin: "dossier_round_outcome",
      sourceLabel: "Gültig abgeschlossene öffentliche Runde mit versioniertem Entscheidungssnapshot",
    },
    transparency: {
      publicNote:
        "Mehrheitsauftrag und relevante Minderheitenposition bleiben gemeinsam öffentlich nachvollziehbar.",
      scopeNote:
        "Eine spätere gültige Entscheidung kann diesen Stand ersetzen; Abstimmungskreis, Beteiligung und Versionshistorie bleiben nachvollziehbar.",
      confidentialHintBoundary:
        "Vertrauliche Hinweise bleiben geschützt und folgen einem separaten, ausdrücklich freizugebenden Pfad.",
    },
    sourceDossierId: "dossier-47",
    sourceRoundId: "round-schulweg-2026-04",
    sourceAnlassraumId: null,
    validFrom: "2026-04-10",
    validUntil: "2027-12-31",
    lastUpdatedAt: "2026-05-01",
    isReadOnlyPublic: true,
  },
] as const;

const MANDATE_FIXTURE_MAP = new Map(MANDATE_REGISTER_FIXTURES.map((mandate) => [mandate.id, mandate]));

const LEGACY_MANDATE_ID_ALIASES = new Map<string, string>([
  ["vog-mandat-001", "decision-mandate-001"],
  ["vog-mandat-002", "decision-mandate-002"],
]);

function normalizeEnum<T extends readonly string[]>(value: unknown, allowed: T, fallback: T[number]): T[number] {
  if (typeof value !== "string") return fallback;
  const normalized = value.trim().toLowerCase();
  const match = allowed.find((entry) => entry.toLowerCase() === normalized);
  return match ?? fallback;
}

export function normalizeMandateStatus(value: unknown): MandateStatus {
  return normalizeEnum(value, MANDATE_STATUSES, "entwurf");
}

export function normalizeMandateVisibility(value: unknown): MandateVisibility {
  return normalizeEnum(value, MANDATE_VISIBILITIES, "restricted");
}

export function normalizeConsentStatus(value: unknown): ConsentStatus {
  return normalizeEnum(value, CONSENT_STATUSES, "pending");
}

export function normalizeVerificationStatus(value: unknown): VerificationStatus {
  return normalizeEnum(value, VERIFICATION_STATUSES, "unverified");
}

export function parseMandate(value: unknown): Mandate {
  return MandateSchema.parse(value);
}

export function getMandateById(id: string): Mandate | null {
  const canonicalId = LEGACY_MANDATE_ID_ALIASES.get(id) ?? id;
  return MANDATE_FIXTURE_MAP.get(canonicalId) ?? null;
}

export function listMandates(): readonly Mandate[] {
  return MANDATE_REGISTER_FIXTURES;
}

export function isPublicReadOnlyMandate(mandate: Mandate): boolean {
  return mandate.visibility === "public_readonly" && mandate.isReadOnlyPublic;
}

export function isBindingVoiceOpenGovRepresentationMandate(mandate: Mandate): boolean {
  return (
    mandate.decision.status === "valid" &&
    mandate.provenance.origin === "dossier_round_outcome" &&
    mandate.decision.legitimacy.quorumMet &&
    mandate.decision.legitimacy.integrityStatus === "verified" &&
    Boolean(
      mandate.decision.snapshotId &&
        mandate.decision.scopeKey &&
        mandate.decision.ruleId &&
        mandate.decision.legitimacy.eligibilityRuleId &&
        mandate.decision.legitimacy.quorumRuleId,
    )
  );
}

export function supportsMembershipHandoff(): false {
  return false;
}

export function supportsAutomaticAssignment(): false {
  return false;
}

export function supportsAutomaticBindingFromDraftOrOpenProcess(): false {
  return false;
}

export function supportsMandateEditInPublicSurface(): false {
  return false;
}
