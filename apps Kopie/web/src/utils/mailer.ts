// apps/web/src/utils/mailer.ts
// Robuster Mailversand: SMTP, sonst Console-Log-Fallback.

import nodemailer from "nodemailer";

let transporter: nodemailer.Transporter | null = null;

export async function sendMail(opts: {
  to: string;
  subject: string;
  html: string;
  text?: string;
}) {
  const { to, subject, html, text } = opts;

  const from = process.env.MAIL_FROM || "no-reply@localhost";
  const wantsSmtp = !!(
    process.env.SMTP_URL ||
    process.env.SMTP_HOST ||
    process.env.SMTP_USER
  );

  const logToConsole = (reason?: string) => {
    if (reason) console.warn("[mailer] SMTP-Fallback:", reason);
    console.log(`[MAIL->${to}] ${subject}\n${html}\n`);
    return { ok: true, dev: true, fallback: true as const };
  };

  if (!wantsSmtp) {
    // Kein SMTP konfiguriert → nur loggen
    return logToConsole();
  }

  try {
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

    await transporter.sendMail({
      from,
      to,
      subject,
      html,
      text: text ?? html.replace(/<[^>]+>/g, ""),
    });

    return { ok: true, smtp: true as const };
  } catch (e: any) {
    return logToConsole(e?.message || String(e));
  }
}
