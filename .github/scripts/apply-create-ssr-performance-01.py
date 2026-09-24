from pathlib import Path


def read(path: str) -> str:
    return Path(path).read_text()


def write(path: str, text: str) -> None:
    Path(path).write_text(text)


def replace_once(text: str, old: str, new: str, label: str) -> str:
    count = text.count(old)
    if count != 1:
        raise SystemExit(f"{label}: expected 1 anchor, got {count}")
    return text.replace(old, new, 1)


# 1) Narrow Create account context type.
p = "features/account/types.ts"
s = read(p)
anchor = "export type AccountSettingsUpdate = {"
insert = '''export type CreateAccountContext = {
  userId: string;
  displayName: string | null;
  profile?: Pick<AccountProfile, "publicLocation">;
  accessTier: AccessTier;
  roles: string[];
  edebatte: Pick<AccountEdebateInfo, "package">;
  stats: Pick<AccountStats, "contributionCredits" | "nextCreditIn">;
};

'''
if "export type CreateAccountContext =" in s:
    raise SystemExit("CreateAccountContext already exists")
s = replace_once(s, anchor, insert + anchor, "account type insertion")
write(p, s)

# 2) Reuse the existing users truth + existing derivation helpers, without optional account loaders.
p = "features/account/service.ts"
s = read(p)
s = replace_once(
    s,
    "  AccountOverview,\n  AccountEdebateInfo,",
    "  AccountOverview,\n  AccountEdebateInfo,\n  CreateAccountContext,",
    "account service type import",
)
marker = "export async function getAccountOverview(userId: string): Promise<AccountOverview | null> {"
fn = '''export async function getCreateAccountContext(
  userId: string,
): Promise<CreateAccountContext | null> {
  const oid = parseObjectId(userId);
  if (!oid) return null;

  const Users = await getCol<UserDoc>("users");
  const doc = await Users.findOne(
    { _id: oid },
    {
      projection: {
        email: 1,
        name: 1,
        role: 1,
        roles: 1,
        accessTier: 1,
        tier: 1,
        b2cPlanId: 1,
        "membership.planCode": 1,
        "membership.edebatte": 1,
        "profile.displayName": 1,
        "profile.publicLocation": 1,
        "usage.swipeCountTotal": 1,
        "usage.contributionCredits": 1,
        "stats.swipeCountTotal": 1,
        "stats.contributionCredits": 1,
        "edebatte.package": 1,
      },
    },
  );

  if (!doc) return null;

  const stats = deriveStats(doc);
  const membershipEdebate = (doc.membership as any)?.edebatte ?? null;
  const publicLocation = normalizePublicLocation(doc.profile?.publicLocation ?? null) ?? undefined;

  return {
    userId: String(doc._id),
    displayName: deriveDisplayName(doc),
    profile: publicLocation ? { publicLocation } : undefined,
    accessTier: deriveTier(doc),
    roles: deriveRoles(doc),
    edebatte: {
      package: normalizeEdebatePackage(
        doc.edebatte?.package ??
          (membershipEdebate?.enabled ? membershipEdebate.planKey : null),
      ),
    },
    stats: {
      contributionCredits: stats.contributionCredits,
      nextCreditIn: stats.nextCreditIn,
    },
  };
}

'''
if "export async function getCreateAccountContext(" in s:
    raise SystemExit("getCreateAccountContext already exists")
s = replace_once(s, marker, fn + marker, "account context insertion")
write(p, s)

# 3) Keep generic entitlement callers intact; add a page-only one-read bootstrap.
p = "apps/web/src/lib/server/entitlements/createEntitlements.ts"
s = read(p)
s = replace_once(
    s,
    'import { getAccountOverview } from "@features/account/service";',
    'import { getAccountOverview, getCreateAccountContext } from "@features/account/service";\nimport type { CreateAccountContext } from "@features/account/types";',
    "create entitlement imports",
)
old_start = '''export async function getCreateEntitlementsForRequest(
  req?: NextRequest,
): Promise<CreateEntitlements> {
  const userId = await resolveUserId(req);
  const overview = userId ? await getAccountOverview(userId).catch(() => null) : null;
  const roles = normalizeRoleList(overview?.roles);'''
new_start = '''async function buildCreateEntitlements(
  userId: string | null,
  overview: CreateAccountContext | null,
): Promise<CreateEntitlements> {
  const roles = normalizeRoleList(overview?.roles);'''
s = replace_once(s, old_start, new_start, "entitlement builder extraction")
if not s.rstrip().endswith("}"):
    raise SystemExit("unexpected entitlement file ending")
wrappers = '''

export async function getCreateEntitlementsForRequest(
  req?: NextRequest,
): Promise<CreateEntitlements> {
  const userId = await resolveUserId(req);
  const overview = userId ? await getAccountOverview(userId).catch(() => null) : null;
  return buildCreateEntitlements(userId, overview);
}

export async function getCreatePageBootstrapForRequest(req?: NextRequest): Promise<{
  entitlements: CreateEntitlements;
  accountContext: CreateAccountContext | null;
}> {
  const userId = await resolveUserId(req);
  const accountContext = userId
    ? await getCreateAccountContext(userId).catch(() => null)
    : null;
  const entitlements = await buildCreateEntitlements(userId, accountContext);
  return { entitlements, accountContext };
}
'''
s = s.rstrip() + wrappers
write(p, s)

# 4) /create consumes one bootstrap read and never loads full AccountOverview.
p = "apps/web/src/app/create/page.tsx"
s = read(p)
s = replace_once(s, 'import { redirect } from "next/navigation";\n', '', "remove redirect import")
s = replace_once(
    s,
    'import { getCreateEntitlementsForRequest } from "@/lib/server/entitlements/createEntitlements";\nimport { getAccountOverview } from "@features/account/service";',
    'import { getCreatePageBootstrapForRequest } from "@/lib/server/entitlements/createEntitlements";',
    "page bootstrap import",
)
s = replace_once(
    s,
    '''  const pageLocale = resolveOperatorLocale(await detectPageLocale());
  const entitlements = await getCreateEntitlementsForRequest();
  if (!entitlements.isAuthenticated || !entitlements.userId) {
    return <GuestCreateEphemeralClient locale={pageLocale} />;
  }
''',
    '''  const pageLocale = resolveOperatorLocale(await detectPageLocale());
  const { entitlements, accountContext: overview } =
    await getCreatePageBootstrapForRequest();
  if (!entitlements.isAuthenticated || !entitlements.userId || !overview) {
    return <GuestCreateEphemeralClient locale={pageLocale} />;
  }
''',
    "page bootstrap call",
)
s = replace_once(
    s,
    '''  const overview = await getAccountOverview(entitlements.userId);
  if (!overview) {
    redirect(`/login?next=${encodeURIComponent(query ? `/create?${query}` : "/create")}`);
  }

''',
    '',
    "remove duplicate overview load",
)
write(p, s)

# 5) Client only requires the narrow context.
p = "apps/web/src/app/create/CreateClient.tsx"
s = read(p)
s = replace_once(
    s,
    'import type { AccountOverview } from "@features/account/types";',
    'import type { CreateAccountContext } from "@features/account/types";',
    "CreateClient account type import",
)
s = replace_once(s, "  overview: AccountOverview;", "  overview: CreateAccountContext;", "CreateClient prop type")
write(p, s)

# 6) Existing page tests keep fixtures while mocking the one-read bootstrap.
test_paths = [
    "apps/web/tests/create-mode.page.test.ts",
    "apps/web/tests/no-duplicate-primary-worksurface-on-create.test.ts",
    "apps/web/tests/no-internal-query-leak-in-create-ui.test.ts",
    "apps/web/tests/runden-context-human-readable-only.test.ts",
]
old_mock = '''vi.mock("@/lib/server/entitlements/createEntitlements", () => ({
  getCreateEntitlementsForRequest: (...args: unknown[]) => mocks.getCreateEntitlementsForRequest(...args),
}));'''
new_mock = '''vi.mock("@/lib/server/entitlements/createEntitlements", () => ({
  getCreatePageBootstrapForRequest: async (...args: unknown[]) => {
    const entitlements = await mocks.getCreateEntitlementsForRequest(...args);
    const accountContext =
      entitlements?.isAuthenticated && entitlements?.userId
        ? await mocks.getAccountOverview(entitlements.userId)
        : null;
    return { entitlements, accountContext };
  },
}));'''
for p in test_paths:
    s = read(p)
    s = replace_once(s, old_mock, new_mock, f"bootstrap mock in {p}")
    write(p, s)

# 7) Focused structural regression contract.
p = "apps/web/tests/create-ssr-performance.contract.test.ts"
if Path(p).exists():
    raise SystemExit("performance contract already exists")
write(
    p,
    '''import { readFileSync } from "node:fs";
import { resolve } from "node:path";
import { describe, expect, it } from "vitest";

function source(path: string) {
  return readFileSync(resolve(process.cwd(), path), "utf8");
}

function functionBody(fileSource: string, signature: string, nextSignature: string) {
  const start = fileSource.indexOf(signature);
  const end = fileSource.indexOf(nextSignature, start + signature.length);
  expect(start).toBeGreaterThanOrEqual(0);
  expect(end).toBeGreaterThan(start);
  return fileSource.slice(start, end);
}

describe("CREATE-SSR-PERFORMANCE-01", () => {
  it("boots /create through one slim account context instead of full AccountOverview", () => {
    const page = source("src/app/create/page.tsx");
    expect(page).toContain("getCreatePageBootstrapForRequest");
    expect(page).not.toContain("getAccountOverview");
  });

  it("keeps the slim account read on the users truth without optional account fan-out", () => {
    const service = source("../../features/account/service.ts");
    const body = functionBody(
      service,
      "export async function getCreateAccountContext(",
      "export async function getAccountOverview(",
    );

    expect(body).toContain('getCol<UserDoc>("users")');
    expect(body).toContain("deriveDisplayName(doc)");
    expect(body).toContain("deriveTier(doc)");
    expect(body).toContain("deriveRoles(doc)");
    expect(body).toContain("deriveStats(doc)");

    for (const forbidden of [
      "loadOptionalAccountData(",
      "getUserPaymentProfile(",
      "getUserSignature(",
      "loadAccountCreateContributionLedger",
      "loadAccountGraphMergeCandidates",
      "loadAccountSavedWorkstates",
      "loadAccountManualAnlassraumServerDrafts",
      "loadAccountEditorialReviewRequests",
      "loadAccountFactcheckJobs",
      "loadAccountUserScopedRuntimeLinkage",
    ]) {
      expect(body).not.toContain(forbidden);
    }
  });

  it("keeps generic entitlement callers on their existing full-overview path", () => {
    const entitlements = source("src/lib/server/entitlements/createEntitlements.ts");
    expect(entitlements).toContain("getCreateEntitlementsForRequest");
    expect(entitlements).toContain("await getAccountOverview(userId)");
    expect(entitlements).toContain("getCreatePageBootstrapForRequest");
    expect(entitlements).toContain("await getCreateAccountContext(userId)");
  });
});
''',
)
