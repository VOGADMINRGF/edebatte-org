// @vitest-environment jsdom

import { beforeEach, describe, expect, it, vi } from "vitest";
import {
  CREATE_CLIENT_SESSION_HEADER,
  CREATE_HONEYPOT_HEADER,
  createMutationRequestHeaders,
  ensureCreateHoneypotElement,
} from "@/features/create/createMutationSecurityContract";

describe("create anti-spam client contract", () => {
  beforeEach(() => {
    document.body.innerHTML = "";
    window.sessionStorage.clear();
    vi.restoreAllMocks();
  });

  it("installs an off-screen honeypot that is absent from keyboard and screenreader flow", () => {
    const trap = ensureCreateHoneypotElement();
    expect(trap).not.toBeNull();
    expect(trap?.tabIndex).toBe(-1);
    expect(trap?.getAttribute("aria-hidden")).toBe("true");
    expect(trap?.autocomplete).toBe("off");
    expect(trap?.name).not.toMatch(/email|phone|website/i);
    expect(trap?.style.pointerEvents).toBe("none");
    expect(trap?.style.left).toBe("-10000px");
  });

  it("keeps normal users invisible to the honeypot and emits a stable per-tab client signal", () => {
    const first = createMutationRequestHeaders();
    const second = createMutationRequestHeaders();

    expect(first[CREATE_HONEYPOT_HEADER]).toBeUndefined();
    expect(first[CREATE_CLIENT_SESSION_HEADER]).toMatch(/^[a-z0-9-]{8,120}$/i);
    expect(second[CREATE_CLIENT_SESSION_HEADER]).toBe(
      first[CREATE_CLIENT_SESSION_HEADER],
    );
  });

  it("forwards a bot-filled honeypot only as a private guard header", () => {
    const trap = ensureCreateHoneypotElement();
    expect(trap).not.toBeNull();
    if (!trap) return;
    trap.value = "https://spam.example";

    const headers = createMutationRequestHeaders();
    expect(headers[CREATE_HONEYPOT_HEADER]).toBe("https://spam.example");
  });
});
