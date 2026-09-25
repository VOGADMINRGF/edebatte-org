import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

const mocks = vi.hoisted(() => ({
  readSession: vi.fn(),
  getAccountOverview: vi.fn(),
  getCreateSupportTicketForUser: vi.fn(),
  listCreateSupportNotificationsForUser: vi.fn(),
  redirect: vi.fn(),
}));

vi.mock("next/navigation", () => ({
  redirect: (...args: unknown[]) => mocks.redirect(...args),
}));

vi.mock("@/utils/session", () => ({
  readSession: (...args: unknown[]) => mocks.readSession(...args),
}));

vi.mock("@features/account/service", () => ({
  getAccountOverview: (...args: unknown[]) =>
    mocks.getAccountOverview(...args),
}));

vi.mock("@/features/support/createSupportTickets", () => ({
  getCreateSupportTicketForUser: (...args: unknown[]) =>
    mocks.getCreateSupportTicketForUser(...args),
  listCreateSupportNotificationsForUser: (...args: unknown[]) =>
    mocks.listCreateSupportNotificationsForUser(...args),
}));

vi.mock("@/features/access/productionEntryContract", () => ({
  PRODUCTION_ENTRY_COPY: { accountLead: "Account" },
}));

vi.mock("@/features/agenticRuntime/agenticCivicE2EPilotContract", () => ({
  buildAgenticCivicE2EAccountHint: () => "Agentic",
}));

vi.mock("@/features/agenticRuntime/segmentedAgentExperienceContract", () => ({
  buildPersonalAccountSegmentHint: () => "Segment",
}));

vi.mock("@/features/voxy/voxyExperienceShellContract", () => ({
  buildVoxyExperienceShellHint: () => "Voxy",
}));

vi.mock("@/app/account/AccountClient", () => ({
  AccountClient: () => null,
}));

vi.mock("@/app/account/CreateSupportTicketAccountCard", () => ({
  default: () => null,
}));

vi.mock("@/app/account/CreateSupportNotifications", () => ({
  default: () => null,
}));

import AccountPage from "@/app/account/page";

describe("account page post-login timing", () => {
  beforeEach(() => {
    vi.useFakeTimers();
    vi.clearAllMocks();
    mocks.readSession.mockResolvedValue({ uid: "user-1" });
    mocks.getAccountOverview.mockResolvedValue({
      userId: "user-1",
      uiLocale: "de",
    });
    mocks.getCreateSupportTicketForUser.mockResolvedValue(null);
    mocks.listCreateSupportNotificationsForUser.mockResolvedValue([]);
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  it("renders within two seconds when optional support notifications never settle", async () => {
    mocks.listCreateSupportNotificationsForUser.mockReturnValue(
      new Promise(() => undefined),
    );

    let settled = false;
    const pagePromise = AccountPage({}).then((page) => {
      settled = true;
      return page;
    });

    await vi.advanceTimersByTimeAsync(1_999);
    expect(settled).toBe(false);

    await vi.advanceTimersByTimeAsync(1);
    expect(settled).toBe(true);
    await expect(pagePromise).resolves.toBeTruthy();
  });
});
