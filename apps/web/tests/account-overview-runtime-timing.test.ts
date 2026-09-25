import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

const mocks = vi.hoisted(() => {
  const userId = "64b64b64b64b64b64b64b64b";

  return {
    userId,
    getCol: vi.fn(),
    getUserPaymentProfile: vi.fn(),
    getUserSignature: vi.fn(),
    loadAccountCreateContributionLedger: vi.fn(),
    loadAccountGraphMergeCandidates: vi.fn(),
    loadAccountSavedWorkstates: vi.fn(),
    loadAccountEditorialReviewRequests: vi.fn(),
    loadAccountFactcheckJobs: vi.fn(),
    loadAccountManualAnlassraumServerDrafts: vi.fn(),
    loadAccountUserScopedRuntimeLinkage: vi.fn(),
  };
});

vi.mock("@core/db/triMongo", async () => {
  const mongodb = await import("mongodb");
  return {
    ObjectId: mongodb.ObjectId,
    getCol: (...args: unknown[]) => mocks.getCol(...args),
  };
});

vi.mock("@core/db/pii/userPaymentProfiles", () => ({
  getUserPaymentProfile: (...args: unknown[]) =>
    mocks.getUserPaymentProfile(...args),
}));

vi.mock("@core/db/pii/userSignatures", () => ({
  getUserSignature: (...args: unknown[]) => mocks.getUserSignature(...args),
}));

vi.mock("@features/account/loadAccountCreateContributionLedger", () => ({
  loadAccountCreateContributionLedger: (...args: unknown[]) =>
    mocks.loadAccountCreateContributionLedger(...args),
}));

vi.mock("@features/account/loadAccountGraphMergeCandidates", () => ({
  loadAccountGraphMergeCandidates: (...args: unknown[]) =>
    mocks.loadAccountGraphMergeCandidates(...args),
}));

vi.mock("@features/account/loadAccountSavedWorkstates", () => ({
  loadAccountSavedWorkstates: (...args: unknown[]) =>
    mocks.loadAccountSavedWorkstates(...args),
}));

vi.mock("@features/account/loadAccountEditorialReviewRequests", () => ({
  loadAccountEditorialReviewRequests: (...args: unknown[]) =>
    mocks.loadAccountEditorialReviewRequests(...args),
}));

vi.mock("@features/account/loadAccountFactcheckJobs", () => ({
  loadAccountFactcheckJobs: (...args: unknown[]) =>
    mocks.loadAccountFactcheckJobs(...args),
}));

vi.mock("@features/account/loadAccountManualAnlassraumServerDrafts", () => ({
  loadAccountManualAnlassraumServerDrafts: (...args: unknown[]) =>
    mocks.loadAccountManualAnlassraumServerDrafts(...args),
}));

vi.mock("@features/account/loadAccountUserScopedRuntimeLinkage", () => ({
  loadAccountUserScopedRuntimeLinkage: (...args: unknown[]) =>
    mocks.loadAccountUserScopedRuntimeLinkage(...args),
}));

import { getAccountOverview } from "@features/account/service";

describe("account overview post-login timing", () => {
  beforeEach(async () => {
    vi.useFakeTimers();
    vi.clearAllMocks();

    const { ObjectId } = await import("mongodb");
    mocks.getCol.mockResolvedValue({
      findOne: vi.fn(async () => ({
        _id: new ObjectId(mocks.userId),
        email: "nachbar@example.org",
        role: "citizen",
        roles: ["citizen"],
        accessTier: "citizenBasic",
        settings: {
          uiLocale: "de",
          readingLocale: "de",
        },
        verification: {},
      })),
    });
    mocks.getUserPaymentProfile.mockResolvedValue(null);
    mocks.getUserSignature.mockResolvedValue(null);
    mocks.loadAccountCreateContributionLedger.mockResolvedValue([]);
    mocks.loadAccountGraphMergeCandidates.mockResolvedValue([]);
    mocks.loadAccountSavedWorkstates.mockResolvedValue([]);
    mocks.loadAccountEditorialReviewRequests.mockResolvedValue([]);
    mocks.loadAccountFactcheckJobs.mockResolvedValue([]);
    mocks.loadAccountManualAnlassraumServerDrafts.mockResolvedValue([]);
    mocks.loadAccountUserScopedRuntimeLinkage.mockResolvedValue([]);
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  it("returns the core account within two seconds when an optional loader never settles", async () => {
    mocks.loadAccountFactcheckJobs.mockReturnValue(new Promise(() => undefined));

    let settled = false;
    const overviewPromise = getAccountOverview(mocks.userId).then((overview) => {
      settled = true;
      return overview;
    });

    await vi.advanceTimersByTimeAsync(0);

    expect(mocks.loadAccountFactcheckJobs).toHaveBeenCalledTimes(1);
    expect(mocks.loadAccountSavedWorkstates).toHaveBeenCalledTimes(1);
    expect(settled).toBe(false);

    await vi.advanceTimersByTimeAsync(1_999);
    expect(settled).toBe(false);

    await vi.advanceTimersByTimeAsync(1);
    await expect(overviewPromise).resolves.toMatchObject({
      userId: mocks.userId,
      email: "nachbar@example.org",
      factcheckJobs: [],
      savedWorkstates: [],
    });
  });

  it("keeps the core account available when an optional loader rejects", async () => {
    mocks.loadAccountUserScopedRuntimeLinkage.mockRejectedValue(
      new Error("runtime linkage unavailable"),
    );

    await expect(getAccountOverview(mocks.userId)).resolves.toMatchObject({
      userId: mocks.userId,
      email: "nachbar@example.org",
      userScopedRuntimeLinkages: [],
    });
  });
});
