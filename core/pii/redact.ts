import type { ObjectId } from "mongodb";

const REDACTED = "***";

export const PII_REDACT_PATHS = [
  "req.headers.authorization",
  "req.body.password",
  "req.body.passcode",
  "req.body.token",
  "req.body.totp",
  "req.body.email",
  "req.body.phone",
  "body.password",
  "body.passcode",
  "body.token",
  "body.email",
  "body.phone",
  "user.password",
  "user.email",
  "user.phone",
  "actor.email",
  "actor.phone",
  "payload.email",
  "payload.phone",
  "payment.iban",
  "payment.ibanMasked",
  "payment.cardNumber",
  "paymentProfile.iban",
  "paymentProfile.ibanMasked",
  "paymentProfile.bic",
  "paymentProfile.microTransferHash",
  "signature.bytes",
  "signature.raw",
  "email",
  "phone",
  "iban",
  "address",
] as const;

type PrimitiveId = string | number | ObjectId | undefined | null;

export type UserLike = {
  id?: PrimitiveId;
  _id?: PrimitiveId;
  email?: string | null;
  phone?: string | null;
  name?: string | null;
  displayName?: string | null;
};

export type SafeUserSummary = {
  id: string | null;
  emailMasked: string | null;
  phoneMasked: string | null;
  label: string | null;
};

export function maskEmail(email?: string | null): string | null {
  if (!email) return null;
  const [namePart, domain = ""] = email.trim().split("@");
  if (!namePart) return REDACTED;
  const visible = namePart.slice(0, 2);
  const suffix = domain ? `@${domain}` : "";
  return `${visible}${REDACTED}${suffix}`;
}

export function maskPhone(phone?: string | null): string | null {
  if (!phone) return null;
  const digits = phone.replace(/[^\d+]/g, "");
  if (digits.length <= 4) return REDACTED;
  const suffix = digits.slice(-2);
  return `${digits.slice(0, 2)}${REDACTED}${suffix}`;
}

export function maskIban(iban?: string | null): string | null {
  if (!iban) return null;
  const trimmed = iban.replace(/\s+/g, "");
  if (trimmed.length <= 6) return REDACTED;
  return `${trimmed.slice(0, 4)}${REDACTED}${trimmed.slice(-4)}`;
}

export function maskName(name?: string | null): string | null {
  if (!name) return null;
  const trimmed = name.trim();
  if (!trimmed) return null;
  return `${trimmed[0]}${REDACTED}`;
}

export function maskUserId(userId?: string | null): string | null {
  if (!userId) return null;
  const cleaned = userId.trim();
  if (!cleaned) return null;
  if (cleaned.length <= 4) {
    return `u_${cleaned[0]}${REDACTED}`;
  }
  const prefix = cleaned.slice(0, 4);
  const suffix = cleaned.slice(-2);
  return `u_${prefix}${REDACTED}${suffix}`;
}

export function safeUserSummary(user?: UserLike | null): SafeUserSummary | null {
  if (!user) return null;
  const id = toStringId(user.id ?? user._id);
  return {
    id,
    emailMasked: maskEmail(user.email ?? null),
    phoneMasked: maskPhone(user.phone ?? null),
    label: maskName(user.displayName ?? user.name ?? null),
  };
}

export function logSafeUser(user?: UserLike | null, prefix = "user") {
  const summary = safeUserSummary(user);
  if (!summary) {
    return {
      [`${prefix}Id`]: null,
      [`${prefix}Label`]: null,
      [`${prefix}Email`]: null,
      [`${prefix}Phone`]: null,
    };
  }
  return {
    [`${prefix}Id`]: summary.id,
    [`${prefix}Label`]: summary.label,
    [`${prefix}Email`]: summary.emailMasked,
    [`${prefix}Phone`]: summary.phoneMasked,
  };
}

function toStringId(value: PrimitiveId): string | null {
  if (value == null) return null;
  if (typeof value === "string") return value;
  if (typeof value === "number") return String(value);
  if (typeof (value as ObjectId).toHexString === "function") {
    return (value as ObjectId).toHexString();
  }
  return String(value);
}
