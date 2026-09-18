import { readFileSync } from "node:fs";
import { afterEach, describe, expect, it } from "vitest";
import { GET } from "@/app/api/public/mandates/voiceopengov/route";
import {
  createInMemoryMandateRuntimeRepo,
  getMandateRuntimeRepo,
  mandateRuntimeCollectionName,
  setMandateRuntimeRepoForTests,
  toPublicVoiceOpenGovMandate,
  VOG_PROGRAMME_FEED_CONTRACT_VERSION,
  type MandateRuntimeRepo,
} from "@features/mandate/runtime";
import {
  getMandateById,
  type Mandate,
} from "@features/mandate";

function fixture(): Mandate {
  const source = getMandateById("decision-mandate-001");
  if (!source) throw new Error("missing mandate fixture");
  return structuredClone(source);
}

afterEach(() => {
  setMandateRuntimeRepoForTests(null);
});

describe("public VoiceOpenGov mandate runtime feed", () => {
  it("uses a dedicated persistent runtime collection contract", () => {
    expect(mandateRuntimeCollectionName).toBe("decision_mandates");
    expect(VOG_PROGRAMME_FEED_CONTRACT_VERSION).toBe("vog-programme-mandate-v1");
  });

  it("persists and returns only binding public runtime mandates", async () => {
    const valid = fixture();
    const draft = {
      ...fixture(),
      id: "decision-mandate-draft",
      decision: {
        ...fixture().decision,
        snapshotId: "decision-snapshot-draft",
        status: "draft" as const,
        decidedAt: null,
      },
    };
    const manual = {
      ...fixture(),
      id: "decision-mandate-manual",
      decision: {
        ...fixture().decision,
        snapshotId: "decision-snapshot-manual",
      },
      provenance: {
        ...fixture().provenance,
        origin: "manual_register_entry" as const,
      },
    };

    const repo = createInMemoryMandateRuntimeRepo();
    await repo.save(valid);
    await repo.save(draft);
    await repo.save(manual);
    setMandateRuntimeRepoForTests(repo);

    const items = await getMandateRuntimeRepo().listPublicBinding();
    expect(items.map((item) => item.id)).toEqual([valid.id]);

    const projected = toPublicVoiceOpenGovMandate(items[0]!);
    expect(projected.decision.snapshotId).toBe(valid.decision.snapshotId);
    expect(projected.decision.legitimacy.quorumMet).toBe(true);
    expect(projected.decision.legitimacy.integrityStatus).toBe("verified");
    expect(projected.visibility).toBe("public_readonly");
    expect("responsibility" in projected).toBe(false);
    expect("consentStatus" in projected).toBe(false);
  });

  it("serves the public feed from runtime data without fixture fallback", async () => {
    const repo = createInMemoryMandateRuntimeRepo();
    setMandateRuntimeRepoForTests(repo);

    const emptyResponse = await GET();
    const emptyBody = await emptyResponse.json();
    expect(emptyResponse.status).toBe(200);
    expect(emptyBody).toMatchObject({
      ok: true,
      source: "runtime",
      contractVersion: "vog-programme-mandate-v1",
      mandates: [],
    });

    await repo.save(fixture());

    const response = await GET();
    const body = await response.json();
    expect(response.status).toBe(200);
    expect(body.mandates).toHaveLength(1);
    expect(body.mandates[0].id).toBe("decision-mandate-001");
    expect(body.mandates[0].decision.snapshotId).toBe(
      "decision-snapshot-energy-2026-01",
    );
  });

  it("fails honestly when the runtime store is unavailable", async () => {
    const failingRepo: MandateRuntimeRepo = {
      async save() {
        throw new Error("db_down");
      },
      async get() {
        throw new Error("db_down");
      },
      async listPublicBinding() {
        const error = new Error("db_down") as Error & { code?: string };
        error.code = "ENOTFOUND";
        throw error;
      },
    };
    setMandateRuntimeRepoForTests(failingRepo);

    const response = await GET();
    const body = await response.json();

    expect(response.status).toBe(503);
    expect(body).toEqual({
      ok: false,
      source: "runtime",
      contractVersion: "vog-programme-mandate-v1",
      error: "mandate_runtime_unavailable",
      mandates: [],
    });
    expect(response.headers.get("cache-control")).toBe("no-store");
  });

  it("makes the public mandate detail surface runtime-first", () => {
    const page = readFileSync(
      new URL("../src/app/mandat/[id]/page.tsx", import.meta.url),
      "utf8",
    );
    expect(page).toContain("getMandateRuntimeRepo().get(id)");
    expect(page.indexOf("getMandateRuntimeRepo().get(id)")).toBeLessThan(
      page.indexOf("getMandateById(id)"),
    );
  });

  it("rejects malformed writes before they can become runtime truth", async () => {
    const repo = createInMemoryMandateRuntimeRepo();
    const invalid = {
      ...fixture(),
      decision: {
        ...fixture().decision,
        snapshotId: "",
      },
    };

    await expect(repo.save(invalid as Mandate)).rejects.toThrow();
  });
});
