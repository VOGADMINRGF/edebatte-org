import { describe, expect, it, vi } from "vitest";
import { renderToStaticMarkup } from "react-dom/server";
import CreateProgressiveTransparency from "@/features/create/CreateProgressiveTransparency";
import {
  CreateProgressEventSchema,
  buildCreateInitialProgressEvents,
  buildCreateStructureConsolidatingEvent,
  buildCreateValidatedProgressEvents,
  dedupeCreateProgressEvents,
} from "@/features/create/createProgressEventContract";
import {
  CreateProgressStreamError,
  consumeCreateProgressResponse,
} from "@/features/create/createProgressStreamClient";
import {
  buildCreateProgressResumeSnapshot,
  clearCreateProgressResumeSnapshot,
  readCreateProgressResumeSnapshot,
  writeCreateProgressResumeSnapshot,
} from "@/features/create/createProgressResume";

const OPERATION_ID = "operation-progress-726";
const CREATED_AT = "2026-09-06T09:00:00.000Z";

function numberedProgram(count: number) {
  return Array.from(
    { length: count },
    (_, index) => `${index + 1}. Themenbereich ${index + 1}: Konkreter Vorschlag`,
  ).join("\n");
}

function topics(count: number) {
  return Array.from({ length: count }, (_, index) => ({
    id: `topic-${index + 1}`,
    label: `Themenbereich ${index + 1}`,
    confidence: index < 4 ? ("high" as const) : ("medium" as const),
  }));
}

describe("/create progressive transparency contract", () => {
  it("emits immediate deterministic structure truth for a 14-point program", () => {
    const initial = buildCreateInitialProgressEvents({
      text: numberedProgram(14),
      operationId: OPERATION_ID,
      correlationId: OPERATION_ID,
      locale: "de",
      createdAt: CREATED_AT,
    });

    expect(initial.structure).toMatchObject({
      issueMode: "multi_issue",
      segmentCount: 14,
    });
    expect(initial.events.map((event) => event.type)).toEqual([
      "draft.saved",
      "intake.classified",
      "structure.detected",
    ]);
    expect(initial.events[2]).toMatchObject({
      status: "completed",
      visibility: "recognized",
      provisional: true,
      label: "Struktur erkannt: 14 getrennte Abschnitte.",
    });
    expect(JSON.stringify(initial)).not.toMatch(
      /provider|reasoning|token|session|userId|apiKey/i,
    );
  });

  it("keeps short single-issue progress compact without an invented structure timeline", () => {
    const initial = buildCreateInitialProgressEvents({
      text: "Beschäftigte in Behindertenwerkstätten sollen den gesetzlichen Mindestlohn erhalten.",
      operationId: OPERATION_ID,
      correlationId: OPERATION_ID,
      locale: "de",
      createdAt: CREATED_AT,
    });

    expect(initial.structure).toMatchObject({
      issueMode: "single_issue",
      segmentCount: 0,
    });
    expect(initial.events.map((event) => event.type)).toEqual([
      "draft.saved",
      "intake.classified",
    ]);
    expect(buildCreateStructureConsolidatingEvent({
      operationId: OPERATION_ID,
      correlationId: OPERATION_ID,
      locale: "de",
      structure: initial.structure,
      createdAt: CREATED_AT,
    })).toBeNull();
  });

  it("describes the real browser persistence boundary for guest intake", () => {
    const initial = buildCreateInitialProgressEvents({
      text: "Beschäftigte in Behindertenwerkstätten sollen den gesetzlichen Mindestlohn erhalten.",
      operationId: OPERATION_ID,
      correlationId: OPERATION_ID,
      locale: "de",
      persistence: "browser",
      createdAt: CREATED_AT,
    });

    expect(initial.events[0]).toMatchObject({
      type: "draft.saved",
      visibility: "verified",
      provisional: false,
      label: "Entwurf in diesem Browser gespeichert.",
    });

    const failedPersistence = buildCreateInitialProgressEvents({
      text: "Beschäftigte in Behindertenwerkstätten sollen den gesetzlichen Mindestlohn erhalten.",
      operationId: OPERATION_ID,
      correlationId: OPERATION_ID,
      locale: "de",
      persistence: "browser",
      draftSaved: false,
      createdAt: CREATED_AT,
    });
    expect(failedPersistence.events.some((event) => event.type === "draft.saved")).toBe(false);
    expect(failedPersistence.events[0]?.type).toBe("intake.classified");
  });

  it("makes a real 15-to-14 consolidation correction visible", () => {
    const initial = buildCreateInitialProgressEvents({
      text: numberedProgram(15),
      operationId: OPERATION_ID,
      correlationId: OPERATION_ID,
      locale: "de",
      createdAt: CREATED_AT,
    });
    const final = buildCreateValidatedProgressEvents({
      operationId: OPERATION_ID,
      correlationId: OPERATION_ID,
      locale: "de",
      structure: initial.structure,
      topics: topics(14),
      scopes: ["municipal"],
      qualityPassed: true,
      partial: false,
      createdAt: CREATED_AT,
    });

    expect(final).toContainEqual(
      expect.objectContaining({
        type: "structure.corrected",
        status: "corrected",
        visibility: "corrected",
        label:
          "Zunächst wurden 15 Abschnitte erkannt. Nach der Zusammenführung bleiben 14 eigenständige Themen.",
      }),
    );
    const html = renderToStaticMarkup(
      <CreateProgressiveTransparency
        events={[...initial.events, ...final]}
        isRunning={false}
        locale="de"
      />,
    );
    expect(html).toContain(
      "Zunächst wurden 15 Abschnitte erkannt. Nach der Zusammenführung bleiben 14 eigenständige Themen.",
    );
    expect(final.at(-1)?.type).toBe("result.ready");
  });

  it("preserves real partial progress when final quality fails", () => {
    const initial = buildCreateInitialProgressEvents({
      text: numberedProgram(11),
      operationId: OPERATION_ID,
      correlationId: OPERATION_ID,
      locale: "de",
      createdAt: CREATED_AT,
    });
    const final = buildCreateValidatedProgressEvents({
      operationId: OPERATION_ID,
      correlationId: OPERATION_ID,
      locale: "de",
      structure: initial.structure,
      topics: topics(11),
      scopes: ["unclear"],
      qualityPassed: false,
      partial: true,
      createdAt: CREATED_AT,
    });
    const combined = dedupeCreateProgressEvents([...initial.events, ...final]);

    expect(combined).toContainEqual(expect.objectContaining({ type: "structure.detected" }));
    expect(combined).toContainEqual(expect.objectContaining({ type: "scope.open" }));
    expect(combined).toContainEqual(expect.objectContaining({ type: "result.partial" }));
    expect(combined.some((event) => event.type === "topic.detected")).toBe(false);
  });

  it("rejects raw provider fields and unsupported research or graph event types", () => {
    const base = buildCreateInitialProgressEvents({
      text: numberedProgram(3),
      operationId: OPERATION_ID,
      correlationId: OPERATION_ID,
      locale: "de",
      createdAt: CREATED_AT,
    }).events[0];

    expect(CreateProgressEventSchema.safeParse({ ...base, userId: "private" }).success).toBe(false);
    expect(CreateProgressEventSchema.safeParse({ ...base, providerPayload: { raw: true } }).success).toBe(false);
    expect(CreateProgressEventSchema.safeParse({ ...base, type: "research.started" }).success).toBe(false);
    expect(CreateProgressEventSchema.safeParse({ ...base, type: "graph.checking" }).success).toBe(false);
  });

  it("parses streamed progress and the final result while ignoring invalid public events", async () => {
    const validEvent = buildCreateInitialProgressEvents({
      text: numberedProgram(3),
      operationId: OPERATION_ID,
      correlationId: OPERATION_ID,
      locale: "de",
      createdAt: CREATED_AT,
    }).events[0];
    const payload = [
      `event: progress\ndata: ${JSON.stringify({ event: validEvent })}\n\n`,
      `event: progress\ndata: ${JSON.stringify({ event: { ...validEvent, userId: "private" } })}\n\n`,
      `event: result\ndata: ${JSON.stringify({ ok: true, result: { id: "final" } })}\n\n`,
    ].join("");
    const observed: string[] = [];
    const result = await consumeCreateProgressResponse<{ ok: boolean; result: { id: string } }>(
      new Response(payload, { headers: { "content-type": "text/event-stream" } }),
      { onProgress: (event) => observed.push(event.eventId) },
    );

    expect(observed).toEqual([validEvent.eventId]);
    expect(result).toEqual({ ok: true, result: { id: "final" } });
  });

  it("surfaces a typed resume error without manufacturing a result", async () => {
    const response = new Response(
      `event: error\ndata: ${JSON.stringify({
        errorCode: "CREATE_PROGRESS_RESUME_UNAVAILABLE",
        message: "Nicht mehr verfügbar.",
      })}\n\n`,
      { headers: { "content-type": "text/event-stream" } },
    );
    await expect(
      consumeCreateProgressResponse(response, { onProgress: vi.fn() }),
    ).rejects.toMatchObject<CreateProgressStreamError>({
      errorCode: "CREATE_PROGRESS_RESUME_UNAVAILABLE",
    });
  });

  it("cancels and releases the stream reader on client abort", async () => {
    const controller = new AbortController();
    let cancelled = false;
    const response = new Response(
      new ReadableStream<Uint8Array>({
        cancel() {
          cancelled = true;
        },
      }),
      { headers: { "content-type": "text/event-stream" } },
    );
    const consuming = consumeCreateProgressResponse(response, {
      onProgress: vi.fn(),
      signal: controller.signal,
    });

    controller.abort();

    await expect(consuming).rejects.toMatchObject({ name: "AbortError" });
    expect(cancelled).toBe(true);
  });

  it("stores only a short-lived resume reference and expires it fail-closed", () => {
    const values = new Map<string, string>();
    const storage = {
      getItem: (key: string) => values.get(key) ?? null,
      setItem: (key: string, value: string) => values.set(key, value),
      removeItem: (key: string) => values.delete(key),
    };
    const snapshot = buildCreateProgressResumeSnapshot({
      operationId: OPERATION_ID,
      correlationId: OPERATION_ID,
      draftId: "draft-progress-726",
      text: "Privater Bürgertext, der nicht in der Resume-Referenz dupliziert werden darf.",
      locale: "de",
      intent: "contribute",
      now: new Date(CREATED_AT),
    });
    writeCreateProgressResumeSnapshot(storage, "resume", snapshot);

    expect(values.get("resume")).not.toContain("Privater Bürgertext");
    expect(readCreateProgressResumeSnapshot(storage, "resume", new Date("2026-09-06T09:10:00.000Z"))).toEqual(snapshot);
    expect(readCreateProgressResumeSnapshot(storage, "resume", new Date("2026-09-06T09:15:00.000Z"))).toBeNull();
  });

  it("keeps an in-flight guest resume bound to the anonymous actor across login navigation", () => {
    const snapshot = buildCreateProgressResumeSnapshot({
      operationId: OPERATION_ID,
      correlationId: OPERATION_ID,
      actorMode: "anonymous",
      draftId: "guest-browser",
      text: "Der Gasttext bleibt im bestehenden browserlokalen Arbeitsstand.",
      locale: "de",
      now: new Date(CREATED_AT),
    });

    expect(snapshot).toMatchObject({
      actorMode: "anonymous",
      draftId: "guest-browser",
    });
    expect(JSON.stringify(snapshot)).not.toContain("Der Gasttext");
  });

  it("does not block the saved create flow when browser storage is unavailable", () => {
    const blockedStorage = {
      getItem: () => {
        throw new DOMException("Storage blocked", "SecurityError");
      },
      setItem: () => {
        throw new DOMException("Storage blocked", "SecurityError");
      },
      removeItem: () => {
        throw new DOMException("Storage blocked", "SecurityError");
      },
    };
    const snapshot = buildCreateProgressResumeSnapshot({
      operationId: OPERATION_ID,
      correlationId: OPERATION_ID,
      draftId: "draft-progress-726",
      text: "Gespeicherter Beitrag",
      locale: "de",
      now: new Date(CREATED_AT),
    });

    expect(writeCreateProgressResumeSnapshot(blockedStorage, "resume", snapshot)).toBe(false);
    expect(readCreateProgressResumeSnapshot(blockedStorage, "resume")).toBeNull();
    expect(() => clearCreateProgressResumeSnapshot(blockedStorage, "resume")).not.toThrow();
  });

  it("renders four verified topics plus the remainder with one throttled polite live region", () => {
    const initial = buildCreateInitialProgressEvents({
      text: numberedProgram(14),
      operationId: OPERATION_ID,
      correlationId: OPERATION_ID,
      locale: "de",
      createdAt: CREATED_AT,
    });
    const final = buildCreateValidatedProgressEvents({
      operationId: OPERATION_ID,
      correlationId: OPERATION_ID,
      locale: "de",
      structure: initial.structure,
      topics: topics(14),
      scopes: ["municipal"],
      qualityPassed: true,
      partial: false,
      createdAt: CREATED_AT,
    });
    const html = renderToStaticMarkup(
      <CreateProgressiveTransparency
        events={[...initial.events, ...final]}
        isRunning={false}
        locale="de"
      />,
    );

    expect(html).toContain("Struktur erkannt: 14 getrennte Abschnitte.");
    expect(html).toContain("Themenbereich 1");
    expect(html).toContain("+ 10 weitere geprüfte Themen");
    expect(html).toContain("Warum erkannt?");
    expect(html.match(/role="status"/g)).toHaveLength(1);
    expect(html.match(/aria-live="polite"/g)).toHaveLength(1);
    expect(html).toContain("<details");
    expect(html).toContain("<summary");
    expect(html).not.toMatch(/\d+\s*%/);
  });
});
