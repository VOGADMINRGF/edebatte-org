import { readFile } from "node:fs/promises";
import { resolve } from "node:path";

import { describe, expect, it } from "vitest";

const STUDIO_ADMIN_ROUTES = [
  "src/app/api/admin/voxy-studio/route.ts",
  "src/app/api/admin/voxy-studio/autonomy/route.ts",
  "src/app/api/admin/voxy-studio/[draftId]/route.ts",
  "src/app/api/admin/voxy-studio/[draftId]/agent-review/route.ts",
  "src/app/api/admin/voxy-studio/[draftId]/audio-inputs/route.ts",
  "src/app/api/admin/voxy-studio/[draftId]/evidence-review/route.ts",
  "src/app/api/admin/voxy-studio/[draftId]/frame-preview/route.ts",
  "src/app/api/admin/voxy-studio/[draftId]/preview-review/route.ts",
  "src/app/api/admin/voxy-studio/[draftId]/preview/route.ts",
  "src/app/api/admin/voxy-studio/[draftId]/render/route.ts",
  "src/app/api/admin/voxy-studio/[draftId]/render/bind/route.ts",
  "src/app/api/admin/voxy-studio/[draftId]/review/route.ts",
] as const;

async function source(path: string) {
  return readFile(resolve(process.cwd(), path), "utf8");
}

describe("Voxy Studio admin authorization boundary", () => {
  it("keeps the Studio page behind the shared admin role/session/2FA layout", async () => {
    const layout = await source("src/app/admin/layout.tsx");

    expect(layout).toContain('getSessionUser');
    expect(layout).toContain('userIsAdminDashboard');
    expect(layout).toContain('sessionSatisfiesProtectedTwoFactor');
    expect(layout).toMatch(/if \(!user \|\| !sessionValid\)[\s\S]*redirect\(/);
    expect(layout).toMatch(/if \(!isAdmin\)[\s\S]*redirect\("\/"\)/);
    expect(layout).toMatch(/2fa-setup/);
  });

  it.each(STUDIO_ADMIN_ROUTES)("guards %s before route-specific work", async (path) => {
    const route = await source(path);

    expect(route).toContain('from "@/lib/server/auth/admin"');
    expect(route).toContain("requireAdminOrResponse");
    const guardCall = route.indexOf("await requireAdminOrResponse(req)");
    const guardReturn = route.indexOf("if (gate instanceof Response) return gate;");
    expect(guardCall).toBeGreaterThan(-1);
    expect(guardReturn).toBeGreaterThan(guardCall);

    const firstRepositoryAccess = [
      "getVoxyStudioDraftRepository(",
      "getVoxyLocalCompositionRepository(",
      "getVoxyLocalCompositionAudioInputRepository(",
      "getReviewQueueOperationsRepository(",
      "loadVoxyStudioDossierEvidenceReviewState(",
      "req.json(",
    ]
      .map((needle) => route.indexOf(needle))
      .filter((index) => index >= 0)
      .sort((left, right) => left - right)[0];

    if (firstRepositoryAccess !== undefined) {
      expect(guardReturn).toBeLessThan(firstRepositoryAccess);
    }
  });
});
