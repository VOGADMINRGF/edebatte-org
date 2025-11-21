type VerificationTemplateInput = {
  verifyUrl: string;
  displayName?: string | null;
  locale?: string;
};

export function buildVerificationMail({ verifyUrl, displayName }: VerificationTemplateInput) {
  const greeting = displayName ? `Hallo ${displayName}` : "Hallo";
  const html = `
    <p>${greeting},</p>
    <p>bitte bestätige deine E-Mail-Adresse, um mit VoiceOpenGov weiterzumachen.</p>
    <p>
      <a href="${verifyUrl}" style="display:inline-flex;padding:10px 18px;border-radius:999px;background:#111;color:#fff;text-decoration:none;font-weight:600;">
        E-Mail bestätigen
      </a>
    </p>
    <p>Oder kopiere diesen Link in deinen Browser:<br />
      <a href="${verifyUrl}">${verifyUrl}</a>
    </p>
    <p>Falls du kein Konto angelegt hast, kannst du diese Nachricht ignorieren.</p>
    <p>– Dein VoiceOpenGov / eDebatte Team</p>
  `;
  const text = `${greeting},

bitte bestätige deine E-Mail-Adresse:
${verifyUrl}

Falls du kein Konto angelegt hast, kannst du diese Nachricht ignorieren.

– VoiceOpenGov / eDebatte`;

  return { subject: "Bitte bestätige deine E-Mail-Adresse", html, text };
}
