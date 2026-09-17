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

export const MandateAuthoritySchema = z
  .object({
    issuerId: z.string().trim().min(1),
    issuerLabel: z.string().trim().min(1),
    decisionReference: z.string().trim().min(1),
  })
  .strict();

export type MandateAuthority = z.infer<typeof MandateAuthoritySchema>;

export const MandateProvenanceSchema = z
  .object({
    registerLabel: z.literal("eDebatte Verantwortungsregister"),
    origin: z.enum(["external_authority_record", "manual_register_entry", "hosted_room_followup"]),
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
    responsibility: MandateResponsibilitySchema,
    authority: MandateAuthoritySchema,
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
    id: "responsibility-record-001",
    title: "Energetische Sanierung kommunaler Gebäude",
    subject: "Verantwortungsgegenstand: Reduktion des Energieverbrauchs um 15 % bis 2027",
    publicSummary:
      "Der Eintrag dokumentiert eine extern legitimierte Verantwortung, ihren Status und die dazu referenzierten Arbeitsgrundlagen.",
    status: "in_umsetzung",
    visibility: "public_readonly",
    consentStatus: "granted",
    verificationStatus: "verified",
    responsibility: {
      holderId: "person-keller-01",
      holderKind: "person",
      holderLabel: "Lea Keller",
      roleLabel: "Umsetzungsverantwortliche für Klima und Gebäude",
    },
    authority: {
      issuerId: "kommune-beispielstadt",
      issuerLabel: "Beispielstadt",
      decisionReference: "Extern dokumentierter Beschluss 2026-03",
    },
    provenance: {
      registerLabel: "eDebatte Verantwortungsregister",
      origin: "external_authority_record",
      sourceLabel: "Externe Entscheidung mit verknüpfter Dossier- und Rundendokumentation",
    },
    transparency: {
      publicNote:
        "eDebatte dokumentiert diesen Verantwortungsstand read-only. Die zugrunde liegende Autorisierung entsteht außerhalb von eDebatte.",
      scopeNote:
        "Ein Dossier, eine Runde oder ein Mehrheitsbild in eDebatte erzeugt selbst weder ein Mandat noch eine organisatorische Weisung.",
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
    id: "responsibility-record-002",
    title: "Sichere Schulwege im Quartier Nord",
    subject: "Verantwortungsgegenstand: Querungshilfen, Beleuchtung und Temporeduktion",
    publicSummary:
      "Der Eintrag macht Zuständigkeit und Status nachvollziehbar, ohne aus eDebatte-Inhalten automatisch politische oder organisatorische Autorität abzuleiten.",
    status: "aktiv",
    visibility: "public_readonly",
    consentStatus: "granted",
    verificationStatus: "pending",
    responsibility: {
      holderId: "org-ordnungsamt-02",
      holderKind: "organisation",
      holderLabel: "Ordnungsamt Beispielstadt",
      roleLabel: "Verantwortliche Organisation für Verkehrsmaßnahmen",
    },
    authority: {
      issuerId: "kommune-beispielstadt",
      issuerLabel: "Beispielstadt",
      decisionReference: "Extern dokumentierte Zuständigkeitszuweisung 2026-04",
    },
    provenance: {
      registerLabel: "eDebatte Verantwortungsregister",
      origin: "hosted_room_followup",
      sourceLabel: "Dokumentierter Folgestand mit externer Zuständigkeit und öffentlicher Runde als Referenz",
    },
    transparency: {
      publicNote:
        "Diese Ansicht dient der öffentlichen Nachvollziehbarkeit. Sie ist keine Bearbeitungs- oder Autorisierungsoberfläche.",
      scopeNote:
        "Organisationen, Mitgliedschaften oder politische Zugehörigkeiten werden hier weder erzeugt noch automatisch abgeleitet.",
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
  return MANDATE_FIXTURE_MAP.get(id) ?? null;
}

export function listMandates(): readonly Mandate[] {
  return MANDATE_REGISTER_FIXTURES;
}

export function isPublicReadOnlyMandate(mandate: Mandate): boolean {
  return mandate.visibility === "public_readonly" && mandate.isReadOnlyPublic;
}

export function supportsMembershipHandoff(): false {
  return false;
}

export function supportsAutomaticAssignment(): false {
  return false;
}

export function supportsAuthorityDerivationFromEDebatte(): false {
  return false;
}

export function supportsMandateEditInPublicSurface(): false {
  return false;
}
