// @vitest-environment jsdom

import { readFileSync } from "node:fs";
import { resolve } from "node:path";
import type { ReactNode } from "react";
import { cleanup, fireEvent, render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { afterEach, describe, expect, it, vi } from "vitest";
import GuestCreateEphemeralClient from "@/app/create/GuestCreateEphemeralClient";
import {
  CREATE_HONEYPOT_MAX_LENGTH,
  CREATE_MAX_TEXT_LENGTH,
  createMutationRequestHeaders,
} from "@/features/create/createMutationSecurityContract";

vi.mock("next/link", () => ({
  default: ({ href, children }: { href: string; children: ReactNode }) => <a href={href}>{children}</a>,
}));

const componentSource = readFileSync(
  resolve(process.cwd(), "src/app/create/GuestCreateEphemeralClient.tsx"),
  "utf8",
);
const pageSource = readFileSync(resolve(process.cwd(), "src/app/create/page.tsx"), "utf8");
const pageRuntimeSource = pageSource.slice(pageSource.indexOf("export default async function"));

function response(status: number) {
  return new Response(null, { status });
}

afterEach(() => {
  cleanup();
  vi.unstubAllGlobals();
});

describe("guest ephemeral create UI contract", () => {
  it("keeps guest text in controlled component state and clears it on remount", async () => {
    const user = userEvent.setup();
    const view = render(<GuestCreateEphemeralClient locale="de" />);
    const input = screen.getByLabelText("Dein Anliegen");

    await user.type(input, "Sichere Schulwege");
    expect(input).toHaveProperty("value", "Sichere Schulwege");
    expect(screen.getByText(`${input.value.length} / ${CREATE_MAX_TEXT_LENGTH} Zeichen`)).not.toBeNull();

    view.unmount();
    render(<GuestCreateEphemeralClient locale="de" />);
    expect(screen.getByLabelText("Dein Anliegen")).toHaveProperty("value", "");
  });

  it("submits the existing session and claim routes in order with the exact claim body", async () => {
    const user = userEvent.setup();
    const fetchMock = vi.fn().mockResolvedValueOnce(response(200)).mockResolvedValueOnce(response(202));
    vi.stubGlobal("fetch", fetchMock);
    render(<GuestCreateEphemeralClient locale="en" />);

    await user.type(screen.getByLabelText("Your concern"), "Safer school routes");
    await user.click(screen.getByRole("button", { name: "Send request" }));

    expect(fetchMock).toHaveBeenNthCalledWith(1, "/api/create/session", {
      method: "POST",
      headers: createMutationRequestHeaders({ honeypotValue: "" }),
    });
    expect(fetchMock).toHaveBeenNthCalledWith(2, "/api/create/intake", expect.objectContaining({
      method: "POST",
      headers: createMutationRequestHeaders({ honeypotValue: "" }),
    }));
    const intakeBody = JSON.parse(fetchMock.mock.calls[1]?.[1]?.body as string);
    expect(intakeBody).toEqual({ claim: "Safer school routes" });
    expect(Object.keys(intakeBody)).toEqual(["claim"]);
    expect(screen.getByText(/accepted for this operation/i)).not.toBeNull();
    expect(screen.queryByText(/operationId/i)).toBeNull();
  });

  it("uses fixed failure copy without echoing server or submitted content", async () => {
    const user = userEvent.setup();
    vi.stubGlobal("fetch", vi.fn().mockResolvedValueOnce(response(200)).mockResolvedValueOnce(response(403)));
    render(<GuestCreateEphemeralClient locale="en" />);

    await user.type(screen.getByLabelText("Your concern"), "person@example.org");
    await user.click(screen.getByRole("button", { name: "Send request" }));

    expect(screen.getByRole("alert").textContent).toBe("The request could not be processed.");
    expect(screen.queryByText("person@example.org")).toBeNull();
  });

  it("enforces the empty, canonical length, and duplicate-submit boundaries", async () => {
    const user = userEvent.setup();
    const pendingSession = new Promise<Response>(() => {});
    const fetchMock = vi.fn().mockReturnValue(pendingSession);
    vi.stubGlobal("fetch", fetchMock);
    render(<GuestCreateEphemeralClient locale="en" />);

    const submit = screen.getByRole("button", { name: "Send request" });
    expect(submit).toHaveProperty("disabled", true);
    fireEvent.change(screen.getByLabelText("Your concern"), { target: { value: "x".repeat(CREATE_MAX_TEXT_LENGTH + 1) } });
    expect(screen.getByLabelText("Your concern")).toHaveProperty("value", "x".repeat(CREATE_MAX_TEXT_LENGTH));
    await user.click(submit);
    await user.click(screen.getByRole("button", { name: "Sending …" }));
    expect(fetchMock).toHaveBeenCalledTimes(1);
  });

  it("keeps the honeypot bounded and ephemeral and keeps DE and EN copy separate", () => {
    expect(componentSource).toContain("useState(\"\")");
    expect(componentSource).toContain("CREATE_HONEYPOT_MAX_LENGTH");
    expect(componentSource).toContain('name="request_note_2f7"');
    expect(CREATE_HONEYPOT_MAX_LENGTH).toBe(160);

    const de = render(<GuestCreateEphemeralClient locale="de" />).container.textContent ?? "";
    cleanup();
    const en = render(<GuestCreateEphemeralClient locale="en" />).container.textContent ?? "";
    expect(de).toContain("Anliegen ohne Konto mitteilen");
    expect(de).not.toContain("Share a concern without an account");
    expect(en).toContain("Share a concern without an account");
    expect(en).not.toContain("Anliegen ohne Konto mitteilen");
  });

  it("contains no guest persistence, handoff, authenticated flow, URL, planner, analysis, or raw logging path", () => {
    expect(componentSource).not.toMatch(/localStorage|sessionStorage|indexedDB|CacheStorage|document\.cookie|serviceWorker/i);
    expect(componentSource).not.toMatch(/createHandoff|useCreateHandoffDraft|workstate|account draft|planner|intelligent-followup|link-analysis|source-analysis/i);
    expect(componentSource).not.toMatch(/window\.location|URLSearchParams|history\.|console\.|telemetry/i);
    expect(componentSource).not.toMatch(/correlation|operationId/);
    expect(componentSource).toContain('href="/login?next=/create"');
    expect(componentSource).toContain("setGuestText(\"\")");
  });

  it("branches guests before account and resume work while preserving the authenticated CreateClient branch", () => {
    const guestBranch = pageRuntimeSource.indexOf("return <GuestCreateEphemeralClient locale={pageLocale} />");
    expect(guestBranch).toBeGreaterThan(-1);
    for (const authenticatedOnlySymbol of [
      "getAccountOverview(entitlements.userId)",
      "resolveCreateDraftResumeText({",
      "readManualAnlassraumServerDraftForCurrentUser",
      "<CreateClient",
    ]) {
      expect(guestBranch).toBeLessThan(pageRuntimeSource.indexOf(authenticatedOnlySymbol));
    }
  });
});
