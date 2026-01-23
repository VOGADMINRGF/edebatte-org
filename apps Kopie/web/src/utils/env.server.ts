// apps/web/src/utils/env.server.ts
import { config } from "dotenv";

// .env.local zuerst, sonst fallback auf .env
config({ path: ".env.local" });
config();

import { z } from "zod";

const bool = (v: any) => String(v).toLowerCase() === "true";

const ServerEnvSchema = z.object({
  NODE_ENV: z
    .enum(["development", "test", "production"])
    .default("development"),

  // Keine Pflicht, wenn NextAuth nicht genutzt wird:
  NEXTAUTH_URL: z.string().url().optional(),
  NEXTAUTH_SECRET: z.string().min(16).optional(), // <- .min(16).optional() (ohne Komma)

  CORE_MONGODB_URI: z.string().min(1),
  CORE_DB_NAME: z.string().min(1),

  PII_MONGODB_URI: z.string().min(1),
  PII_DB_NAME: z.string().min(1),

  VOTES_MONGODB_URI: z.string().min(1),
  VOTES_DB_NAME: z.string().min(1),

  PUBLIC_ID_SALT: z.string().min(16),

  AI_CORE_READER_MONGODB_URI: z.string().optional(),
  AI_CORE_READER_DB_NAME: z.string().optional(),

  NEO4J_URI: z.string().optional(),
  NEO4J_USER: z.string().optional(),
  NEO4J_PASSWORD: z.string().optional(),

  ARANGO_URL: z.string().optional(),
  ARANGO_DB: z.string().optional(),
  ARANGO_USER: z.string().optional(),
  ARANGO_PASSWORD: z.string().optional(),

  MEMGRAPH_URI: z.string().optional(),
  MEMGRAPH_USER: z.string().optional(),
  MEMGRAPH_PASSWORD: z.string().optional(),

  ELASTICSEARCH_URL: z.string().optional(),
  ELASTICSEARCH_API_KEY: z.string().optional(),

  TYPESENSE_HOST: z.string().optional(),
  TYPESENSE_PORT: z.coerce.number().optional(),
  TYPESENSE_PROTOCOL: z.enum(["http", "https"]).optional(),
  TYPESENSE_API_KEY: z.string().optional(),

  REDIS_URL: z.string().optional(),

  OPENAI_API_KEY: z.string().optional(),
  OPENAI_BASE_URL: z.string().optional(),
  OPENAI_MODEL: z.string().optional(),

  MISTRAL_API_KEY: z.string().optional(),
  MISTRAL_MODEL: z.string().optional(),

  GEMINI_API_KEY: z.string().optional(),
  GEMINI_MODEL: z.string().optional(),

  YOU_API_KEY: z.string().optional(),
  YOU_API_BASE: z.string().optional(),
  YOU_MODEL: z.string().optional(),

  FEATURE_GRAPHDB: z.string().transform(bool).default(false),
  FEATURE_SEARCH: z.string().transform(bool).default(true),
  FEATURE_TYPESENSE: z.string().transform(bool).default(false),
  FEATURE_ELASTIC: z.string().transform(bool).default(true),
  FEATURE_AI_ARBITER: z.string().transform(bool).default(true),
  FEATURE_TRANSLATION_CACHE: z.string().transform(bool).default(true),

  CORS_ALLOWED_ORIGINS: z.string().optional(),
  JWT_SECRET: z.string().min(16),
});

export const ENV = ServerEnvSchema.parse({
  NODE_ENV: process.env.NODE_ENV,
  NEXTAUTH_URL: process.env.NEXTAUTH_URL,
  NEXTAUTH_SECRET: process.env.NEXTAUTH_SECRET,

  CORE_MONGODB_URI: process.env.CORE_MONGODB_URI,
  CORE_DB_NAME: process.env.CORE_DB_NAME,

  PII_MONGODB_URI: process.env.PII_MONGODB_URI,
  PII_DB_NAME: process.env.PII_DB_NAME,

  VOTES_MONGODB_URI: process.env.VOTES_MONGODB_URI,
  VOTES_DB_NAME: process.env.VOTES_DB_NAME,

  PUBLIC_ID_SALT: process.env.PUBLIC_ID_SALT,

  AI_CORE_READER_MONGODB_URI: process.env.AI_CORE_READER_MONGODB_URI,
  AI_CORE_READER_DB_NAME: process.env.AI_CORE_READER_DB_NAME,

  NEO4J_URI: process.env.NEO4J_URI,
  NEO4J_USER: process.env.NEO4J_USER,
  NEO4J_PASSWORD: process.env.NEO4J_PASSWORD,

  ARANGO_URL: process.env.ARANGO_URL,
  ARANGO_DB: process.env.ARANGO_DB,
  ARANGO_USER: process.env.ARANGO_USER,
  ARANGO_PASSWORD: process.env.ARANGO_PASSWORD,

  MEMGRAPH_URI: process.env.MEMGRAPH_URI,
  MEMGRAPH_USER: process.env.MEMGRAPH_USER,
  MEMGRAPH_PASSWORD: process.env.MEMGRAPH_PASSWORD,

  ELASTICSEARCH_URL: process.env.ELASTICSEARCH_URL,
  ELASTICSEARCH_API_KEY: process.env.ELASTICSEARCH_API_KEY,

  TYPESENSE_HOST: process.env.TYPESENSE_HOST,
  TYPESENSE_PORT: process.env.TYPESENSE_PORT,
  TYPESENSE_PROTOCOL: process.env.TYPESENSE_PROTOCOL,
  TYPESENSE_API_KEY: process.env.TYPESENSE_API_KEY,

  REDIS_URL: process.env.REDIS_URL,

  OPENAI_API_KEY: process.env.OPENAI_API_KEY,
  OPENAI_BASE_URL: process.env.OPENAI_BASE_URL,
  OPENAI_MODEL: process.env.OPENAI_MODEL,

  MISTRAL_API_KEY: process.env.MISTRAL_API_KEY,
  MISTRAL_MODEL: process.env.MISTRAL_MODEL,

  GEMINI_API_KEY: process.env.GEMINI_API_KEY,
  GEMINI_MODEL: process.env.GEMINI_MODEL,

  YOU_API_KEY: process.env.YOU_API_KEY,
  YOU_API_BASE: process.env.YOU_API_BASE,
  YOU_MODEL: process.env.YOU_MODEL,

  FEATURE_GRAPHDB: process.env.FEATURE_GRAPHDB ?? "false",
  FEATURE_SEARCH: process.env.FEATURE_SEARCH ?? "true",
  FEATURE_TYPESENSE: process.env.FEATURE_TYPESENSE ?? "false",
  FEATURE_ELASTIC: process.env.FEATURE_ELASTIC ?? "true",
  FEATURE_AI_ARBITER: process.env.FEATURE_AI_ARBITER ?? "true",
  FEATURE_TRANSLATION_CACHE: process.env.FEATURE_TRANSLATION_CACHE ?? "true",

  CORS_ALLOWED_ORIGINS: process.env.CORS_ALLOWED_ORIGINS,
  JWT_SECRET: process.env.JWT_SECRET,
});

export type Env = z.infer<typeof ServerEnvSchema>;
