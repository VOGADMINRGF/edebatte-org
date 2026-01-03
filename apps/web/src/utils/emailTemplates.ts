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
        schön, dass du dich registrierst! Bitte bestätige deine E-Mail-Adresse, damit wir dein Konto anlegen können.
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
      <tr><td style="padding:10px 0 0 0; font-size:14px; color:#0f172a; font-weight:600;">
        Wir freuen uns, dass du dabei bist.<br/>– Dein VoiceOpenGov Team
      </td></tr>
    </table>
  `;

  const text = `${greeting},

schön, dass du dich registrierst! Bitte bestätige deine E-Mail-Adresse:
${verifyUrl}

Falls du kein Konto angelegt hast, kannst du diese Nachricht ignorieren.

Wir freuen uns, dass du dabei bist.
– VoiceOpenGov Team`;

  return { subject: "Bitte bestätige deine E-Mail-Adresse", html, text };
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
        Viele Gruesse<br/>– Dein VoiceOpenGov Team
      </td></tr>
    </table>
  `;

  const text = `${greeting},

dein Account wurde angelegt. Bitte setze dein Passwort:
${resetUrl}

Falls du den Zugang nicht angefordert hast, kannst du diese Nachricht ignorieren.

Viele Gruesse
– VoiceOpenGov Team`;

  return { subject: "Passwort fuer deinen Account setzen", html, text };
}

export function buildTwoFactorCodeMail({ code }: { code: string }) {
  const subject = "Dein Login-Code für VoiceOpenGov";
  const html = `
    <p>Hallo,</p>
    <p>dein 2FA-Code für den Login lautet:</p>
    <p style="font-size:26px;font-weight:700;letter-spacing:4px;">${code}</p>
    <p>Der Code ist nur wenige Minuten gültig. Falls du den Login nicht gestartet hast, kannst du diese Nachricht ignorieren.</p>
    <p>– Dein VoiceOpenGov / eDebatte Team</p>
  `;

  const text = `Hallo,

dein 2FA-Code lautet: ${code}
Er ist nur wenige Minuten gültig.

Falls du den Login nicht gestartet hast, kannst du diese Nachricht ignorieren.

– VoiceOpenGov / eDebatte`;

  return { subject, html, text };
}

type MembershipMailInput = {
  firstName?: string | null;
  planLabel: string;
  monthlyAmount: number;
  discountApplied: boolean;
  reference: string;
  bank: BankDetails;
};

export function buildMembershipConfirmationMail({
  firstName,
  planLabel,
  monthlyAmount,
  discountApplied,
  reference,
  bank,
}: MembershipMailInput) {
  const greeting = firstName ? `Hallo ${firstName}` : "Hallo";
  const amount = formatEuro(monthlyAmount);
  const discountLine = discountApplied ? " (inkl. 25 % Mitgliederrabatt)" : "";

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
    <p>danke für deinen Antrag auf die VoiceOpenGov-Mitgliedschaft (<strong>${planLabel}</strong>).</p>
    <p>Dein monatlicher Beitrag beträgt <strong>${amount}${discountLine}</strong>. Bitte richte eine Überweisung oder einen Dauerauftrag mit folgenden Bankdaten ein:</p>
    ${bankHtml}
    <p>Wichtig: Es handelt sich um eine Gutschrift bzw. einen Mitgliedsbeitrag – keine Spende, keine Spendenquittung.</p>
    <p>Sobald der erste Beitrag eingegangen ist, erhältst du die Bestätigung deiner Mitgliedschaft und (falls gebucht) den Rabatt auf eDebatte Pro/Premium.</p>
    <p>– Dein VoiceOpenGov Team</p>
  `;

  const text = `${greeting},

danke für deinen Antrag auf die VoiceOpenGov-Mitgliedschaft (${planLabel}).
Monatlicher Beitrag: ${amount}${discountLine}

Bank:
Empfänger: ${bank.recipient}
Bank: ${bank.bankName}
IBAN: ${bank.iban}
BIC: ${bank.bic}
Verwendungszweck: ${reference}

Es handelt sich um eine Gutschrift bzw. einen Mitgliedsbeitrag – keine Spende, keine Spendenquittung.

Sobald der erste Beitrag eingegangen ist, erhältst du die Bestätigung deiner Mitgliedschaft.

– VoiceOpenGov Team`;

  return {
    subject: "VoiceOpenGov – Mitgliedsantrag eingegangen",
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
    edebatte,
    paymentMethod,
    paymentReference,
    paymentInfo,
  } = args;
  const subject = "Dein Mitgliedsantrag bei VoiceOpenGov";
  const rhythmLabel =
    rhythm === "monthly" ? "monatlich" : rhythm === "yearly" ? "jährlich" : "einmalig";
  const amount = formatEuro(amountPerPeriod);
  const bankRecipient = paymentInfo?.bankRecipient ?? process.env.VOG_PAYMENT_BANK_RECIPIENT ?? "VoiceOpenGov";
  const bankIbanMasked =
    paymentInfo?.bankIbanMasked ??
    process.env.VOG_PAYMENT_BANK_IBAN ??
    process.env.NEXT_PUBLIC_VOG_BANK_IBAN ??
    "IBAN folgt";
  const bankBic =
    paymentInfo?.bankBic ??
    process.env.VOG_PAYMENT_BANK_BIC ??
    process.env.NEXT_PUBLIC_VOG_BANK_BIC ??
    "";
  const bankName =
    paymentInfo?.bankName ??
    process.env.VOG_PAYMENT_BANK_NAME ??
    process.env.NEXT_PUBLIC_VOG_BANK_RECIPIENT ??
    "";
  const accountMode = paymentInfo?.accountMode ?? process.env.VOG_ACCOUNT_MODE ?? "private_preUG";
  const showMicroTransfer = paymentInfo?.mandateStatus === "pending_microtransfer";

  const edebatteBlock =
    edebatte && edebatte.enabled && edebatte.finalPricePerMonth
      ? `
    <p><strong>eDebatte-App (Vorbestellung)</strong><br/>
    Paket: ${edebatte.planKey || "unbekannt"}, Abrechnung: ${edebatte.billingMode || "monatlich"}, Preis: ${formatEuro(edebatte.finalPricePerMonth)}${edebatte.discountPercent ? ` (inkl. ${edebatte.discountPercent}% VOG-Rabatt)` : ""}.<br/>
    Während der Pilotphase ist das ein unverbindlicher Vorbestell-Vermerk; die tatsächliche Buchung und Zahlungsabwicklung klären wir mit dir separat.</p>
  `
      : "";

  const html = `
    <p>Hallo ${displayName || "Mitglied"},</p>
    <p>wir haben deinen Mitgliedsantrag erhalten.</p>
    <ul>
      <li><strong>Betrag:</strong> ${amount} (${rhythmLabel})</li>
      <li><strong>Haushaltsgröße:</strong> ${householdSize}</li>
      <li><strong>Antrags-ID:</strong> ${membershipId}</li>
    </ul>
    ${edebatteBlock}
    <p><strong>Zahlungsinfo</strong><br/>
    Bitte richte eine Überweisung oder einen Dauerauftrag ein:<br/>
      Empfänger: ${bankRecipient}<br/>
      Bank: ${bankName || "n/a"}<br/>
      IBAN: ${bankIbanMasked}<br/>
      ${bankBic ? `BIC: ${bankBic}<br/>` : ""}
      Verwendungszweck: ${paymentReference ?? "Mitgliedsbeitrag"}
    </p>
    ${
      showMicroTransfer
        ? `<p><strong>Konto-Verifikation</strong><br/>
      Wir überweisen dir in den nächsten Tagen 0,01 € mit einem TAN-Code im Verwendungszweck. Bitte gib den Code im Zahlungsprofil ein${
        accountUrl ? `: <a href="${accountUrl}">${accountUrl}</a>` : "."
      }</p>`
        : ""
    }
    <p>Wichtig zur Transparenz:</p>
    <ul>
      <li>VoiceOpenGov befindet sich in der Gründungsphase (${
        accountMode === "private_preUG" ? "Privatkonto Aufbauphase" : "Org-Konto nach Gründung"
      }).</li>
      <li>Mitgliedsbeiträge sind Gutschriften für die Bewegung – keine Spendenquittung, üblicherweise nicht absetzbar.</li>
      <li>Die Mitgliedschaft bezieht sich auf VoiceOpenGov, nicht nur auf die eDebatte-App.</li>
      <li>Wir folgen „eine Person, eine Stimme“ – daher brauchen wir klare Zuordnung und Double-Opt-In.</li>
    </ul>
    <p>Du kannst eDebatte direkt im Free-Modus nutzen. Sobald dein Beitrag eingegangen ist, bestätigen wir deine Mitgliedschaft.</p>
    <p>Danke für deine Unterstützung!</p>
  `;

  const text = `Hallo ${displayName || "Mitglied"},

wir haben deinen Mitgliedsantrag erhalten.
- Betrag: ${amount} (${rhythmLabel})
- Haushaltsgröße: ${householdSize}
- Antrags-ID: ${membershipId}

- eDebatte: ${
    edebatte && edebatte.enabled && edebatte.finalPricePerMonth
      ? `${edebatte.planKey || "unbekannt"} ${formatEuro(edebatte.finalPricePerMonth)} ${
          edebatte.billingMode || "monatlich"
        }`
      : "keine Vorbestellung"
  }

Zahlung:
Bitte Dauer-/Einzelüberweisung einrichten.
Empfänger: ${bankRecipient}
Bank: ${bankName || "n/a"}
IBAN: ${bankIbanMasked}
${bankBic ? `BIC: ${bankBic}` : ""}
Verwendungszweck: ${paymentReference ?? "Mitgliedsbeitrag"}
${
  showMicroTransfer
    ? `\nKonto-Verifikation:\nWir überweisen dir in den nächsten Tagen 0,01 EUR mit einem TAN-Code im Verwendungszweck. Bitte gib den Code im Zahlungsprofil ein${accountUrl ? `: ${accountUrl}` : "."}`
    : ""
}

Transparenz:
- Aufbauphase (${accountMode === "private_preUG" ? "Privatkonto" : "Org-Konto"}), keine Spendenquittung, i.d.R. nicht absetzbar.
- Mitgliedschaft bezieht sich auf VoiceOpenGov, nicht nur eDebatte.
- Eine Person, eine Stimme – daher Double-Opt-In.

Du kannst eDebatte im Free-Modus nutzen. Sobald dein Beitrag eingeht, bestätigen wir deine Mitgliedschaft.

Danke für deine Unterstützung!`;

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
  const subject = "Einladung zur Teilnahme bei VoiceOpenGov";
  const greeting = args.targetName ? `Hallo ${args.targetName},` : "Hallo,";
  const html = `
    <p>${greeting}</p>
    <p>${args.inviterName} hat dich eingeladen, im Rahmen eines Haushalts an VoiceOpenGov teilzunehmen.</p>
    <p>
      <a href="${args.inviteUrl}" style="display:inline-flex;padding:10px 16px;border-radius:999px;background:#0ea5e9;color:#fff;text-decoration:none;font-weight:600;">Einladung annehmen</a>
    </p>
    <p>Mit der Einladung erhältst du später eigenen Zugang (Double-Opt-In, eine Person – eine Stimme).</p>
    <p>Danke für dein Interesse an einer offenen, direkten Demokratie.</p>
  `;
  const text = `${greeting}

${args.inviterName} hat dich eingeladen, im Rahmen eines Haushalts an VoiceOpenGov teilzunehmen.
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
      ? "Letzte Erinnerung – VoiceOpenGov-Mitgliedsantrag"
      : "Erinnerung – VoiceOpenGov-Mitgliedsbeitrag";
  const amount = formatEuro(args.amountPerPeriod);
  const rhythmLabel =
    args.rhythm === "once" ? "einmalig" : args.rhythm === "yearly" ? "jährlich" : "monatlich";
  const bankRecipient =
    args.paymentInfo?.bankRecipient ?? process.env.VOG_PAYMENT_BANK_RECIPIENT ?? "VoiceOpenGov";
  const bankIbanMasked =
    args.paymentInfo?.bankIbanMasked ??
    process.env.VOG_PAYMENT_BANK_IBAN ??
    process.env.NEXT_PUBLIC_VOG_BANK_IBAN ??
    "IBAN folgt";
  const bankBic =
    args.paymentInfo?.bankBic ??
    process.env.VOG_PAYMENT_BANK_BIC ??
    process.env.NEXT_PUBLIC_VOG_BANK_BIC ??
    "";
  const bankName =
    args.paymentInfo?.bankName ??
    process.env.VOG_PAYMENT_BANK_NAME ??
    process.env.NEXT_PUBLIC_VOG_BANK_RECIPIENT ??
    "";

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
    IBAN: ${bankIbanMasked}<br/>
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
IBAN: ${bankIbanMasked}
${bankBic ? `BIC: ${bankBic}\n` : ""}Verwendungszweck: ${args.reference}

Bitte den Verwendungszweck genau so nutzen.
${level === 3 ? "Ohne Zahlung wird der Antrag storniert und der Haushalt gesperrt. Später kannst du neu beantragen.\n" : ""}Danke für deine Unterstützung.`;

  return { subject, html, text };
}
