// apps/web/src/utils/mailer.ts

import nodemailer from "nodemailer";
import {
  hasSmtpTransportConfig,
  resolveMailEnvelopeForRuntime,
} from "@/lib/server/webRuntimeEnv";
import {
  ensureTransactionalMail,
  type TransactionalMail,
} from "@/utils/mailRenderer";

let transporter: nodemailer.Transporter | null = null;

export type MailDeliveryRequirement =
  | "required_delivery"
  | "best_effort_delivery";

export type SendMailResult =
  | {
      ok: true;
      status: "delivered";
      transport: "smtp";
      category: null;
      retryable: false;
      attemptedCount: number;
      deliveredCount: number;
      failedCount: 0;
      messageId: string | null;
    }
  | {
      ok: false;
      status: "failed" | "partial";
      transport: "none" | "smtp";
      code: "mail_transport_unavailable" | "mail_transport_error";
      category: MailFailureCategory;
      retryable: boolean;
      attemptedCount: number;
      deliveredCount: number;
      failedCount: number;
      messageId: string | null;
    };

type MailFailureCode = Extract<SendMailResult, { ok: false }>["code"];

export type MailFailureCategory =
  | "recipient_invalid"
  | "recipient_placeholder_domain"
  | "recipient_test_domain_blocked"
  | "recipient_domain_not_allowed"
  | "mail_content_invalid"
  | "sender_configuration_invalid"
  | "smtp_unconfigured"
  | "smtp_auth_error"
  | "smtp_connection_error"
  | "smtp_timeout"
  | "smtp_response_error"
  | "smtp_unknown_error";

export function mailFailureMetadata(
  result: SendMailResult,
) {
  if (!("code" in result)) {
    throw new Error("mail_failure_metadata_requires_failure");
  }
  return {
    status: result.status,
    category: result.category,
    retryable: result.retryable,
    attemptedCount: result.attemptedCount,
    deliveredCount: result.deliveredCount,
    failedCount: result.failedCount,
  };
}

const RESERVED_PLACEHOLDER_DOMAINS = new Set([
  "example.org",
  "example.com",
  "example.net",
]);

const EMAIL_PATTERN =
  /^[a-z0-9.!#$%&'*+/=?^_`{|}~-]+@[a-z0-9](?:[a-z0-9-]{0,61}[a-z0-9])?(?:\.[a-z0-9](?:[a-z0-9-]{0,61}[a-z0-9])?)+$/i;


function normalizeOptionalHeaders(value?: Record<string, string>) {
  if (!value) return { ok: true as const, headers: undefined };
  const headers: Record<string, string> = {};
  for (const [rawName, rawValue] of Object.entries(value)) {
    const name = rawName.trim();
    const headerValue = rawValue.trim();
    if (!name || !headerValue || /[\r\n]/.test(name) || /[\r\n]/.test(headerValue) || !/^[A-Za-z0-9-]+$/.test(name)) return { ok: false as const, headers: undefined };
    headers[name] = headerValue;
  }
  return { ok: true as const, headers };
}

function deriveNewsletterListHeaders(tag: string | undefined, mail: TransactionalMail) {
  if (tag !== "newsletter_personalized_digest") return undefined;
  const source = `${mail.text}\n${mail.html}`;
  const match = source.match(/https:\/\/[^\s<>"']+\/updates\/unsubscribe\?token=[A-Za-z0-9._%~-]+/);
  if (!match?.[0]) return undefined;
  try {
    const url = new URL(match[0]);
    if (url.protocol !== "https:") return undefined;
    url.pathname = "/api/public/updates/unsubscribe";
    return { "List-Unsubscribe": `<${url.toString()}>`, "List-Unsubscribe-Post": "List-Unsubscribe=One-Click" };
  } catch { return undefined; }
}

export async function sendMail(opts: {
  to: string | string[];
  mail: TransactionalMail;
  delivery: MailDeliveryRequirement;
  tag?: string;
  headers?: Record<string, string>;
}): Promise<SendMailResult> {
  const recipients = recipientsToArray(opts.to);
  const recipient = recipients[0] ?? "";
  const domain = emailDomain(recipient);
  const wantsSmtp = hasSmtpTransportConfig();

  const logFailure = (
    code: MailFailureCode,
    category: MailFailureCategory,
    counts: {
      attemptedCount: number;
      deliveredCount: number;
      failedCount: number;
    },
    error?: unknown,
    messageId?: string | null,
  ) => {
    const singleRecipient = recipients.length === 1;
    const status = counts.deliveredCount > 0 ? "partial" : "failed";
    console.warn("[mailer] delivery_blocked", {
      code,
      category,
      status,
      delivery: opts.delivery,
      tag: opts.tag ?? "generic",
      recipient: singleRecipient ? maskEmail(recipient) : "[multiple]",
      domain: singleRecipient ? domain : null,
      recipientCount: recipients.length,
      attemptedCount: counts.attemptedCount,
      deliveredCount: counts.deliveredCount,
      failedCount: counts.failedCount,
      messageId: messageId ?? null,
    });
    return {
      ok: false,
      status,
      transport: counts.attemptedCount > 0 ? "smtp" : "none",
      code,
      category,
      retryable: isRetryableFailure(category, error),
      attemptedCount: counts.attemptedCount,
      deliveredCount: counts.deliveredCount,
      failedCount: counts.failedCount,
      messageId: messageId ?? null,
    } as const;
  };

  if (recipients.length === 0) {
    return logFailure(
      "mail_transport_unavailable",
      "recipient_invalid",
      emptyFailureCounts(0),
    );
  }

  for (const currentRecipient of recipients) {
    const recipientPolicy = evaluateRecipientPolicy(
      currentRecipient,
      emailDomain(currentRecipient),
      process.env,
    );
    if (recipientPolicy.allowed === false) {
      return logFailure(
        "mail_transport_unavailable",
        recipientPolicy.category,
        emptyFailureCounts(recipients.length),
      );
    }
  }

  const normalizedHeaders = normalizeOptionalHeaders(opts.headers);
  if (!normalizedHeaders.ok) return logFailure("mail_transport_unavailable", "mail_content_invalid", emptyFailureCounts(recipients.length));

  if (!wantsSmtp) {
    return logFailure(
      "mail_transport_unavailable",
      "smtp_unconfigured",
      emptyFailureCounts(recipients.length),
    );
  }

  try {
    const envelope = resolveMailEnvelopeForRuntime();
    const mail = ensureTransactionalMail(opts.mail);
    const effectiveHeaders = normalizedHeaders.headers ?? deriveNewsletterListHeaders(opts.tag, mail);

    if (!transporter) {
      transporter = process.env.SMTP_URL
        ? nodemailer.createTransport(process.env.SMTP_URL as string)
        : nodemailer.createTransport({
            host: process.env.SMTP_HOST,
            port: Number(process.env.SMTP_PORT || 587),
            secure:
              String(process.env.SMTP_SECURE || "").toLowerCase() === "true",
            auth: process.env.SMTP_USER
              ? { user: process.env.SMTP_USER, pass: process.env.SMTP_PASS }
              : undefined,
          });
    }

    const deliveries = await Promise.allSettled(
      recipients.map((currentRecipient) =>
        transporter!.sendMail({
          from: envelope.from,
          replyTo: envelope.replyTo,
          to: currentRecipient,
          subject: mail.subject,
          html: mail.html,
          text: mail.text,
          headers: effectiveHeaders,
        }),
      ),
    );
    const failedDeliveries = deliveries.filter(
      (delivery): delivery is PromiseRejectedResult =>
        delivery.status === "rejected",
    );
    const deliveredCount = deliveries.length - failedDeliveries.length;

    if (failedDeliveries.length > 0) {
      const classifiedFailures = failedDeliveries.map((delivery) => {
        const category = classifyTransportError(delivery.reason);
        return {
          error: delivery.reason,
          category,
          retryable: isRetryableFailure(category, delivery.reason),
        };
      });
      const representativeFailure =
        classifiedFailures.find((failure) => failure.retryable) ??
        classifiedFailures[0]!;
      return logFailure(
        "mail_transport_error",
        representativeFailure.category,
        {
          attemptedCount: deliveries.length,
          deliveredCount,
          failedCount: failedDeliveries.length,
        },
        representativeFailure.error,
        recipients.length === 1 &&
          typeof (representativeFailure.error as { messageId?: unknown })
            ?.messageId === "string"
          ? String(
              (representativeFailure.error as { messageId: string }).messageId,
            )
          : null,
      );
    }

    const singleDelivery = deliveries[0];
    const singleInfo =
      recipients.length === 1 && singleDelivery?.status === "fulfilled"
        ? singleDelivery.value
        : null;

    return {
      ok: true,
      status: "delivered",
      transport: "smtp",
      category: null,
      retryable: false,
      attemptedCount: recipients.length,
      deliveredCount: recipients.length,
      failedCount: 0,
      messageId:
        typeof singleInfo?.messageId === "string" ? singleInfo.messageId : null,
    };
  } catch (error: unknown) {
    const category =
      error instanceof Error &&
      error.message === "mail_content_provenance_invalid"
        ? "mail_content_invalid"
        : error instanceof Error &&
            (error.name === "CriticalProductionWebRuntimeEnvError" ||
              error.message === "mail_cta_url_invalid")
          ? "sender_configuration_invalid"
        : classifyTransportError(error);
    return logFailure(
      "mail_transport_error",
      category,
      emptyFailureCounts(recipients.length),
      error,
      typeof (error as { messageId?: unknown })?.messageId === "string"
        ? String((error as { messageId: string }).messageId)
        : null,
    );
  }
}

function emptyFailureCounts(failedCount: number) {
  return {
    attemptedCount: 0,
    deliveredCount: 0,
    failedCount,
  };
}

function recipientsToArray(value: string | string[]) {
  return Array.from(
    new Set(
      (Array.isArray(value) ? value : [value])
        .flatMap((entry) => entry.split(","))
        .map(normalizeEmail)
        .filter(Boolean),
    ),
  );
}

function normalizeEmail(value: string) {
  return value.trim().toLowerCase();
}

function emailDomain(value: string) {
  return normalizeEmail(value).split("@")[1] ?? null;
}

function maskEmail(value: string) {
  const [name, domain] = normalizeEmail(value).split("@");
  if (!name || !domain) return "[invalid-email]";
  const head = name.slice(0, 2);
  return `${head}${name.length > 2 ? "***" : ""}@${domain}`;
}

function evaluateRecipientPolicy(
  recipient: string,
  domain: string | null,
  env: NodeJS.ProcessEnv,
): { allowed: true } | { allowed: false; category: MailFailureCategory } {
  if (!recipient || !EMAIL_PATTERN.test(recipient)) {
    return { allowed: false, category: "recipient_invalid" };
  }

  if (!domain) {
    return { allowed: false, category: "recipient_invalid" };
  }

  if (isReservedPlaceholderDomain(domain) || domain.endsWith(".invalid")) {
    return { allowed: false, category: "recipient_placeholder_domain" };
  }

  if (isBlockedTestDomain(domain, env)) {
    return { allowed: false, category: "recipient_test_domain_blocked" };
  }

  const explicitAllowlist = parseExplicitAllowlist(env.MAIL_ALLOWED_RECIPIENT_DOMAINS);
  if (explicitAllowlist && !explicitAllowlist.has(domain)) {
    return { allowed: false, category: "recipient_domain_not_allowed" };
  }

  return { allowed: true };
}

function isReservedPlaceholderDomain(domain: string) {
  for (const reserved of RESERVED_PLACEHOLDER_DOMAINS) {
    if (domain === reserved || domain.endsWith(`.${reserved}`)) {
      return true;
    }
  }
  return false;
}

function isBlockedTestDomain(domain: string, env: NodeJS.ProcessEnv) {
  const nodeEnv = String(env.NODE_ENV ?? "").toLowerCase();
  const isDevLike = nodeEnv === "test" || nodeEnv === "development";
  if (isDevLike) return false;
  return domain === "edebatte.test" || domain.endsWith(".test");
}

function parseExplicitAllowlist(value: string | undefined) {
  if (typeof value !== "string") return null;
  const entries = value
    .split(",")
    .map((entry) => entry.trim().toLowerCase())
    .filter(Boolean);
  return entries.length > 0 ? new Set(entries) : null;
}

function classifyTransportError(error: unknown): MailFailureCategory {
  const code =
    typeof (error as { code?: unknown })?.code === "string"
      ? String((error as { code: string }).code).toUpperCase()
      : null;

  switch (code) {
    case "EAUTH":
      return "smtp_auth_error";
    case "ETIMEDOUT":
      return "smtp_timeout";
    case "ECONNECTION":
    case "ECONNREFUSED":
    case "ESOCKET":
    case "ENOTFOUND":
      return "smtp_connection_error";
    case "EENVELOPE":
    case "EMESSAGE":
      return "smtp_response_error";
    default:
      return typeof (error as { responseCode?: unknown })?.responseCode === "number"
        ? "smtp_response_error"
        : "smtp_unknown_error";
  }
}

function isRetryableFailure(
  category: MailFailureCategory,
  error?: unknown,
): boolean {
  switch (category) {
    case "smtp_connection_error":
    case "smtp_timeout":
    case "smtp_unknown_error":
      return true;
    case "smtp_response_error": {
      const responseCode = (error as { responseCode?: unknown })?.responseCode;
      return typeof responseCode === "number"
        ? responseCode >= 400 && responseCode < 500
        : false;
    }
    case "recipient_invalid":
    case "recipient_placeholder_domain":
    case "recipient_test_domain_blocked":
    case "recipient_domain_not_allowed":
    case "mail_content_invalid":
    case "sender_configuration_invalid":
    case "smtp_unconfigured":
    case "smtp_auth_error":
      return false;
  }
}
