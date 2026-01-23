import { env } from "@/utils/env";
import { BRAND } from "@/lib/brand";
import type { Transporter } from "nodemailer";
import nodemailer from "nodemailer";

type Mail = {
  to: string | string[];
  subject: string;
  html: string;
  text?: string;
};
type AlertItem = { name: string; error?: string; ms?: number };
type AlertMail = {
  to: string | string[];
  title: string;
  severity?: "info" | "warn" | "error";
  items?: AlertItem[];
  linkHref?: string; // z.B. "/admin/system"
  linkLabel?: string; // z.B. "Systemübersicht öffnen"
  note?: string; // freie Zusatzzeile
};
const PUBLIC_BASE =
  process.env.PUBLIC_BASE_URL ||
  process.env.NEXT_PUBLIC_BASE_URL ||
  BRAND.baseUrl ||
  "http://localhost:3000";

// Cache den Transporter (Singleton)
let transporterPromise: Promise<Transporter | null> | null = null;

function recipientsToArray(to: string | string[] | undefined): string[] {
  if (!to) return [];
  const raw = Array.isArray(to) ? to.join(",") : to;
  return raw
    .split(",")
    .map((s) => s.trim())
    .filter(Boolean);
}

async function getTransporter(): Promise<Transporter | null> {
  // Kein SMTP konfiguriert -> dev/console
  const url = process.env.SMTP_URL; // optional: vollständige URL wie smtp://user:pass@host:port
  const host = process.env.SMTP_HOST;
  const port = process.env.SMTP_PORT
    ? Number(process.env.SMTP_PORT)
    : undefined;

  if (!url && (!host || !port)) return null;

  if (!transporterPromise) {
    transporterPromise = (async () => {
      try {
        const secureEnv = process.env.SMTP_SECURE?.toLowerCase();
        const secure =
          secureEnv === "true" || secureEnv === "1" || (!!port && port === 465); // 465 meist „secure“

        const user = process.env.SMTP_USER;
        const pass = process.env.SMTP_PASS;

        // Optional DKIM
        const dkimDomain = process.env.DKIM_DOMAIN;
        const dkimSelector = process.env.DKIM_SELECTOR;
        const dkimKey = process.env.DKIM_PRIVATE_KEY;

        const baseOptions = url
          ? { url }
          : {
              host,
              port,
              secure,
              auth: user && pass ? { user, pass } : undefined,
            };

        const transporter = nodemailer.createTransport({
          ...baseOptions,
          // Timeouts konservativ setzen
          connectionTimeout: 10_000,
          greetingTimeout: 10_000,
          socketTimeout: 20_000,
          // Optional DKIM
          dkim:
            dkimDomain && dkimSelector && dkimKey
              ? {
                  domainName: dkimDomain,
                  keySelector: dkimSelector,
                  privateKey: dkimKey,
                }
              : undefined,
        });

        // Verbindungsprobe (wirft bei Fehlkonfig)
        await transporter.verify();
        return transporter;
      } catch (err) {
        // Fallback: Kein harter Absturz – wir gehen in dev/console-Mode
        console.warn(
          "[MAIL] SMTP verify failed – falling back to console log:",
          err,
        );
        return null;
      }
    })();
  }

  return transporterPromise;
}

/**
 * Schickt eine generische E-Mail. Fällt auf Console-Log zurück, wenn kein SMTP konfiguriert ist.
 */
export async function sendMail({ to, subject, html, text }: Mail) {
  const toList = recipientsToArray(to);
  if (toList.length === 0) {
    console.warn("[MAIL] no recipients provided");
    return { ok: false, error: "NO_RECIPIENTS" as const };
  }

  const transporter = await getTransporter();

  if (!transporter) {
    // Dev/Console-Fallback
    console.log("[MAIL:DEV] to=%s | subject=%s", toList.join(", "), subject);
    console.log("[MAIL:BODY]\n" + html);
    return { ok: true, dev: true as const };
  }

  try {
    const info = await transporter.sendMail({
      from: env.EMAIL_DEFAULT_FROM,
      to: toList,
      subject,
      // Beides mitsenden – viele Clients bevorzugen text
      text: text ?? htmlToText(html),
      html,
    });
    return { ok: true, id: info.messageId };
  } catch (err: any) {
    console.error("[MAIL:SMTP:ERROR]", err);
    return { ok: false, error: err?.message ?? "SEND_FAILED" };
  }
}

/**
 * Kurzer Helper für Alert-Mails (z.B. Monitoring).
 */
export async function sendAlertEmail({
  to,
  title,
  severity = "error",
  items = [],
  linkHref = "/admin/system",
  linkLabel = "Systemübersicht öffnen",
  note,
}: AlertMail) {
  const subject = `[eDebatte Alert] ${title}`;
  const html = renderAlertHtml({
    title,
    severity,
    items,
    linkHref,
    linkLabel,
    note,
  });
  const text = renderAlertText({
    title,
    severity,
    items,
    linkHref,
    linkLabel,
    note,
  });
  return sendMail({ to, subject, html, text });
}

// ---------- Render-Helfer ----------

function badgeColor(sev: "info" | "warn" | "error") {
  switch (sev) {
    case "info":
      return "#2563eb"; // blau
    case "warn":
      return "#d97706"; // orange
    default:
      return "#dc2626"; // rot
  }
}

function renderAlertHtml(params: {
  title: string;
  severity: "info" | "warn" | "error";
  items: AlertItem[];
  linkHref: string;
  linkLabel: string;
  note?: string;
}) {
  const { title, severity, items, linkHref, linkLabel, note } = params;
  const abs = toAbsolute(linkHref);
  const color = badgeColor(severity);

  const rows =
    items.length === 0
      ? `<tr><td style="padding:8px 0;color:#111827;font-size:14px;">(keine Details)</td></tr>`
      : items
          .map(
            (it) => `
            <tr>
              <td style="padding:6px 0;font-family:system-ui,Segoe UI,Roboto,Helvetica,Arial,sans-serif;font-size:14px;">
                <strong>${escapeHtml(it.name)}</strong>
                ${it.ms ? `<span style="opacity:.6">(${it.ms} ms)</span>` : ""}
                ${it.error ? `<div style="color:#dc2626;margin-top:2px;">${escapeHtml(it.error)}</div>` : ""}
              </td>
            </tr>`,
          )
          .join("");

  return `
  <div style="font-family:system-ui,Segoe UI,Roboto,Helvetica,Arial,sans-serif;line-height:1.45;color:#111827;">
    <div style="font-size:16px;">
      <span style="display:inline-block;padding:2px 8px;border-radius:9999px;background:${color};color:#fff;font-weight:600;margin-right:8px;">
        ${severity.toUpperCase()}
      </span>
      <strong>${escapeHtml(title)}</strong>
    </div>
    ${note ? `<p style="margin:12px 0 0;">${escapeHtml(note)}</p>` : ""}
    <table role="presentation" style="margin-top:14px;border-collapse:collapse;">
      ${rows}
    </table>
    <p style="margin-top:16px;">
      <a href="${abs}" style="display:inline-block;padding:8px 12px;background:#111827;color:#fff;border-radius:8px;text-decoration:none;">
        ${escapeHtml(linkLabel)}
      </a>
    </p>
    <p style="margin-top:8px;font-size:12px;opacity:.7;">${abs}</p>
  </div>
  `;
}

function renderAlertText(params: {
  title: string;
  severity: "info" | "warn" | "error";
  items: AlertItem[];
  linkHref: string;
  linkLabel: string;
  note?: string;
}) {
  const { title, severity, items, linkHref, linkLabel, note } = params;
  const abs = toAbsolute(linkHref);

  const lines = [
    `[${severity.toUpperCase()}] ${title}`,
    note ? note : "",
    "",
    ...(items.length
      ? items.map(
          (it) =>
            `- ${it.name}${it.ms ? ` (${it.ms} ms)` : ""}${it.error ? ` — ${it.error}` : ""}`,
        )
      : ["(keine Details)"]),
    "",
    `${linkLabel}: ${abs}`,
  ].filter(Boolean);

  return lines.join("\n");
}

function toAbsolute(href: string) {
  if (!href) return PUBLIC_BASE;
  if (href.startsWith("http://") || href.startsWith("https://")) return href;
  return `${PUBLIC_BASE.replace(/\/+$/, "")}${href.startsWith("/") ? "" : "/"}${href}`;
}

function htmlToText(html: string) {
  // super simpler Fallback – ausreichend für Alerts
  return html
    .replace(/<br\s*\/?>/gi, "\n")
    .replace(/<\/(p|div|tr)>/gi, "\n")
    .replace(/<[^>]+>/g, "")
    .replace(/\n{3,}/g, "\n\n")
    .trim();
}

function escapeHtml(s: string) {
  return s
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;")
    .replaceAll("'", "&#039;");
}

// Öffentliche Links für Mails
export function verificationEmailLink(token: string) {
  return `${PUBLIC_BASE}/verify?token=${encodeURIComponent(token)}`;
}

export function resetEmailLink(token: string) {
  return `${PUBLIC_BASE}/reset?token=${encodeURIComponent(token)}`;
}
