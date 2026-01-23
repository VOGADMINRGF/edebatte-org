// apps/web/src/utils/env.shared.ts
import { z } from "zod";

const SharedEnvSchema = z.object({
  NEXT_PUBLIC_APP_NAME: z.string().min(1),
  DEFAULT_LOCALE: z.string().default("de"),
  FALLBACK_LOCALE: z.string().default("en"),
});

export const ENV_SHARED = SharedEnvSchema.parse({
  NEXT_PUBLIC_APP_NAME: process.env.NEXT_PUBLIC_APP_NAME,
  DEFAULT_LOCALE: process.env.DEFAULT_LOCALE,
  FALLBACK_LOCALE: process.env.FALLBACK_LOCALE,
});

export type EnvShared = z.infer<typeof SharedEnvSchema>;
