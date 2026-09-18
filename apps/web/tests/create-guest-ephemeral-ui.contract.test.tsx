// @vitest-environment jsdom

import { readFileSync } from "node:fs";
import { resolve } from "node:path";
import type { ReactNode } from "react";
import { cleanup, fireEvent, render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { afterEach, describe, expect, it, vi } from "vitest";
import GuestCreateEphemeralClient from "@/app/create/GuestCreateEphemeralClient";
import AuthenticatedGuestAdoptionResumeClient from "@/app/create/AuthenticatedGuestAdoptionResumeClient";
import {
  CREATE_HONEYPOT_MAX_LENGTH,
  CREATE_MAX_TEXT_LENGTH,
  createMutationRequestHeaders,
} from "@/features/create/createMutationSecurityContract";

const navigation = vi.hoisted(() => ({
  replace: vi.fn(),
}));

vi.mock("next/link", () => ({
  default: ({ href, children }: { href: string; children: ReactNode }) => <a href={href}>{children}</a>,
}));

vi.mock("next/navigation", () => ({
  useRouter: () => ({ replace: navigation.replace }),
}));

const componentSource = readFileSync(
  resolve(process.cwd(), "src/app/create/GuestCreateEphemeralClient.tsx"),
  "utf8",
);
const resumeComponentSource = readFileSync(
  resolve(process.cwd(), "src/app/create/AuthenticatedGuestAdoptionResumeClient.tsx"),
  "utf8",
);
const pageSource = readFileSync(resolve(process.cwd(), "src/app/create/page.tsx"), "utf8");
const pageRuntimeSource = pageSource.slice(pageSource.indexOf("export default async function"));

const VALID_OPERATION_ID = "550e8400-e29b-41d4-a716-446655440000";
const VALID_DRAFT_ID = "65a111111111111111111122";
const LOGIN_CONTINUATION_HREF = "/login?next=%2Fcreate%3FnextAction%3Dguest-adoption-resume";

function response(status: number, body: unknown = null) {
  return new Response(body === null ? null : JSON.stringify(body), { status });
}

afterEach(() => {
  cleanup();
  navigation.replace.mockReset();
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

  it("submits session, intake, and adoption preparation in order with the same exact claim", async () => {
    const user = userEvent.setup();
    const fetchMock = vi
      .fn()
      .mockResolvedValueOnce(response(200))
      .mockResolvedValueOnce(response(202, {
        ok: true,
        operationId: VALID_OPERATION_ID,
        status: "accepted",
      }))
      .mockResolvedValueOnce(response(202, { ok: true, status: "prepared" }));
    vi.stubGlobal("fetch", fetchMock);
    render(<GuestCreateEphemeralClient locale="en" />);

    await user.type(screen.getByLabelText("Your concern"), "  Safer school routes  ");
    expect(screen.queryByRole("link", { name: "Log in and continue" })).toBeNull();
    await user.click(screen.getByRole("button", { name: "Prepare request" }));

    await waitFor(() => expect(fetchMock).toHaveBeenCalledTimes(3));
    expect(fetchMock).toHaveBeenNthCalledWith(1, "/api/create/session", {
      method: "POST",
      headers: createMutationRequestHeaders({ honeypotValue: "" }),
    });
    expect(fetchMock).toHaveBeenNthCalledWith(2, "/api/create/intake", expect.objectContaining({
      method: "POST",
      headers: createMutationRequestHeaders({ honeypotValue: "" }),
    }));
    expect(fetchMock).toHaveBeenNthCalledWith(3, "/api/create/adoption-preparation", expect.objectContaining({
      method: "POST",
      headers: createMutationRequestHeaders({ honeypotValue: "" }),
    }));

    const intakeBody = JSON.parse(fetchMock.mock.calls[1]?.[1]?.body as string);
    const preparationBody = JSON.parse(fetchMock.mock.calls[2]?.[1]?.body as string);
    expect(intakeBody).toEqual({ claim: "Safer school routes" });
    expect(preparationBody).toEqual({ claim: "Safer school routes" });
    expect(Object.keys(intakeBody)).toEqual(["claim"]);
    expect(Object.keys(preparationBody)).toEqual(["claim"]);

    const continuation = await screen.findByRole("link", { name: "Log in and continue" });
    expect(continuation.getAttribute("href")).toBe(LOGIN_CONTINUATION_HREF);
    expect(screen.getByLabelText("Your concern")).toHaveProperty("value", "");
    expect(screen.getByText(/temporarily prepared on the server/i)).not.toBeNull();
    expect(screen.queryByText(VALID_OPERATION_ID)).toBeNull();
  });

  it.each([
    ["malformed JSON", new Response("{", { status: 202 })],
    ["ok false", response(202, { ok: false, operationId: VALID_OPERATION_ID, status: "accepted" })],
    ["missing operation ID", response(202, { ok: true, status: "accepted" })],
    ["invalid UUIDv4", response(202, { ok: true, operationId: "not-a-uuid", status: "accepted" })],
    ["wrong status", response(202, { ok: true, operationId: VALID_OPERATION_ID, status: "wrong" })],
    ["extra field", response(202, { ok: true, operationId: VALID_OPERATION_ID, status: "accepted", extra: "field" })],
  ])("fails closed for an intake 202 response with %s", async (_caseName, intakeResponse) => {
    const user = userEvent.setup();
    const fetchMock = vi.fn().mockResolvedValueOnce(response(200)).mockResolvedValueOnce(intakeResponse);
    vi.stubGlobal("fetch", fetchMock);
    render(<GuestCreateEphemeralClient locale="en" />);

    await user.type(screen.getByLabelText("Your concern"), "Safer school routes");
    await user.click(screen.getByRole("button", { name: "Prepare request" }));

    expect(await screen.findByRole("alert")).toHaveProperty(
      "textContent",
      "The continuation could not be prepared. Your text remains in this entry. Please try again.",
    );
    expect(fetchMock).toHaveBeenCalledTimes(2);
    expect(screen.getByLabelText("Your concern")).toHaveProperty("value", "Safer school routes");
    expect(screen.queryByRole("link", { name: "Log in and continue" })).toBeNull();
  });

  it("preserves the editable in-memory claim when adoption preparation fails", async () => {
    const user = userEvent.setup();
    const fetchMock = vi
      .fn()
      .mockResolvedValueOnce(response(200))
      .mockResolvedValueOnce(response(202, {
        ok: true,
        operationId: VALID_OPERATION_ID,
        status: "accepted",
      }))
      .mockResolvedValueOnce(response(503, {
        ok: false,
        errorCode: "CREATE_PREPARATION_UNAVAILABLE",
        internal: "must-not-leak",
      }));
    vi.stubGlobal("fetch", fetchMock);
    render(<GuestCreateEphemeralClient locale="en" />);

    await user.type(screen.getByLabelText("Your concern"), "person@example.org");
    await user.click(screen.getByRole("button", { name: "Prepare request" }));

    const alert = await screen.findByRole("alert");
    expect(alert.textContent).toBe(
      "The continuation could not be prepared. Your text remains in this entry. Please try again.",
    );
    expect(alert.textContent).not.toContain("CREATE_PREPARATION_UNAVAILABLE");
    expect(alert.textContent).not.toContain("must-not-leak");
    expect(screen.getByLabelText("Your concern")).toHaveProperty("value", "person@example.org");
    expect(screen.queryByRole("link", { name: "Log in and continue" })).toBeNull();
  });

  it("uses fixed failure copy without echoing server details and keeps the claim editable", async () => {
    const user = userEvent.setup();
    vi.stubGlobal("fetch", vi.fn().mockResolvedValueOnce(response(200)).mockResolvedValueOnce(response(403)));
    render(<GuestCreateEphemeralClient locale="en" />);

    await user.type(screen.getByLabelText("Your concern"), "person@example.org");
    await user.click(screen.getByRole("button", { name: "Prepare request" }));

    expect((await screen.findByRole("alert")).textContent).toBe(
      "The continuation could not be prepared. Your text remains in this entry. Please try again.",
    );
    expect(screen.getByLabelText("Your concern")).toHaveProperty("value", "person@example.org");
  });

  it("enforces the empty, canonical length, and duplicate-submit boundaries", async () => {
    const user = userEvent.setup();
    const pendingSession = new Promise<Response>(() => {});
    const fetchMock = vi.fn().mockReturnValue(pendingSession);
    vi.stubGlobal("fetch", fetchMock);
    render(<GuestCreateEphemeralClient locale="en" />);

    const submit = screen.getByRole("button", { name: "Prepare request" });
    expect(submit).toHaveProperty("disabled", true);
    fireEvent.change(screen.getByLabelText("Your concern"), { target: { value: "x".repeat(CREATE_MAX_TEXT_LENGTH + 1) } });
    expect(screen.getByLabelText("Your concern")).toHaveProperty("value", "x".repeat(CREATE_MAX_TEXT_LENGTH));
    await user.click(submit);
    expect(screen.getByRole("button", { name: "Checking …" })).toHaveProperty("disabled", true);
    await user.click(screen.getByRole("button", { name: "Checking …" }));
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

  it("does not expose or retain server identifiers or introduce a browser recovery carrier", () => {
    for (const source of [componentSource, resumeComponentSource]) {
      expect(source).not.toMatch(/localStorage|sessionStorage|indexedDB|CacheStorage|document\.cookie|serviceWorker/i);
    }
    expect(componentSource).not.toMatch(/createHandoff|useCreateHandoffDraft|workstate|account draft|planner|intelligent-followup|link-analysis|source-analysis/i);
    expect(componentSource).not.toMatch(/window\.location|URLSearchParams|history\.|console\.|telemetry/i);
    expect(componentSource).not.toMatch(/useState[^\n]*operationId|set[A-Za-z]+\([^)]*operationId/);
    expect(componentSource).not.toMatch(/href[^\n]*operationId|operationId[^\n]*href/);
    expect(componentSource).toContain("guest-adoption-resume");
    expect(componentSource).toContain("JSON.stringify({ claim })");
    expect(componentSource).toContain("setGuestText(\"\")");
    expect(resumeComponentSource).not.toMatch(/preparationId|adoptionId|recoveryToken|claim/);
  });

  it("branches guests before account and resume work while preserving the ordinary authenticated CreateClient branch", () => {
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

  it("routes only the exact authenticated transition marker into the dedicated resume client", () => {
    expect(pageRuntimeSource).toContain('if (nextAction === "guest-adoption-resume")');
    expect(pageRuntimeSource).toContain("return <AuthenticatedGuestAdoptionResumeClient locale={pageLocale} />");
    expect(pageRuntimeSource.indexOf('if (nextAction === "guest-adoption-resume")')).toBeLessThan(
      pageRuntimeSource.indexOf("resolveCreateDraftResumeText({"),
    );
    expect(pageRuntimeSource).toContain("initialNextActionParam={nextAction}");
  });
});

describe("authenticated guest adoption resume UI contract", () => {
  it("automatically posts exactly an empty object and navigates once to the authoritative canonical draft", async () => {
    const fetchMock = vi.fn().mockResolvedValueOnce(response(200, {
      ok: true,
      state: "resumed",
      draftId: VALID_DRAFT_ID,
    }));
    vi.stubGlobal("fetch", fetchMock);

    render(<AuthenticatedGuestAdoptionResumeClient locale="en" />);

    await waitFor(() => expect(navigation.replace).toHaveBeenCalledTimes(1));
    expect(fetchMock).toHaveBeenCalledTimes(1);
    expect(fetchMock).toHaveBeenCalledWith("/api/create/adoption-resume", {
      method: "POST",
      headers: createMutationRequestHeaders(),
      body: JSON.stringify({}),
    });
    expect(navigation.replace).toHaveBeenCalledWith(`/create?draftId=${encodeURIComponent(VALID_DRAFT_ID)}`);
    expect(screen.queryByText(VALID_DRAFT_ID)).toBeNull();
  });

  it.each([
    ["extra field", { ok: true, state: "resumed", draftId: VALID_DRAFT_ID, extra: true }],
    ["invalid draft id", { ok: true, state: "resumed", draftId: "not-a-draft" }],
    ["wrong state", { ok: true, state: "claimed", draftId: VALID_DRAFT_ID }],
    ["missing draft id", { ok: true, state: "resumed" }],
  ])("fails closed for a nominal success with %s", async (_label, body) => {
    vi.stubGlobal("fetch", vi.fn().mockResolvedValueOnce(response(200, body)));

    render(<AuthenticatedGuestAdoptionResumeClient locale="en" />);

    expect((await screen.findByRole("alert")).textContent).toBe(
      "The continuation is unavailable or has expired. You can retry or start fresh.",
    );
    expect(navigation.replace).not.toHaveBeenCalled();
    expect(screen.getByRole("link", { name: "Start fresh" }).getAttribute("href")).toBe("/create");
  });

  it("does not loop after automatic failure and retries only after explicit user action", async () => {
    const fetchMock = vi
      .fn()
      .mockResolvedValueOnce(response(503, { ok: false, errorCode: "CREATE_ADOPTION_RESUME_UNAVAILABLE" }))
      .mockResolvedValueOnce(response(200, {
        ok: true,
        state: "completed",
        draftId: VALID_DRAFT_ID,
      }));
    vi.stubGlobal("fetch", fetchMock);
    const user = userEvent.setup();

    render(<AuthenticatedGuestAdoptionResumeClient locale="en" />);

    await screen.findByRole("alert");
    expect(fetchMock).toHaveBeenCalledTimes(1);
    expect(navigation.replace).not.toHaveBeenCalled();

    await user.click(screen.getByRole("button", { name: "Try again" }));
    await waitFor(() => expect(fetchMock).toHaveBeenCalledTimes(2));
    await waitFor(() => expect(navigation.replace).toHaveBeenCalledTimes(1));
    expect(navigation.replace).toHaveBeenCalledWith(`/create?draftId=${encodeURIComponent(VALID_DRAFT_ID)}`);
  });

  it("keeps DE and EN unavailable copy generic and accessible", async () => {
    vi.stubGlobal("fetch", vi.fn().mockResolvedValue(response(403, { secret: "must-not-leak" })));
    render(<AuthenticatedGuestAdoptionResumeClient locale="de" />);
    const deAlert = await screen.findByRole("alert");
    expect(deAlert.textContent).toBe(
      "Die Fortsetzung ist nicht verfügbar oder abgelaufen. Du kannst es erneut versuchen oder neu starten.",
    );
    expect(deAlert.textContent).not.toContain("must-not-leak");

    cleanup();
    vi.stubGlobal("fetch", vi.fn().mockResolvedValue(response(403, { secret: "must-not-leak" })));
    render(<AuthenticatedGuestAdoptionResumeClient locale="en" />);
    const enAlert = await screen.findByRole("alert");
    expect(enAlert.textContent).toBe(
      "The continuation is unavailable or has expired. You can retry or start fresh.",
    );
    expect(enAlert.textContent).not.toContain("must-not-leak");
  });
});
