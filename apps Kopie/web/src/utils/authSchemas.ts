// apps/web/src/utils/authSchemas.ts
import { z } from "zod";

export const RegisterSchema = z.object({
  email: z.string().email().max(320),
  password: z.string().min(8).max(200),
  name: z.string().min(2).max(100),
});

export const LoginSchema = z.object({
  email: z.string().email().max(320),
  password: z.string().min(8).max(200),
});

export const ResetRequestSchema = z.object({
  email: z.string().email().max(320),
});

export const ResetSetSchema = z.object({
  token: z.string().min(20),
  password: z.string().min(8).max(200),
  invite: z.string().min(20).optional(),
});
