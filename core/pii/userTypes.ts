import { z } from "zod";

export const piiUserSchema = z.object({
  personal: z
    .object({
      givenName: z.string().trim().optional(),
      familyName: z.string().trim().optional(),
      yearOfBirth: z.number().int().min(1900).max(new Date().getFullYear()).optional(),
      city: z.string().trim().optional(),
      profession: z.string().trim().optional(),
      pronouns: z.string().trim().optional(),
    })
    .optional(),
  contacts: z.object({
    emailPrimary: z.string().email(),
    phone: z.string().trim().optional(),
  }),
  bank: z
    .object({
      // Placeholder for existing PaymentProfile shape / reference
    })
    .passthrough()
    .optional(),
  flags: z
    .object({
      hasVerifiedBankProfile: z.boolean().optional(),
    })
    .optional(),
});

export type PiiUser = z.infer<typeof piiUserSchema>;
