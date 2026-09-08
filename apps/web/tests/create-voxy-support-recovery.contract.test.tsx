import { describe, expect, it } from "vitest";
import { renderToStaticMarkup } from "react-dom/server";
import { readFileSync } from "node:fs";
import { resolve } from "node:path";
import CreateVisualFollowup from "@/features/create/CreateVisualFollowup";
import CreateWorkspaceShell from "@/features/create/CreateWorkspaceShell";
import CreateSupportNotifications from "@/app/account/CreateSupportNotifications";
import CreateSupportTicketAccountCard from "@/app/account/CreateSupportTicketAccountCard";
import { buildCreateTechnicalFollowup } from "@/features/create/intelligentFollowupResults";
import {
  deriveVoxyGreetingName,
  getCreateVoxyCopy,
} from "@/features/create/createVoxySupportCopy";

const NOOP = () => {};

describe("/create Voxy and support recovery contract", () => {
  it("uses a safe first name and falls back for unsuitable account values", () => {
    expect(deriveVoxyGreetingName("Renée Beispiel")).toBe("Renée");
    expect(deriveVoxyGreetingName("user@example.org")).toBeNull();
    expect(deriveVoxyGreetingName("anonymous")).toBeNull();
    expect(getCreateVoxyCopy("de", "Renée Beispiel").greeting).toBe("Hallo Renée,");
    expect(getCreateVoxyCopy("de", "user@example.org").greeting).toBe(
      "Hallo Nachbar,",
    );
    expect(
      getCreateVoxyCopy("fr" as unknown as "de", null).greeting,
    ).toBe("Hallo Nachbar,");
  });

  it("renders the truthful technical-case recovery message without another save action", () => {
    const result = buildCreateTechnicalFollowup({
      text: "Vor der Schule fehlen sichere Querungen.",
      analysisState: "ai_failed",
      sourceType: "text",
      sourceLoaded: true,
      userMessage: "Analyse nicht verfügbar.",
    });
    const html = renderToStaticMarkup(
      <CreateVisualFollowup
        result={result}
        locale="de"
        supportHandoff={{
          status: "created",
          ticket: {
            ticketNumber: "EDB-20260729-ABC12345",
            status: "open",
            safeUserMessage: "Fall angelegt.",
            viewHref: "/account?ticket=EDB-20260729-ABC12345#support-tickets",
            notificationLinked: true,
          },
        }}
        onConfirm={NOOP}
        onEdit={NOOP}
        onPrepareSubmission={NOOP}
        onPrepareAnlassraum={NOOP}
        onOpenDossierAppend={NOOP}
        onOpenDossierCreate={NOOP}
        onPrepareVote={NOOP}
        onRetryPlanner={NOOP}
        onSaveOnly={NOOP}
        onDeferWork={NOOP}
        continuationValue=""
        onContinuationChange={NOOP}
        onContinueConversation={NOOP}
      />,
    );

    expect(html).toContain("Voxy");
    expect(html).toContain("Ich konnte die automatische Einordnung gerade nicht abschließen.");
    expect(html).toContain("Ich habe dazu einen technischen Fall erfasst.");
    expect(html).toContain("EDB-20260729-ABC12345");
    expect(html).toContain("Technischen Fall ansehen");
    expect(html).toContain('role="status"');
    expect(html).toContain('aria-live="polite"');
    expect(html).toContain('aria-atomic="true"');
    expect(html).toContain('tabindex="-1"');
    expect(html).toContain("[overflow-wrap:anywhere]");
    expect(html).toContain(">Du<");
    expect(html).toContain("Dein Beitrag ist angekommen.");
    expect(html).not.toContain("Analyse blockiert");
    expect(html).not.toContain("Analysis blocked");
    expect(html).not.toContain(">You<");
    expect(html).not.toContain("Eingabe speichern");
  });

  it("renders the complete English failure handoff without German user-chat fragments", () => {
    const longFailureMessage = `The AI analysis could not be completed. No topics were derived. ${"The saved contribution remains available for another controlled attempt. ".repeat(8)}`;
    const result = buildCreateTechnicalFollowup({
      text: "Safer crossings are needed near the school.",
      analysisState: "ai_failed",
      sourceType: "text",
      sourceLoaded: true,
      userMessage: longFailureMessage,
    });
    const html = renderToStaticMarkup(
      <CreateVisualFollowup
        result={result}
        locale="en"
        supportHandoff={{
          status: "created",
          ticket: {
            ticketNumber: "EDB-20260730-ENGLISH1",
            status: "open",
            safeUserMessage: "Your contribution is saved.",
            viewHref: "/account?ticket=EDB-20260730-ENGLISH1#support-tickets",
            notificationLinked: true,
          },
        }}
        onConfirm={NOOP}
        onEdit={NOOP}
        onPrepareSubmission={NOOP}
        onPrepareAnlassraum={NOOP}
        onOpenDossierAppend={NOOP}
        onOpenDossierCreate={NOOP}
        onPrepareVote={NOOP}
        onRetryPlanner={NOOP}
        onDeferWork={NOOP}
        continuationValue=""
        onContinuationChange={NOOP}
        onContinueConversation={NOOP}
      />,
    );

    expect(html).toContain(">You<");
    expect(html).not.toContain("1 · Contribution received");
    expect(html).not.toContain("Analysis blocked");
    expect(html).toContain("I couldn’t complete the automatic classification just now.");
    expect(html).toContain("I created a technical case for this incident.");
    expect(html).toContain(longFailureMessage.trim());
    expect(html).toContain("View technical case");
    expect(html).toContain('role="status"');
    expect(html).toContain('aria-live="polite"');
    expect(html).toContain('tabindex="-1"');
    expect(html).toContain("sm:max-w-[78%]");
    expect(html).not.toContain(">Du<");
    expect(html).not.toContain("Deinen Beitrag");
    expect(html).not.toContain("Die KI-Analyse");
    expect(html).not.toContain("Fehlerreferenz");
  });

  it("keeps a failed English ticket persistence handoff honest and language-pure", () => {
    const result = buildCreateTechnicalFollowup({
      text: "Please check this contribution.",
      analysisState: "ai_failed",
      sourceType: "text",
      sourceLoaded: true,
      userMessage:
        "The AI analysis could not be completed. No topics were derived.",
    });
    const html = renderToStaticMarkup(
      <CreateVisualFollowup
        result={result}
        locale="en"
        supportHandoff={{
          status: "failed",
          technicalReference: "corr-english-failed",
          safeUserMessage: "Your contribution is saved.",
        }}
        onConfirm={NOOP}
        onEdit={NOOP}
        onPrepareSubmission={NOOP}
        onPrepareAnlassraum={NOOP}
        onOpenDossierAppend={NOOP}
        onOpenDossierCreate={NOOP}
        onPrepareVote={NOOP}
        onRetryPlanner={NOOP}
        onDeferWork={NOOP}
        continuationValue=""
        onContinuationChange={NOOP}
        onContinueConversation={NOOP}
      />,
    );

    expect(html).toContain("No topics were derived.");
    expect(html).toContain("Technical reference");
    expect(html).toContain('role="alert"');
    expect(html).not.toContain('aria-live="assertive"');
    expect(html).toContain('tabindex="-1"');
    expect(html).toContain("corr-english-failed");
    expect(html).not.toContain("I created a technical case for this incident.");
    expect(html).not.toContain("Technical case:");
    expect(html).not.toContain("Fehlerreferenz");
  });

  it("does not render raw provider failures in the user-facing recovery state", () => {
    const result = buildCreateTechnicalFollowup({
      text: "Please check this contribution.",
      analysisState: "ai_failed",
      sourceType: "text",
      sourceLoaded: true,
      userMessage:
        "Anthropic 529 overloaded_error: request req_secret_provider_trace failed",
    });
    const html = renderToStaticMarkup(
      <CreateVisualFollowup
        result={result}
        locale="en"
        onConfirm={NOOP}
        onEdit={NOOP}
        onPrepareSubmission={NOOP}
        onPrepareAnlassraum={NOOP}
        onOpenDossierAppend={NOOP}
        onOpenDossierCreate={NOOP}
        onPrepareVote={NOOP}
        onRetryPlanner={NOOP}
        onDeferWork={NOOP}
        continuationValue=""
        onContinuationChange={NOOP}
        onContinueConversation={NOOP}
      />,
    );

    expect(html).toContain("I couldn’t complete the automatic classification just now.");
    expect(html).not.toContain("overloaded_error");
    expect(html).not.toContain("req_secret_provider_trace");
  });

  it("keeps the initial shell focused and places the no-publish guardrail by the composer", () => {
    const html = renderToStaticMarkup(
      <CreateWorkspaceShell
        locale="de"
        activeStage="input"
        phase="initial"
        chatThread={<p>Hallo Nachbar,</p>}
        notice={<p>Hinweis</p>}
        composer={<textarea aria-label="Beitrag" />}
      />,
    );
    expect(html).not.toContain("data-create-shell-pipeline");
    expect(html).toContain("Kein Auto-Publish");
    expect(html.indexOf("Hinweis")).toBeLessThan(html.indexOf("Beitrag"));
  });

  it("uses the account UI locale for ticket status and resolution messages", () => {
    const html = renderToStaticMarkup(
      <>
        <CreateSupportNotifications
          locale="en"
          notifications={[
            {
              id: "notification-1",
              userId: "user-1",
              type: "support_ticket_resolved",
              ticketId: "ticket-1",
              ticketNumber: "EDB-20260729-ABC12345",
              title: "Ticket EDB-20260729-ABC12345 has been resolved",
              body: "The technical incident has been resolved.",
              href: "/account?ticket=EDB-20260729-ABC12345#support-tickets",
              locale: "en",
              createdAt: "2026-07-29T12:00:00.000Z",
              readAt: null,
              emailDeliveryStatus: "sent",
              emailMessageId: "mail-1",
            },
          ]}
        />
        <CreateSupportTicketAccountCard
          locale="en"
          ticketNumber="EDB-20260729-ABC12345"
          ticket={{
            id: "ticket-1",
            ticketNumber: "EDB-20260729-ABC12345",
            status: "resolved",
            affectedUserId: "user-1",
            route: "/create",
            orchestrationPhase: "intelligent_followup",
            correlationId: "correlation-1",
            traceId: "correlation-1",
            technicalErrorCode: "CREATE_AI_FAILED",
            technicalDiagnosis: {
              provider: "openai",
              reason: "timeout",
              providerErrorCode: "TIMEOUT",
              attemptCount: 2,
            },
            failureFingerprint: "fingerprint-1",
            draftId: "draft-1",
            createdAt: "2026-07-29T12:00:00.000Z",
            updatedAt: "2026-07-29T12:05:00.000Z",
            resolvedAt: "2026-07-29T12:05:00.000Z",
            notificationRecipientLinked: true,
            notificationStatus: "email_sent",
          }}
        />
      </>,
    );

    expect(html).toContain("Messages from technical support");
    expect(html).toContain("View ticket");
    expect(html).toContain("Resolved");
    expect(html).toContain("Open saved contribution");
    expect(html).not.toContain("Technischer Support");
  });

  it("saves before analysis and carries draft and correlation identifiers", () => {
    const source = readFileSync(
      resolve(process.cwd(), "src/app/create/CreateClient.tsx"),
      "utf8",
    );
    const startFlow = source.slice(
      source.indexOf("const startCreateFlow"),
      source.indexOf("const handleStart"),
    );
    expect(startFlow.indexOf('fetch("/api/create/save"')).toBeLessThan(
      startFlow.indexOf('fetch("/api/create/intelligent-followup"'),
    );
    expect(startFlow).toContain("analysisRunInFlightRef.current");
    expect(startFlow).toContain("correlationId");
    expect(startFlow).toContain("draftId: runDraftId");
    expect(startFlow).toContain("autoPublish: false");
    expect(source).toContain(
      '{props.locale === "en" ? "You" : "Du"}',
    );
  });

  it("keeps loading, focus, keyboard, and 320px recovery safeguards wired", () => {
    const clientSource = readFileSync(
      resolve(process.cwd(), "src/app/create/CreateClient.tsx"),
      "utf8",
    );
    const followupSource = readFileSync(
      resolve(process.cwd(), "src/features/create/CreateVisualFollowup.tsx"),
      "utf8",
    );
    const composerSource = readFileSync(
      resolve(process.cwd(), "src/features/create/SharedCreateComposer.tsx"),
      "utf8",
    );

    expect(clientSource).toContain('role={props.announce ? "status" : undefined}');
    expect(clientSource).toContain('aria-live={props.announce ? "polite" : undefined}');
    expect(clientSource).toContain("lastFocusedDynamicStatusRef.current === focusKey");
    expect(clientSource).toContain("isActivelyTyping");
    expect(clientSource).toContain("target.focus({ preventScroll: true })");
    expect(followupSource).toContain("flex-col gap-2.5 sm:flex-row");
    expect(followupSource).toContain("w-full px-4 py-2");
    expect(followupSource).toContain("focus-visible:outline");
    expect(followupSource).toContain("[overflow-wrap:anywhere]");
    expect(composerSource).toContain('role="alert"');
    expect(composerSource).toContain('tabIndex={-1}');
  });
});
