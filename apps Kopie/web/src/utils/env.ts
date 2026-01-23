// apps/web/src/utils/env.ts
import { z } from "zod";

/** Striktes Env-Layer mit Legacy-Aliassen für alten Code. */
const BaseSchema = z
  .object({
    // RUNTIME
    NODE_ENV: z.enum(["development", "test", "production"]).default("development"),

    // AUTH / SECURITY
    JWT_SECRET: z.string().min(10, "JWT_SECRET too short"),
    BCRYPT_ROUNDS: z.coerce.number().int().positive().default(12),
    SESSION_TTL_DAYS: z.coerce.number().int().positive().default(7),
    EDITOR_TOKEN: z.string().optional(),

    // EMAIL (mind. eins von beiden muss gesetzt sein)
    MAIL_FROM: z.string().optional(),
    SMTP_FROM: z.string().optional(),

    // --- MONGO (pro DB eigene URI + Name) ---
    CORE_DB_NAME: z.string().min(1),
    CORE_MONGODB_URI: z.string().min(1),

    VOTES_DB_NAME: z.string().min(1),
    VOTES_MONGODB_URI: z.string().min(1),

    PII_DB_NAME: z.string().min(1),
    PII_MONGODB_URI: z.string().min(1),

    AI_CORE_READER_DB_NAME: z.string().min(1),
    AI_CORE_READER_MONGODB_URI: z.string().min(1),

    // Legacy (optional): globale Mongo-URI für Altcode
    MONGODB_URI: z.string().optional(),

    // GRAPH: Neo4j
    NEO4J_URI: z.string().min(1),
    NEO4J_USER: z.string().min(1),
    NEO4J_PASSWORD: z.string().min(1),

    // GRAPH: Arango
    ARANGO_URL: z.string().min(1),
    ARANGO_DB: z.string().min(1),
    ARANGO_USER: z.string().min(1),
    ARANGO_ROOT_PASSWORD: z.string().min(1),

    // GRAPH: Memgraph (User/Pass optional)
    MEMGRAPH_URI: z.string().min(1),
    MEMGRAPH_USER: z.string().optional(),
    MEMGRAPH_PASSWORD: z.string().optional(),

    // AI / PROVIDER
    OPENAI_API_KEY: z.string().optional(),
    OPENAI_MODEL: z.string().min(1).optional().default("gpt-4.1-mini"),
    OPENAI_TIMEOUT_MS: z.coerce.number().int().positive().default(30000),
    OPENAI_URL: z
      .string()
      .url()
      .default("https://api.openai.com/v1/chat/completions"),
  })
  .superRefine((v, ctx) => {
    // mindestens eine Absender-Quelle
    if (!v.MAIL_FROM && !v.SMTP_FROM) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        message: "MAIL_FROM oder SMTP_FROM muss gesetzt sein",
        path: ["MAIL_FROM"],
      });
    }
  });

const p = BaseSchema.parse({
  NODE_ENV: process.env.NODE_ENV,

  JWT_SECRET: process.env.JWT_SECRET,
  BCRYPT_ROUNDS: process.env.BCRYPT_ROUNDS,
  SESSION_TTL_DAYS: process.env.SESSION_TTL_DAYS,
  EDITOR_TOKEN: process.env.EDITOR_TOKEN,

  MAIL_FROM: process.env.MAIL_FROM,
  SMTP_FROM: process.env.SMTP_FROM,

  CORE_DB_NAME: process.env.CORE_DB_NAME,
  CORE_MONGODB_URI: process.env.CORE_MONGODB_URI,

  VOTES_DB_NAME: process.env.VOTES_DB_NAME,
  VOTES_MONGODB_URI: process.env.VOTES_MONGODB_URI,

  PII_DB_NAME: process.env.PII_DB_NAME,
  PII_MONGODB_URI: process.env.PII_MONGODB_URI,

  AI_CORE_READER_DB_NAME: process.env.AI_CORE_READER_DB_NAME,
  AI_CORE_READER_MONGODB_URI: process.env.AI_CORE_READER_MONGODB_URI,

  MONGODB_URI: process.env.MONGODB_URI, // legacy optional

  NEO4J_URI: process.env.NEO4J_URI,
  NEO4J_USER: process.env.NEO4J_USER,
  NEO4J_PASSWORD: process.env.NEO4J_PASSWORD,

  ARANGO_URL: process.env.ARANGO_URL,
  ARANGO_DB: process.env.ARANGO_DB,
  ARANGO_USER: process.env.ARANGO_USER,
  ARANGO_ROOT_PASSWORD: process.env.ARANGO_ROOT_PASSWORD,

  MEMGRAPH_URI: process.env.MEMGRAPH_URI,
  MEMGRAPH_USER: process.env.MEMGRAPH_USER,
  MEMGRAPH_PASSWORD: process.env.MEMGRAPH_PASSWORD,

  OPENAI_API_KEY: process.env.OPENAI_API_KEY,
  OPENAI_MODEL: process.env.OPENAI_MODEL,
  OPENAI_TIMEOUT_MS: process.env.OPENAI_TIMEOUT_MS,
  OPENAI_URL: process.env.OPENAI_URL,
});

export type Env = typeof p;

/** Export + Backwards-Compat-Aliasse */
export const env: Env & {
  EMAIL_DEFAULT_FROM: string;
  MONGO_URI: string;
  MODEL: string;
  TIMEOUT_MS: number;
  NEO4J_PASS: string;
} = {
  ...p,

  // Kompatibilität: alter Code nutzt diese Felder
  EMAIL_DEFAULT_FROM: p.SMTP_FROM ?? (p.MAIL_FROM as string),
  MONGO_URI: p.MONGODB_URI ?? p.CORE_MONGODB_URI,
  MODEL: p.OPENAI_MODEL,
  TIMEOUT_MS: p.OPENAI_TIMEOUT_MS,
  NEO4J_PASS: p.NEO4J_PASSWORD,
};
