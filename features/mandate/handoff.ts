import { z } from "zod";
import type { Mandate } from "./contract";
import type { MandateActorRole } from "./permissions";

export const MANDATE_HANDOFF_STATUSES = [
  "draft",
  "ready_for_review",
  "accepted",
  "rejected",
  "withdrawn",
] as const;

export type MandateHandoffStatus = (typeof MANDATE_HANDOFF_STATUSES)[number];

export const MANDATE_REGISTER_ROLE_TYPES = [
  "organisation_representative",
  "verwaltung_representative",
  "mandate_representative",
  "admin_delegate",
] as const;

export type MandateRegisterRoleType = (typeof MANDATE_REGISTER_ROLE_TYPES)[number];

export const MANDATE_HANDOFF_ORIGINS = [
  "edebatte_mandate_surface",
  "edebatte_dossier_followup",
  "edebatte_round_followup",
] as const;

export type MandateHandoffOrigin = (typeof MANDATE_HANDOFF_ORIGINS)[number];

const MandateHandoffConsentSchema = z
  .object({
    optInGranted: z.literal(true),
    consentTextVersion: z.string().trim().min(1),
    consentCapturedAt: z.string().datetime({ offset: true }),
    revocable: z.literal(true),
  })
  .strict();

const MandateHandoffProvenanceSchema = z
  .object({
    origin: z.enum(MANDATE_HANDOFF_ORIGINS),
    sourceMandateId: z.string().trim().min(1),
    sourceDossierId: z.string().trim().min(1).nullable(),
    sourceRoundId: z.string().trim().min(1).nullable(),
    sourceAnlassraumId: z.string().trim().min(1).nullable(),
    sourceDecisionSnapshotId: z.string().trim().min(1),
    preparedByRole: z.enum(MANDATE_REGISTER_ROLE_TYPES),
    preparedByReferenceId: z.string().trim().min(1),
  })
  .strict();

const MandateHandoffAccessBoundarySchema = z
  .object({
    createMembershipEntry: z.literal(false),
    createSupporterEntry: z.literal(false),
    implicitTransfer: z.literal(false),
    implicitRoleInference: z.literal(false),
  })
  .strict();

const MandateHandoffRevocationSchema = z
  .object({
    withdrawnAt: z.string().datetime({ offset: true }),
    withdrawnByRole: z.enum(MANDATE_REGISTER_ROLE_TYPES),
    reason: z.string().trim().min(3),
  })
  .strict();

export const MandateRegisterHandoffSchema = z
  .object({
    id: z.string().trim().min(1),
    mandateId: z.string().trim().min(1),
    status: z.enum(MANDATE_HANDOFF_STATUSES),
    roleType: z.enum(MANDATE_REGISTER_ROLE_TYPES),
    roleLabel: z.string().trim().min(1),
    consent: MandateHandoffConsentSchema,
    provenance: MandateHandoffProvenanceSchema,
    accessBoundary: MandateHandoffAccessBoundarySchema,
    registerVisibility: z.enum(["public", "restricted"]),
    revocation: MandateHandoffRevocationSchema.nullable(),
    createdAt: z.string().datetime({ offset: true }),
    updatedAt: z.string().datetime({ offset: true }),
  })
  .strict()
  .superRefine((value, ctx) => {
    if (value.status === "withdrawn" && !value.revocation) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        path: ["revocation"],
        message: "withdrawn_status_requires_revocation_payload",
      });
    }

    if (value.status !== "withdrawn" && value.revocation) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        path: ["revocation"],
        message: "revocation_payload_only_allowed_for_withdrawn_status",
      });
    }

    if (value.provenance.sourceMandateId !== value.mandateId) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        path: ["provenance", "sourceMandateId"],
        message: "provenance_source_mandate_must_match_mandate_id",
      });
    }
  });

export type MandateRegisterHandoff = z.infer<typeof MandateRegisterHandoffSchema>;

export type BuildMandateRegisterHandoffInput = {
  mandate: Mandate;
  handoffId: string;
  roleType: MandateRegisterRoleType;
  roleLabel: string;
  preparedByReferenceId: string;
  consentTextVersion: string;
  consentCapturedAt: string;
  origin: MandateHandoffOrigin;
  registerVisibility: "public" | "restricted";
  createdAt: string;
};

function normalizeActorRole(role: MandateActorRole): MandateRegisterRoleType | null {
  if (role === "organisation_representative") return "organisation_representative";
  if (role === "verwaltung_representative") return "verwaltung_representative";
  if (role === "mandate_representative") return "mandate_representative";
  if (role === "admin") return "admin_delegate";
  return null;
}

export function canPrepareMandateRegisterHandoff(params: {
  role: MandateActorRole;
  mandate: Mandate;
  actorReferenceIds?: string[];
}): boolean {
  const mapped = normalizeActorRole(params.role);
  if (!mapped) return false;

  if (mapped === "admin_delegate") return true;

  const refs = new Set(params.actorReferenceIds ?? []);
  return refs.has(params.mandate.responsibility.holderId);
}

export function buildMandateRegisterHandoff(
  input: BuildMandateRegisterHandoffInput,
): MandateRegisterHandoff {
  const payload: MandateRegisterHandoff = {
    id: input.handoffId,
    mandateId: input.mandate.id,
    status: "ready_for_review",
    roleType: input.roleType,
    roleLabel: input.roleLabel,
    consent: {
      optInGranted: true,
      consentTextVersion: input.consentTextVersion,
      consentCapturedAt: input.consentCapturedAt,
      revocable: true,
    },
    provenance: {
      origin: input.origin,
      sourceMandateId: input.mandate.id,
      sourceDossierId: input.mandate.sourceDossierId,
      sourceRoundId: input.mandate.sourceRoundId,
      sourceAnlassraumId: input.mandate.sourceAnlassraumId,
      sourceDecisionSnapshotId: input.mandate.decision.snapshotId,
      preparedByRole: input.roleType,
      preparedByReferenceId: input.preparedByReferenceId,
    },
    accessBoundary: {
      createMembershipEntry: false,
      createSupporterEntry: false,
      implicitTransfer: false,
      implicitRoleInference: false,
    },
    registerVisibility: input.registerVisibility,
    revocation: null,
    createdAt: input.createdAt,
    updatedAt: input.createdAt,
  };

  return MandateRegisterHandoffSchema.parse(payload);
}

export function withdrawMandateRegisterHandoff(params: {
  handoff: MandateRegisterHandoff;
  withdrawnAt: string;
  withdrawnByRole: MandateRegisterRoleType;
  reason: string;
}): MandateRegisterHandoff {
  return MandateRegisterHandoffSchema.parse({
    ...params.handoff,
    status: "withdrawn",
    updatedAt: params.withdrawnAt,
    revocation: {
      withdrawnAt: params.withdrawnAt,
      withdrawnByRole: params.withdrawnByRole,
      reason: params.reason,
    },
  });
}

export function parseMandateRegisterHandoff(value: unknown): MandateRegisterHandoff {
  return MandateRegisterHandoffSchema.parse(value);
}

export function supportsAutomaticMandateRegisterTransfer(): false {
  return false;
}

export function supportsMembershipCreationFromMandate(): false {
  return false;
}

export function supportsImplicitMembershipActivationFromMandate(): false {
  return false;
}

export function supportsAutomaticRoleInferenceFromMandateBehavior(): false {
  return false;
}

export function buildMandateRegisterHandoffDisclosure(handoff: MandateRegisterHandoff): {
  consentVisible: boolean;
  roleVisible: boolean;
  provenanceVisible: boolean;
  revocationVisible: boolean;
} {
  return {
    consentVisible: handoff.consent.optInGranted,
    roleVisible: Boolean(handoff.roleType && handoff.roleLabel),
    provenanceVisible: Boolean(
      handoff.provenance.origin &&
        handoff.provenance.sourceMandateId &&
        handoff.provenance.sourceDecisionSnapshotId,
    ),
    revocationVisible: handoff.consent.revocable,
  };
}
