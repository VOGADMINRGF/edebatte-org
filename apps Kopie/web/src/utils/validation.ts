// apps/web/src/utils/validation.ts
import { z } from "zod";

export const IdSchema = z.string().min(8);
export const UserHashSchema = z.string().min(16);
export const VoteSchema = z.object({
  statementId: IdSchema,
  userHash: UserHashSchema,
  vote: z.enum(["agree", "neutral", "disagree"]),
});
