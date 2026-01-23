// apps/web/src/types/env.d.ts
/// <reference types="node" />
declare namespace NodeJS {
  interface ProcessEnv {
    CORE_DATABASE_URL?: string;
    WEB_DATABASE_URL?: string;
    OPENAI_API_KEY?: string;
    UPSTASH_REDIS_REST_URL?: string;
    UPSTASH_REDIS_REST_TOKEN?: string;
    CONTACT_INBOX?: string;
    MAIL_FROM?: string;
    SMTP_URL?: string;
    SMTP_HOST?: string;
    SMTP_PORT?: string;
    SMTP_USER?: string;
    SMTP_PASS?: string;
    SMTP_SECURE?: string;
    CONTACT_LOG_SALT?: string;
    TURNSTILE_SECRET_KEY?: string;
    NEXT_PUBLIC_TURNSTILE_SITE_KEY?: string;
    NODE_ENV?: "development" | "test" | "production";
  }
}
