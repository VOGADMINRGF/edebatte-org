import type { BankDetails } from "@/config/banking";
import type { MembershipRhythm } from "@core/memberships/types";

type VerificationTemplateInput = {
  verifyUrl: string;
  displayName?: string | null;
  locale?: string;
};

export function buildVerificationMail({ verifyUrl, displayName }: VerificationTemplateInput) {
  const greeting = displayName ? `Hallo ${displayName}` : "Hallo";
  const buttonStyle =
    "display:inline-flex;padding:12px 20px;border-radius:999px;background:#0f172a;color:#fff;text-decoration:none;font-weight:700;letter-spacing:0.3px;font-size:15px;";

  const cleanToken = (() => {
    const tokenPart = verifyUrl.split("token=").pop() ?? verifyUrl;
    return tokenPart.split("&email")[0];
  })();

  const html = `
    <table width="100%" cellpadding="0" cellspacing="0" role="presentation" style="font-family: 'Inter', system-ui, -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif; color:#0f172a;">
      <tr><td style="padding:12px 0;">${greeting},</td></tr>
      <tr><td style="padding:6px 0 12px 0; font-size:15px; line-height:1.5;">
        schön, dass du bei eDebatte dabei sein möchtest. Bitte bestätige deine E-Mail-Adresse, damit wir dein Konto freischalten können.
      </td></tr>
      <tr><td style="padding:12px 0;">
        <a href="${verifyUrl}" style="${buttonStyle}">
          E-Mail jetzt bestätigen
        </a>
      </td></tr>
      <tr><td style="padding:10px 0 6px 0; font-size:14px; color:#334155;">
        Alternativ kannst du den Code kopieren und im Browser eingeben:
      </td></tr>
      <tr><td>
        <div style="font-size:18px;font-weight:800;letter-spacing:1px;background:#f8fafc;border-radius:14px;padding:14px 16px;display:inline-block;border:1px solid #e2e8f0;">
          ${cleanToken}
        </div>
      </td></tr>
      <tr><td style="padding:14px 0 0 0; font-size:14px; color:#334155;">
        Falls du kein Konto angelegt hast, kannst du diese Nachricht ignorieren.
      </td></tr>
      <tr><td style="padding:10px 0 0 0; font-size:14px; color:#334155;">
        Danke, dass du dich engagierst – jede Registrierung hilft uns, Beteiligung transparenter zu machen.
      </td></tr>
      <tr><td style="padding:10px 0 0 0; font-size:14px; color:#0f172a; font-weight:600;">
        Wir freuen uns auf dich.<br/>– Dein eDebatte Team
      </td></tr>
    </table>
  `;

  const text = `${greeting},

schön, dass du bei eDebatte dabei sein möchtest! Bitte bestätige deine E-Mail-Adresse:
${verifyUrl}

Falls du kein Konto angelegt hast, kannst du diese Nachricht ignorieren.

Danke, dass du dich engagierst – jede Registrierung hilft uns, Beteiligung transparenter zu machen.

Wir freuen uns auf dich.
– eDebatte Team`;

  return { subject: "Bitte bestätige deine E-Mail-Adresse", html, text };
}

type AccountWelcomeTemplateInput = {
  accountUrl: string;
  identityUrl?: string;
  displayName?: string | null;
};

export function buildAccountWelcomeMail({ accountUrl, identityUrl, displayName }: AccountWelcomeTemplateInput) {
  const greeting = displayName ? `Hallo ${displayName}` : "Hallo";
  const buttonStyle =
    "display:inline-flex;padding:12px 20px;border-radius:999px;background:#0f172a;color:#fff;text-decoration:none;font-weight:700;letter-spacing:0.3px;font-size:15px;";

  const identityHtml = identityUrl
    ? `<tr><td style="padding:12px 0 0 0; font-size:14px; color:#334155;">
        Identitätsprüfung noch offen? Du kannst jederzeit hier fortsetzen:
        <a href="${identityUrl}" style="color:#0f172a;text-decoration:underline;">${identityUrl}</a>
      </td></tr>`
    : "";

  const html = `
    <table width="100%" cellpadding="0" cellspacing="0" role="presentation" style="font-family: 'Inter', system-ui, -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif; color:#0f172a;">
      <tr><td style="padding:12px 0;">${greeting},</td></tr>
      <tr><td style="padding:6px 0 12px 0; font-size:15px; line-height:1.5;">
        herzlich willkommen bei eDebatte! Danke, dass du dich registriert hast – dein Konto ist eingerichtet.
        Ab jetzt kannst du dein Profil vervollständigen und die nächsten Schritte starten.
      </td></tr>
      <tr><td style="padding:12px 0;">
        <a href="${accountUrl}" style="${buttonStyle}">
          Zum Profil
        </a>
      </td></tr>
      ${identityHtml}
      <tr><td style="padding:12px 0 0 0; font-size:14px; color:#334155;">
        Wir freuen uns sehr, dass du dich einbringst.
      </td></tr>
      <tr><td style="padding:12px 0 0 0; font-size:14px; color:#0f172a; font-weight:600;">
        Schön, dass du dabei bist.<br/>– Dein eDebatte Team
      </td></tr>
    </table>
  `;

  const identityText = identityUrl
    ? `Identitätsprüfung noch offen? Hier fortsetzen: ${identityUrl}

`
    : "";

  const text = `${greeting},

herzlich willkommen bei eDebatte! Danke, dass du dich registriert hast – dein Konto ist eingerichtet.
Profil öffnen: ${accountUrl}

${identityText}Wir freuen uns sehr, dass du dich einbringst.

Schön, dass du dabei bist.
– eDebatte Team`;

  return { subject: "Herzlich willkommen bei eDebatte", html, text };
}

export function buildSetPasswordMail({
  resetUrl,
  displayName,
}: {
  resetUrl: string;
  displayName?: string | null;
}) {
  const greeting = displayName ? `Hallo ${displayName}` : "Hallo";
  const buttonStyle =
    "display:inline-flex;padding:12px 20px;border-radius:999px;background:#0f172a;color:#fff;text-decoration:none;font-weight:700;letter-spacing:0.3px;font-size:15px;";

  const html = `
    <table width="100%" cellpadding="0" cellspacing="0" role="presentation" style="font-family: 'Inter', system-ui, -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif; color:#0f172a;">
      <tr><td style="padding:12px 0;">${greeting},</td></tr>
      <tr><td style="padding:6px 0 12px 0; font-size:15px; line-height:1.5;">
        dein Account wurde angelegt. Bitte setze jetzt dein Passwort, um dich einzuloggen.
      </td></tr>
      <tr><td style="padding:12px 0;">
        <a href="${resetUrl}" style="${buttonStyle}">
          Passwort setzen
        </a>
      </td></tr>
      <tr><td style="padding:14px 0 0 0; font-size:14px; color:#334155;">
        Falls du den Zugang nicht angefordert hast, kannst du diese Nachricht ignorieren.
      </td></tr>
      <tr><td style="padding:10px 0 0 0; font-size:14px; color:#0f172a; font-weight:600;">
        Viele Gruesse<br/>– Dein eDebatte Team
      </td></tr>
    </table>
  `;

  const text = `${greeting},

dein Account wurde angelegt. Bitte setze dein Passwort:
${resetUrl}

Falls du den Zugang nicht angefordert hast, kannst du diese Nachricht ignorieren.

Viele Gruesse
– eDebatte Team`;

  return { subject: "Passwort fuer deinen Account setzen", html, text };
}

export function buildOrgInviteMail({
  resetUrl,
  orgName,
  role,
  displayName,
  expiresAt,
}: {
  resetUrl: string;
  orgName: string;
  role: string;
  displayName?: string | null;
  expiresAt?: string | null;
}) {
  const greeting = displayName ? `Hallo ${displayName}` : "Hallo";
  const buttonStyle =
    "display:inline-flex;padding:12px 20px;border-radius:999px;background:#0f172a;color:#fff;text-decoration:none;font-weight:700;letter-spacing:0.3px;font-size:15px;";
  const expiresLine = expiresAt ? `Einladung gueltig bis: ${expiresAt}` : "";

  const html = `
    <table width="100%" cellpadding="0" cellspacing="0" role="presentation" style="font-family: 'Inter', system-ui, -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif; color:#0f172a;">
      <tr><td style="padding:12px 0;">${greeting},</td></tr>
      <tr><td style="padding:6px 0 12px 0; font-size:15px; line-height:1.5;">
        du wurdest zur Organisation <strong>${orgName}</strong> eingeladen (Rolle: ${role}).
        Bitte setze dein Passwort, um den Zugang zu aktivieren.
      </td></tr>
      <tr><td style="padding:12px 0;">
        <a href="${resetUrl}" style="${buttonStyle}">
          Einladung annehmen
        </a>
      </td></tr>
      ${expiresLine ? `<tr><td style="padding:8px 0 0 0; font-size:13px; color:#64748b;">${expiresLine}</td></tr>` : ""}
      <tr><td style="padding:14px 0 0 0; font-size:14px; color:#334155;">
        Falls du keine Einladung erwartet hast, kannst du diese Nachricht ignorieren.
      </td></tr>
      <tr><td style="padding:10px 0 0 0; font-size:14px; color:#0f172a; font-weight:600;">
        Viele Gruesse<br/>– Dein eDebatte Team
      </td></tr>
    </table>
  `;

  const text = `${greeting},

du wurdest zur Organisation ${orgName} eingeladen (Rolle: ${role}).
Bitte setze dein Passwort, um den Zugang zu aktivieren:
${resetUrl}

${expiresLine ? `${expiresLine}\n` : ""}Falls du keine Einladung erwartet hast, kannst du diese Nachricht ignorieren.

Viele Gruesse
– eDebatte Team`;

  return { subject: `Einladung zu ${orgName}`, html, text };
}

export function buildOrgAccessMail({
  accessUrl,
  orgName,
  role,
  displayName,
}: {
  accessUrl: string;
  orgName: string;
  role: string;
  displayName?: string | null;
}) {
  const greeting = displayName ? `Hallo ${displayName}` : "Hallo";
  const buttonStyle =
    "display:inline-flex;padding:12px 20px;border-radius:999px;background:#0f172a;color:#fff;text-decoration:none;font-weight:700;letter-spacing:0.3px;font-size:15px;";

  const html = `
    <table width="100%" cellpadding="0" cellspacing="0" role="presentation" style="font-family: 'Inter', system-ui, -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif; color:#0f172a;">
      <tr><td style="padding:12px 0;">${greeting},</td></tr>
      <tr><td style="padding:6px 0 12px 0; font-size:15px; line-height:1.5;">
        dir wurde Zugriff auf die Organisation <strong>${orgName}</strong> gegeben (Rolle: ${role}).
        Melde dich an, um loszulegen.
      </td></tr>
      <tr><td style="padding:12px 0;">
        <a href="${accessUrl}" style="${buttonStyle}">
          Zum Login
        </a>
      </td></tr>
      <tr><td style="padding:10px 0 0 0; font-size:14px; color:#0f172a; font-weight:600;">
        Viele Gruesse<br/>– Dein eDebatte Team
      </td></tr>
    </table>
  `;

  const text = `${greeting},

dir wurde Zugriff auf die Organisation ${orgName} gegeben (Rolle: ${role}).
Login: ${accessUrl}

Viele Gruesse
– eDebatte Team`;

  return { subject: `Zugriff auf ${orgName}`, html, text };
}

type IdentityResumeTemplateInput = {
  resumeUrl: string;
  displayName?: string | null;
};

export function buildIdentityResumeMail({ resumeUrl, displayName }: IdentityResumeTemplateInput) {
  const greeting = displayName ? `Hallo ${displayName}` : "Hallo";
  const buttonStyle =
    "display:inline-flex;padding:12px 20px;border-radius:999px;background:#0f172a;color:#fff;text-decoration:none;font-weight:700;letter-spacing:0.3px;font-size:15px;";

  const html = `
    <table width="100%" cellpadding="0" cellspacing="0" role="presentation" style="font-family: 'Inter', system-ui, -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif; color:#0f172a;">
      <tr><td style="padding:12px 0;">${greeting},</td></tr>
      <tr><td style="padding:6px 0 12px 0; font-size:15px; line-height:1.5;">
        danke, dass du dir die Zeit für eDebatte nimmst. Du kannst die Identitätsprüfung jederzeit fortsetzen.
        Öffne den Link, wenn du den QR-Code bequem scannen möchtest.
      </td></tr>
      <tr><td style="padding:12px 0;">
        <a href="${resumeUrl}" style="${buttonStyle}">
          Identitätsprüfung fortsetzen
        </a>
      </td></tr>
      <tr><td style="padding:12px 0 0 0; font-size:14px; color:#334155;">
        Falls du ausgeloggt bist, melde dich zuerst an.
      </td></tr>
      <tr><td style="padding:12px 0 0 0; font-size:14px; color:#0f172a; font-weight:600;">
        – Dein eDebatte Team
      </td></tr>
    </table>
  `;

  const text = `${greeting},

danke, dass du dir die Zeit für eDebatte nimmst. Du kannst die Identitätsprüfung jederzeit fortsetzen:
${resumeUrl}

Falls du ausgeloggt bist, melde dich zuerst an.

– eDebatte Team`;

  return { subject: "Dein Link zur Identitätsprüfung", html, text };
}

export function buildTwoFactorCodeMail({ code }: { code: string }) {
  const subject = "Dein Login-Code für eDebatte";
  const html = `
    <table width="100%" cellpadding="0" cellspacing="0" role="presentation" style="font-family: 'Inter', system-ui, -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif; color:#0f172a;">
      <tr><td style="padding:12px 0;">Hallo,</td></tr>
      <tr><td style="padding:6px 0 12px 0; font-size:15px; line-height:1.5;">
        dein Login-Code für eDebatte lautet:
      </td></tr>
      <tr><td>
        <div style="font-size:28px;font-weight:700;letter-spacing:4px;background:#f8fafc;border-radius:12px;padding:12px 16px;display:inline-block;border:1px solid #e2e8f0;">
          ${code}
        </div>
      </td></tr>
      <tr><td style="padding:10px 0 0 0; font-size:13px; color:#334155;">
        Der Code ist nur wenige Minuten gültig. Falls du den Login nicht gestartet hast, kannst du diese Nachricht ignorieren.
      </td></tr>
      <tr><td style="padding:10px 0 0 0; font-size:14px; color:#0f172a; font-weight:600;">
        – Dein eDebatte Team
      </td></tr>
    </table>
  `;

  const text = `Hallo,

dein Login-Code für eDebatte lautet: ${code}
Der Code ist nur wenige Minuten gültig.

Falls du den Login nicht gestartet hast, kannst du diese Nachricht ignorieren.

– eDebatte Team`;

  return { subject, html, text };
}

type MembershipMailInput = {
  firstName?: string | null;
  planLabel: string;
  monthlyAmount: number;
  reference: string;
  bank: BankDetails;
};

export function buildMembershipConfirmationMail({
  firstName,
  planLabel,
  monthlyAmount,
  reference,
  bank,
}: MembershipMailInput) {
  const greeting = firstName ? `Hallo ${firstName}` : "Hallo";
  const amount = formatEuro(monthlyAmount);

  const bankHtml = `
    <ul>
      <li><strong>Empfänger:</strong> ${bank.recipient}</li>
      <li><strong>Bank:</strong> ${bank.bankName}</li>
      <li><strong>IBAN:</strong> ${bank.iban}</li>
      <li><strong>BIC:</strong> ${bank.bic}</li>
      <li><strong>Verwendungszweck:</strong> ${reference}</li>
    </ul>
  `;

  const html = `
    <p>${greeting},</p>
    <p>danke für deinen Antrag auf die eDebatte-Mitgliedschaft (<strong>${planLabel}</strong>).</p>
    <p>Dein monatlicher Beitrag beträgt <strong>${amount}</strong>. Bitte richte eine Überweisung oder einen Dauerauftrag mit folgenden Bankdaten ein:</p>
    ${bankHtml}
    <p>Wichtig: Es handelt sich um eine Gutschrift bzw. einen Mitgliedsbeitrag – keine Spende, keine Spendenquittung.</p>
    <p>Sobald der erste Beitrag eingegangen ist, erhältst du die Bestätigung deiner Mitgliedschaft.</p>
    <p>– Dein eDebatte Team</p>
  `;

  const text = `${greeting},

danke für deinen Antrag auf die eDebatte-Mitgliedschaft (${planLabel}).
Monatlicher Beitrag: ${amount}

Bank:
Empfänger: ${bank.recipient}
Bank: ${bank.bankName}
IBAN: ${bank.iban}
BIC: ${bank.bic}
Verwendungszweck: ${reference}

Es handelt sich um eine Gutschrift bzw. einen Mitgliedsbeitrag – keine Spende, keine Spendenquittung.

Sobald der erste Beitrag eingegangen ist, erhältst du die Bestätigung deiner Mitgliedschaft.

– eDebatte Team`;

  return {
    subject: "eDebatte – Mitgliedsantrag eingegangen",
    html,
    text,
  };
}

function formatEuro(value: number) {
  return new Intl.NumberFormat("de-DE", { style: "currency", currency: "EUR", minimumFractionDigits: 2 }).format(value);
}

function formatIban(value?: string | null) {
  if (!value) return "n/a";
  const cleaned = value.replace(/\s+/g, "").toUpperCase();
  return cleaned.match(/.{1,4}/g)?.join(" ") ?? cleaned;
}

export function buildMembershipApplyUserMail(args: {
  displayName: string;
  amountPerPeriod: number;
  rhythm: MembershipRhythm;
  householdSize: number;
  membershipId: string;
  accountUrl?: string;
  profileUrl?: string;
  bankDetails?: {
    recipient: string;
    iban: string;
    bic?: string | null;
    bankName?: string | null;
    accountMode?: string | null;
  };
  edebatte?: {
    enabled: boolean;
    planKey?: string;
    finalPricePerMonth?: number;
    billingMode?: "monthly" | "yearly";
    discountPercent?: number;
  };
  paymentMethod?: "sepa" | "bank_transfer" | "paypal" | "other";
  paymentReference?: string;
  paymentInfo?: {
    bankRecipient?: string;
    bankIban?: string;
    bankIbanMasked?: string;
    bankBic?: string | null;
    bankName?: string | null;
    accountMode?: string | null;
    mandateStatus?: string | null;
  };
}) {
  const {
    displayName,
    amountPerPeriod,
    rhythm,
    householdSize,
    membershipId,
    accountUrl,
    profileUrl,
    bankDetails,
    edebatte,
    paymentReference,
    paymentInfo,
  } = args;
  const subject = "Dein Mitgliedsantrag bei eDebatte";
  const greeting = `Hallo ${displayName || "Mitglied"}`;
  const rhythmLabel =
    rhythm === "monthly" ? "monatlich" : rhythm === "yearly" ? "jährlich" : "einmalig";
  const amount = formatEuro(amountPerPeriod);
  const bankRecipient = bankDetails?.recipient ?? paymentInfo?.bankRecipient ?? "eDebatte";
  const bankIban =
    bankDetails?.iban ??
    paymentInfo?.bankIban ??
    paymentInfo?.bankIbanMasked ??
    "IBAN folgt";
  const bankBic = bankDetails?.bic ?? paymentInfo?.bankBic ?? "";
  const bankName = bankDetails?.bankName ?? paymentInfo?.bankName ?? "";
  const accountMode = bankDetails?.accountMode ?? paymentInfo?.accountMode ?? "private_preUG";
  const showMicroTransfer = paymentInfo?.mandateStatus === "pending_microtransfer";
  const shareUrl = profileUrl?.trim() || "";
  const shareText = "Ich bin jetzt Mitglied bei eDebatte.";
  const encodedShareUrl = shareUrl ? encodeURIComponent(shareUrl) : "";
  const encodedShareText = encodeURIComponent(shareText);
  const shareLinks = shareUrl
    ? {
        linkedin: `https://www.linkedin.com/sharing/share-offsite/?url=${encodedShareUrl}`,
        x: `https://x.com/intent/post?url=${encodedShareUrl}&text=${encodedShareText}`,
        reddit: `https://www.reddit.com/submit?url=${encodedShareUrl}&title=${encodedShareText}`,
        instagram: shareUrl,
        tiktok: shareUrl,
      }
    : null;
  const iconStyle =
    "display:inline-block;width:28px;height:28px;border-radius:999px;background:#0f172a;color:#ffffff;font-size:11px;font-weight:700;line-height:28px;text-align:center;text-decoration:none;";
  const socialLink = (label: string, text: string, href: string, isLast = false) => `
      <td style="padding-right:${isLast ? "0" : "8px"};">
        <a href="${href}" style="${iconStyle}" aria-label="${label}" target="_blank" rel="noopener noreferrer">${text}</a>
      </td>`;
  const shareIcons = shareLinks
    ? `
      <table role="presentation" cellpadding="0" cellspacing="0">
        <tr>
          ${socialLink("LinkedIn", "IN", shareLinks.linkedin)}
          ${socialLink("TikTok", "TT", shareLinks.tiktok)}
          ${socialLink("Instagram", "IG", shareLinks.instagram)}
          ${socialLink("X", "X", shareLinks.x)}
          ${socialLink("Reddit", "RD", shareLinks.reddit, true)}
        </tr>
      </table>
    `
    : "";

  const hasEdebate = Boolean(edebatte?.enabled && edebatte.finalPricePerMonth);
  const edebatteDiscount = edebatte?.discountPercent ? ` (inkl. ${edebatte.discountPercent}% eDebatte-Rabatt)` : "";
  const edebatteLine = hasEdebate
    ? `${edebatte?.planKey || "unbekannt"} ${formatEuro(edebatte?.finalPricePerMonth || 0)} ${
        edebatte?.billingMode || "monatlich"
      }${edebatteDiscount}`
    : "";
  const edebatteRow = hasEdebate
    ? `
        <tr>
          <td style="padding:6px 0;font-size:12px;color:#64748b;">eDebatte</td>
          <td style="padding:6px 0;font-size:13px;font-weight:600;text-align:right;color:#0f172a;">${edebatteLine}</td>
        </tr>
      `
    : "";
  const edebatteNote = hasEdebate
    ? `
      <p style="margin:12px 0 0 0;font-size:12px;line-height:1.6;color:#64748b;">
        Während der Pilotphase ist das ein unverbindlicher Vorbestell-Vermerk; die tatsächliche Buchung und Zahlungsabwicklung klären wir separat.
      </p>
    `
    : "";
  const microTransferBlock = showMicroTransfer
    ? `
      <table width="100%" cellpadding="0" cellspacing="0" role="presentation" style="margin-top:16px;border:1px solid #bae6fd;background:#ecfeff;border-radius:16px;">
        <tr>
          <td style="padding:16px;">
            <p style="margin:0 0 6px 0;font-size:14px;font-weight:600;color:#0f172a;">Konto-Verifikation</p>
            <p style="margin:0;font-size:13px;line-height:1.6;color:#0f172a;">
              Wir überweisen dir in den nächsten Tagen 0,01 EUR mit einem TAN-Code im Verwendungszweck. Bitte gib den Code im Zahlungsprofil ein.
            </p>
            ${
              accountUrl
                ? `<p style="margin:12px 0 0 0;">
                  <a href="${accountUrl}" style="display:inline-block;padding:10px 16px;border-radius:999px;background:#0ea5e9;color:#ffffff;text-decoration:none;font-weight:700;font-size:12px;">Zahlungsprofil öffnen</a>
                </p>`
                : ""
            }
          </td>
        </tr>
      </table>
    `
    : "";
  const profileBlock = shareLinks
    ? `
      <table width="100%" cellpadding="0" cellspacing="0" role="presentation" style="margin-top:18px;border:1px dashed #e2e8f0;border-radius:16px;">
        <tr>
          <td style="padding:16px;">
            <p style="margin:0 0 6px 0;font-size:14px;font-weight:600;color:#0f172a;">Dein Profil-Link (optional)</p>
            <p style="margin:0 0 10px 0;font-size:13px;line-height:1.6;color:#475569;">
              Wenn du möchtest, kannst du dein Profil teilen.
            </p>
            <p style="margin:0 0 12px 0;font-size:13px;">
              <a href="${shareUrl}" style="color:#0ea5e9;text-decoration:none;font-weight:600;">${shareUrl}</a>
            </p>
            ${shareIcons}
            <p style="margin:10px 0 0 0;font-size:11px;color:#94a3b8;">
              Tipp: Für Instagram/TikTok einfach den Link kopieren und posten.
            </p>
          </td>
        </tr>
      </table>
    `
    : "";

  const html = `
    <table width="100%" cellpadding="0" cellspacing="0" role="presentation" style="font-family:'Inter',system-ui,-apple-system,BlinkMacSystemFont,'Segoe UI',sans-serif;background:#f8fafc;color:#0f172a;">
      <tr>
        <td align="center" style="padding:24px 12px;">
          <table width="600" cellpadding="0" cellspacing="0" role="presentation" style="width:100%;max-width:600px;background:#ffffff;border:1px solid #e2e8f0;border-radius:20px;overflow:hidden;">
            <tr>
              <td style="padding:22px 24px;background:#0f172a;">
                <div style="font-size:11px;letter-spacing:0.36em;text-transform:uppercase;color:#94a3b8;">eDebatte</div>
                <div style="margin-top:6px;font-size:24px;font-weight:700;color:#ffffff;">Mitgliedsantrag eingegangen</div>
                <div style="margin-top:6px;font-size:13px;color:#cbd5f5;">Danke, dass du die Bewegung möglich machst.</div>
              </td>
            </tr>
            <tr>
              <td style="padding:22px 24px;">
                <p style="margin:0 0 10px 0;font-size:16px;font-weight:600;color:#0f172a;">${greeting},</p>
                <p style="margin:0 0 18px 0;font-size:14px;line-height:1.6;color:#475569;">
                  wir haben deinen Mitgliedsantrag erhalten. Die wichtigsten Daten auf einen Blick:
                </p>
                <table width="100%" cellpadding="0" cellspacing="0" role="presentation" style="background:#f8fafc;border:1px solid #e2e8f0;border-radius:16px;">
                  <tr>
                    <td style="padding:16px;">
                      <table width="100%" cellpadding="0" cellspacing="0" role="presentation">
                        <tr>
                          <td style="padding:6px 0;font-size:12px;color:#64748b;">Betrag</td>
                          <td style="padding:6px 0;font-size:14px;font-weight:600;text-align:right;color:#0f172a;">${amount} (${rhythmLabel})</td>
                        </tr>
                        <tr>
                          <td style="padding:6px 0;font-size:12px;color:#64748b;">Haushalt</td>
                          <td style="padding:6px 0;font-size:14px;font-weight:600;text-align:right;color:#0f172a;">${householdSize} Person(en)</td>
                        </tr>
                        <tr>
                          <td style="padding:6px 0;font-size:12px;color:#64748b;">Antrags-ID</td>
                          <td style="padding:6px 0;font-size:12px;font-weight:600;text-align:right;color:#0f172a;font-family:ui-monospace,SFMono-Regular,Menlo,monospace;">
                            ${membershipId}
                          </td>
                        </tr>
                        ${edebatteRow}
                      </table>
                      ${edebatteNote}
                    </td>
                  </tr>
                </table>

                <table width="100%" cellpadding="0" cellspacing="0" role="presentation" style="margin-top:16px;border:1px solid #e2e8f0;border-radius:16px;">
                  <tr>
                    <td style="padding:16px;">
                      <p style="margin:0 0 8px 0;font-size:14px;font-weight:600;color:#0f172a;">Zahlungsinfo</p>
                      <table width="100%" cellpadding="0" cellspacing="0" role="presentation">
                        <tr>
                          <td style="padding:6px 0;font-size:12px;color:#64748b;">Empfänger</td>
                          <td style="padding:6px 0;font-size:14px;font-weight:600;text-align:right;color:#0f172a;">${bankRecipient}</td>
                        </tr>
                        <tr>
                          <td style="padding:6px 0;font-size:12px;color:#64748b;">Bank</td>
                          <td style="padding:6px 0;font-size:13px;font-weight:600;text-align:right;color:#0f172a;">${bankName || "n/a"}</td>
                        </tr>
                        <tr>
                          <td style="padding:6px 0;font-size:12px;color:#64748b;">IBAN</td>
                          <td style="padding:6px 0;font-size:13px;font-weight:600;text-align:right;color:#0f172a;">${bankIban}</td>
                        </tr>
                        ${
                          bankBic
                            ? `<tr>
                                <td style="padding:6px 0;font-size:12px;color:#64748b;">BIC</td>
                                <td style="padding:6px 0;font-size:13px;font-weight:600;text-align:right;color:#0f172a;">${bankBic}</td>
                              </tr>`
                            : ""
                        }
                        <tr>
                          <td style="padding:6px 0;font-size:12px;color:#64748b;">Verwendungszweck</td>
                          <td style="padding:6px 0;font-size:13px;font-weight:700;text-align:right;color:#0f172a;">${paymentReference ?? "Mitgliedsbeitrag"}</td>
                        </tr>
                      </table>
                    </td>
                  </tr>
                </table>

                ${microTransferBlock}

                <p style="margin:18px 0 8px 0;font-size:14px;font-weight:600;color:#0f172a;">Transparenz</p>
                <ul style="margin:0;padding-left:18px;font-size:13px;line-height:1.6;color:#475569;">
                  <li>eDebatte befindet sich in der Gründungsphase (${accountMode === "private_preUG" ? "Privatkonto Aufbauphase" : "Org-Konto nach Gründung"}).</li>
                  <li>Mitgliedsbeiträge sind Gutschriften für die Bewegung – keine Spendenquittung, üblicherweise nicht absetzbar.</li>
                  <li>Die Mitgliedschaft bezieht sich auf eDebatte, nicht nur auf die eDebatte-App.</li>
                  <li>Wir folgen "eine Person, eine Stimme" – daher brauchen wir klare Zuordnung und Double-Opt-In.</li>
                </ul>
                ${profileBlock}
                <p style="margin:18px 0 0 0;font-size:13px;line-height:1.6;color:#475569;">
                  Du kannst eDebatte direkt im Free-Modus nutzen. Sobald dein Beitrag eingegangen ist, bestätigen wir deine Mitgliedschaft.
                </p>
                <p style="margin:14px 0 0 0;font-size:14px;font-weight:600;color:#0f172a;">Danke für deine Unterstützung!</p>
                <p style="margin:10px 0 0 0;font-size:13px;color:#0f172a;font-weight:600;">– Dein eDebatte Team</p>
              </td>
            </tr>
          </table>
        </td>
      </tr>
    </table>
  `;

  const text = `${greeting},

wir haben deinen Mitgliedsantrag erhalten. Details:
- Betrag: ${amount} (${rhythmLabel})
- Haushalt: ${householdSize} Person(en)
- Antrags-ID: ${membershipId}
${hasEdebate ? `- eDebatte: ${edebatteLine}` : ""}

Zahlung:
Bitte Dauer-/Einzelüberweisung einrichten.
Empfänger: ${bankRecipient}
Bank: ${bankName || "n/a"}
IBAN: ${bankIban}
${bankBic ? `BIC: ${bankBic}` : ""}
Verwendungszweck: ${paymentReference ?? "Mitgliedsbeitrag"}
${
  showMicroTransfer
    ? `\nKonto-Verifikation:\nWir überweisen dir in den nächsten Tagen 0,01 EUR mit einem TAN-Code im Verwendungszweck. Bitte gib den Code im Zahlungsprofil ein${accountUrl ? `: ${accountUrl}` : "."}`
    : ""
}

Transparenz:
- Aufbauphase (${accountMode === "private_preUG" ? "Privatkonto" : "Org-Konto"}), keine Spendenquittung, i.d.R. nicht absetzbar.
- Mitgliedschaft bezieht sich auf eDebatte, nicht nur eDebatte.
- Eine Person, eine Stimme – daher Double-Opt-In.

${shareLinks ? `\nProfil-Link (optional): ${shareUrl}\nLinkedIn: ${shareLinks.linkedin}\nX: ${shareLinks.x}\nReddit: ${shareLinks.reddit}\nInstagram/TikTok: Link kopieren und posten.` : ""}

Du kannst eDebatte im Free-Modus nutzen. Sobald dein Beitrag eingeht, bestätigen wir deine Mitgliedschaft.

Danke für deine Unterstützung!
– Dein eDebatte Team`;

  return { subject, html, text };
}

export function buildMembershipApplyAdminMail(args: {
  membershipId: string;
  userId: string;
  email: string;
  amountPerPeriod: number;
  rhythm: string;
  householdSize: number;
  paymentMethod?: string;
  paymentReference?: string;
  payerName?: string;
  payerIban?: string;
  microTransferCode?: string;
}) {
  const subject = "Neuer Mitgliedsantrag";
  const payerIban = formatIban(args.payerIban);
  const html = `
    <p>Neuer Antrag eingegangen:</p>
    <ul>
      <li>ID: ${args.membershipId}</li>
      <li>User: ${args.userId}</li>
      <li>E-Mail: ${args.email}</li>
      <li>Betrag: ${formatEuro(args.amountPerPeriod)} (${args.rhythm})</li>
      <li>Haushalt: ${args.householdSize}</li>
      ${args.paymentMethod ? `<li>Zahlungsweg: ${args.paymentMethod}</li>` : ""}
      ${args.paymentReference ? `<li>Verwendungszweck: ${args.paymentReference}</li>` : ""}
      ${args.payerName ? `<li>Zahlungsname: ${args.payerName}</li>` : ""}
      ${args.payerIban ? `<li>IBAN (für 0,01 €): ${payerIban}</li>` : ""}
      ${args.microTransferCode ? `<li>TAN-Code (0,01 €): ${args.microTransferCode}</li>` : ""}
    </ul>
  `;
  const text = `Neuer Antrag:
- ID: ${args.membershipId}
- User: ${args.userId}
- E-Mail: ${args.email}
- Betrag: ${formatEuro(args.amountPerPeriod)} (${args.rhythm})
- Haushalt: ${args.householdSize}
${args.paymentMethod ? `- Zahlungsweg: ${args.paymentMethod}` : ""}
${args.paymentReference ? `- Verwendungszweck: ${args.paymentReference}` : ""}
${args.payerName ? `- Zahlungsname: ${args.payerName}` : ""}
${args.payerIban ? `- IBAN (für 0,01 €): ${payerIban}` : ""}
${args.microTransferCode ? `- TAN-Code (0,01 €): ${args.microTransferCode}` : ""}`;
  return { subject, html, text };
}

export function buildHouseholdInviteMail(args: {
  targetName?: string | null;
  inviteUrl: string;
  inviterName: string;
}) {
  const subject = "Einladung zur Teilnahme bei eDebatte";
  const greeting = args.targetName ? `Hallo ${args.targetName},` : "Hallo,";
  const html = `
    <p>${greeting}</p>
    <p>${args.inviterName} hat dich eingeladen, im Rahmen eines Haushalts an eDebatte teilzunehmen.</p>
    <p>
      <a href="${args.inviteUrl}" style="display:inline-flex;padding:10px 16px;border-radius:999px;background:#0ea5e9;color:#fff;text-decoration:none;font-weight:600;">Einladung annehmen</a>
    </p>
    <p>Mit der Einladung erhältst du später eigenen Zugang (Double-Opt-In, eine Person – eine Stimme).</p>
    <p>Danke für dein Interesse an einer offenen, direkten Demokratie.</p>
  `;
  const text = `${greeting}

${args.inviterName} hat dich eingeladen, im Rahmen eines Haushalts an eDebatte teilzunehmen.
Einladung annehmen: ${args.inviteUrl}

Die Einladung ermöglicht dir eigenen Zugang (Double-Opt-In, eine Person – eine Stimme).

Danke für dein Interesse!`;

  return { subject, html, text };
}

export function buildMembershipReminderMail(
  level: 1 | 2 | 3,
  args: {
    displayName: string;
    amountPerPeriod: number;
    rhythm: MembershipRhythm;
    householdSize: number;
    paymentInfo?: {
      bankRecipient?: string;
      bankIban?: string;
      bankIbanMasked?: string;
      bankBic?: string | null;
      bankName?: string | null;
      reference?: string;
    };
    reference: string;
  },
) {
  const subject =
    level === 3
      ? "Letzte Erinnerung – eDebatte-Mitgliedsantrag"
      : "Erinnerung – eDebatte-Mitgliedsbeitrag";
  const amount = formatEuro(args.amountPerPeriod);
  const rhythmLabel =
    args.rhythm === "once" ? "einmalig" : args.rhythm === "yearly" ? "jährlich" : "monatlich";
  const bankRecipient = args.paymentInfo?.bankRecipient ?? "eDebatte";
  const bankIban =
    args.paymentInfo?.bankIban ??
    args.paymentInfo?.bankIbanMasked ??
    "IBAN folgt";
  const bankBic = args.paymentInfo?.bankBic ?? "";
  const bankName = args.paymentInfo?.bankName ?? "";

  const intro =
    level === 1
      ? "wir haben noch keinen Zahlungseingang gesehen."
      : level === 2
        ? "bitte prüfe deinen Mitgliedsbeitrag – uns liegt noch keine Zahlung vor."
        : "wir konnten bisher keinen Zahlungseingang zuordnen. Der Antrag wird storniert, wenn keine Zahlung erfolgt.";

  const html = `
    <p>Hallo ${args.displayName},</p>
    <p>${intro}</p>
    <p><strong>Dein Beitrag:</strong> ${amount} (${rhythmLabel}), Haushalt: ${args.householdSize}</p>
    <p><strong>Zahlung per Überweisung</strong><br/>
    Empfänger: ${bankRecipient}<br/>
    Bank: ${bankName}<br/>
    IBAN: ${bankIban}<br/>
    ${bankBic ? `BIC: ${bankBic}<br/>` : ""}Verwendungszweck: ${args.reference}</p>
    <p>Bitte nutze den Verwendungszweck exakt so, damit wir die Zahlung eindeutig zuordnen können.</p>
    ${
      level === 3
        ? "<p>Hinweis: Wenn keine Zahlung eingeht, wird der Antrag storniert und der Haushalt gesperrt. Du kannst später jederzeit neu beantragen.</p>"
        : ""
    }
    <p>Danke für deine Unterstützung.</p>
  `;
  const text = `Hallo ${args.displayName},

${intro}

Beitrag: ${amount} (${rhythmLabel}), Haushalt: ${args.householdSize}
Zahlung per Überweisung:
Empfänger: ${bankRecipient}
Bank: ${bankName}
IBAN: ${bankIban}
${bankBic ? `BIC: ${bankBic}\n` : ""}Verwendungszweck: ${args.reference}

Bitte den Verwendungszweck genau so nutzen.
${level === 3 ? "Ohne Zahlung wird der Antrag storniert und der Haushalt gesperrt. Später kannst du neu beantragen.\n" : ""}Danke für deine Unterstützung.`;

  return { subject, html, text };
}
