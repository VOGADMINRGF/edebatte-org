import type { CreateSupportHandoffPublic } from "@/features/support/createSupportTicketContract";

export type CreateVoxyLocale = "de" | "en";

const UNSUITABLE_NAME_TOKENS = new Set([
  "admin",
  "administrator",
  "anonymous",
  "anonym",
  "demo",
  "guest",
  "gast",
  "neighbor",
  "nachbar",
  "null",
  "test",
  "undefined",
  "unknown",
  "user",
  "dein",
]);

export function deriveVoxyGreetingName(
  displayName: string | null | undefined,
): string | null {
  const normalized = String(displayName ?? "")
    .normalize("NFKC")
    .trim()
    .replace(/\s+/g, " ");
  if (!normalized || normalized.includes("@") || /https?:\/\/|www\./i.test(normalized)) {
    return null;
  }
  const first = normalized.split(" ")[0]?.replace(/^[^\p{L}]+|[^\p{L}'’-]+$/gu, "");
  if (!first || first.length < 2 || first.length > 40) return null;
  if (!/^\p{L}[\p{L}'’-]*$/u.test(first)) return null;
  if (UNSUITABLE_NAME_TOKENS.has(first.toLowerCase())) return null;
  if (/^[a-f0-9-]{8,}$/i.test(first) || /\d/.test(first)) return null;
  return first;
}

export function getCreateVoxyCopy(
  locale: CreateVoxyLocale,
  displayName: string | null | undefined,
) {
  const firstName = deriveVoxyGreetingName(displayName);
  if (locale === "en") {
    return {
      label: "Voxy",
      greeting: firstName ? `Hello ${firstName},` : "Hello neighbor,",
      intro:
        "Tell me what concerns you — by writing or speaking. I’ll briefly organize it, then you can confirm or clarify what I understood.",
      noAutoPublish: "No auto-publishing",
      retry: "Try again",
      viewTicket: "View technical case",
      continueLater: "Continue later",
      savedFailureTitle: "Your contribution is here.",
      savedFailureLead:
        "I couldn’t complete the automatic classification just now. Your contribution remains saved.",
      handedOff:
        "I created a technical case for this incident.",
      resolutionNotice:
        "You’ll receive a notification as soon as the technical case has been resolved.",
      noTicket:
        "You can try the classification again or continue later. Your contribution remains available.",
      technicalReference: "Technical reference",
    } as const;
  }
  return {
    label: "Voxy",
    greeting: firstName ? `Hallo ${firstName},` : "Hallo Nachbar,",
    intro:
      "Sag mir, was dich beschäftigt – geschrieben oder gesprochen. Ich ordne es kurz ein. Danach bestätigst oder präzisierst du, was ich verstanden habe.",
    noAutoPublish: "Kein Auto-Publish",
    retry: "Erneut versuchen",
    viewTicket: "Technischen Fall ansehen",
    continueLater: "Später fortsetzen",
    savedFailureTitle: "Dein Beitrag ist angekommen.",
    savedFailureLead:
      "Ich konnte die automatische Einordnung gerade nicht abschließen. Dein Beitrag bleibt gespeichert.",
    handedOff:
      "Ich habe dazu einen technischen Fall erfasst.",
    resolutionNotice:
      "Sobald der technische Fall gelöst ist, bekommst du eine Nachricht.",
    noTicket:
      "Du kannst die Einordnung erneut versuchen oder später fortsetzen. Dein Beitrag bleibt erhalten.",
    technicalReference: "Fehlerreferenz",
  } as const;
}

export function buildCreateSupportFailureCopy(input: {
  locale: CreateVoxyLocale;
  handoff: CreateSupportHandoffPublic | null;
}) {
  const copy = getCreateVoxyCopy(input.locale, null);
  if (input.handoff?.status === "created") {
    return {
      title: copy.savedFailureTitle,
      paragraphs: [
        copy.savedFailureLead,
        copy.handedOff,
        `${input.locale === "en" ? "Technical case" : "Technischer Fall"}: ${
          input.handoff.ticket.ticketNumber
        }`,
        input.handoff.ticket.notificationLinked ? copy.resolutionNotice : null,
      ].filter((value): value is string => Boolean(value)),
      ticketHref: input.handoff.ticket.viewHref,
    };
  }
  return {
    title: copy.savedFailureTitle,
    paragraphs: [
      copy.savedFailureLead,
      copy.noTicket,
      input.handoff?.status === "failed"
        ? `${copy.technicalReference}: ${input.handoff.technicalReference}`
        : null,
    ].filter((value): value is string => Boolean(value)),
    ticketHref: null,
  };
}
