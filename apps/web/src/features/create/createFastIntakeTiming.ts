import { isCreateFastIntakeText } from "@/features/create/createIntakeClassification";

export const CREATE_FIRST_RESPONSE_PERFORMANCE_TARGET_MS = 3_000;
export const CREATE_FAST_INTAKE_TIMEOUT_MS = 6_500;
export const CREATE_INTELLIGENT_FOLLOWUP_CLIENT_TIMEOUT_MS = 8_000;
export const CREATE_STANDARD_INTAKE_TIMEOUT_MS = 10_000;
export const CREATE_STANDARD_INTELLIGENT_FOLLOWUP_CLIENT_TIMEOUT_MS = 12_500;
export const CREATE_INTELLIGENT_FOLLOWUP_TRANSPORT_RESERVE_MS = 1_000;

export type CreateIntakeTimingLane = "fast" | "standard";

export type CreateIntakeTiming = {
  lane: CreateIntakeTimingLane;
  serverTimeoutMs: number;
  clientTimeoutMs: number;
};

export function resolveCreateIntakeTiming(text: string): CreateIntakeTiming {
  return isCreateFastIntakeText(text)
    ? {
        lane: "fast",
        serverTimeoutMs: CREATE_FAST_INTAKE_TIMEOUT_MS,
        clientTimeoutMs: CREATE_INTELLIGENT_FOLLOWUP_CLIENT_TIMEOUT_MS,
      }
    : {
        lane: "standard",
        serverTimeoutMs: CREATE_STANDARD_INTAKE_TIMEOUT_MS,
        clientTimeoutMs: CREATE_STANDARD_INTELLIGENT_FOLLOWUP_CLIENT_TIMEOUT_MS,
      };
}

export type CreateIntelligentFollowupDeadline = {
  signal: AbortSignal;
  didTimeout: () => boolean;
  clear: () => void;
  cancel: () => void;
};

export function startCreateIntelligentFollowupDeadline(
  timeoutMs = CREATE_INTELLIGENT_FOLLOWUP_CLIENT_TIMEOUT_MS,
): CreateIntelligentFollowupDeadline {
  const controller = new AbortController();
  let timedOut = false;
  let active = true;
  const timeoutId = globalThis.setTimeout(() => {
    if (!active) return;
    timedOut = true;
    controller.abort();
  }, timeoutMs);

  const clear = () => {
    if (!active) return;
    active = false;
    globalThis.clearTimeout(timeoutId);
  };

  return {
    signal: controller.signal,
    didTimeout: () => timedOut,
    clear,
    cancel: () => {
      if (!active) return;
      clear();
      controller.abort();
    },
  };
}

export function isCreateIntelligentFollowupAbortError(
  error: unknown,
): boolean {
  return (
    typeof error === "object" &&
    error !== null &&
    "name" in error &&
    error.name === "AbortError"
  );
}
