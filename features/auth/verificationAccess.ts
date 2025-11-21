import { ObjectId, getCol } from "@core/db/triMongo";
import { ensureVerificationDefaults } from "@core/auth/verificationTypes";
import type { VerificationLevel } from "@core/auth/verificationTypes";
import {
  VERIFICATION_LEVEL_ORDER,
  meetsVerificationLevel,
} from "./verificationRules";

type EnsureResult =
  | { ok: true; level: VerificationLevel }
  | { ok: false; level: VerificationLevel; error: "login_required" | "user_not_found" | "insufficient_level" };

export async function ensureUserMeetsVerificationLevel(
  userId: string | null,
  minLevel: VerificationLevel,
): Promise<EnsureResult> {
  if (!userId) {
    return { ok: false, level: "none", error: "login_required" };
  }

  const Users = await getCol("users");
  const doc = await Users.findOne(
    { _id: new ObjectId(userId) },
    { projection: { verification: 1 } },
  );

  if (!doc) {
    return { ok: false, level: "none", error: "user_not_found" };
  }

  const verification = ensureVerificationDefaults(doc.verification);
  if (!meetsVerificationLevel(verification.level, minLevel)) {
    return { ok: false, level: verification.level, error: "insufficient_level" };
  }

  return { ok: true, level: verification.level };
}

export function describeLevel(level: VerificationLevel) {
  switch (level) {
    case "none":
      return "Nur Lesen/Browsen";
    case "email":
      return "E-Mail bestätigt – Level 1 Beiträge & einfache Abstimmungen";
    case "soft":
      return "Identität geprüft (OTB/eID) – Evidence & regionale Abstimmungen";
    case "strong":
      return "Konto vollständig legitimiert – alle Funktionen freigeschaltet";
    default:
      return "";
  }
}
