import "server-only";
import { z } from "zod";

const AccountModeSchema = z.enum(["private_preUG", "org_postUG"]).catch("private_preUG");

function normalizeIban(raw?: string) {
  return raw?.replace(/\s+/g, "").toUpperCase();
}

function isValidIban(value: string) {
  const cleaned = normalizeIban(value);
  if (!cleaned || cleaned.length < 15 || cleaned.length > 34) return false;
  if (!/^[A-Z]{2}[0-9A-Z]+$/.test(cleaned)) return false;
  const rearranged = cleaned.slice(4) + cleaned.slice(0, 4);
  let remainder = 0;
  for (const ch of rearranged) {
    const code = ch.charCodeAt(0);
    const chunk = code >= 65 && code <= 90 ? String(code - 55) : ch;
    for (const digit of chunk) {
      remainder = (remainder * 10 + Number(digit)) % 97;
    }
  }
  return remainder === 1;
}

const EnvSchema = z.object({
  VOG_ACCOUNT_MODE: z.string().optional(),

  VOG_PAYMENT_BANK_RECIPIENT: z.string().trim().min(1),
  VOG_PAYMENT_BANK_IBAN: z
    .string()
    .trim()
    .min(10)
    .refine((value) => isValidIban(value), "invalid iban"),
  VOG_PAYMENT_BANK_BIC: z.string().optional().default(""),
  VOG_PAYMENT_BANK_NAME: z.string().optional().default(""),
  VOG_PAYMENT_REFERENCE_PREFIX: z.string().optional().default("eDebatte-"),

  VOG_MEMBERSHIP_CONTACT_EMAIL: z
    .string()
    .email()
    .optional()
    .default("members@edebatte.org"),
});

export type PaymentEnv = {
  accountMode: z.infer<typeof AccountModeSchema>;
  recipient: string;
  iban: string;
  bic: string;
  bankName: string;
  referencePrefix: string;
  membershipContactEmail: string;
};

export function getPaymentEnv(): PaymentEnv {
  const parsed = EnvSchema.safeParse(process.env);
  if (!parsed.success) {
    const msg = parsed.error.issues
      .map((i) => `${i.path.join(".")}: ${i.message}`)
      .join("; ");
    throw new Error(`[env] payment config invalid: ${msg}`);
  }

  const e = parsed.data;
  return {
    accountMode: AccountModeSchema.parse(e.VOG_ACCOUNT_MODE),
    recipient: e.VOG_PAYMENT_BANK_RECIPIENT,
    iban: e.VOG_PAYMENT_BANK_IBAN,
    bic: e.VOG_PAYMENT_BANK_BIC ?? "",
    bankName: e.VOG_PAYMENT_BANK_NAME ?? "",
    referencePrefix: e.VOG_PAYMENT_REFERENCE_PREFIX ?? "eDebatte-",
    membershipContactEmail: e.VOG_MEMBERSHIP_CONTACT_EMAIL ?? "members@edebatte.org",
  };
}
