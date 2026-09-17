import { describe, expect, it } from "vitest";
import { NextRequest } from "next/server";
import chatkontrolleDossier from "@features/dossier/data/chatkontrolleDossier";
import { GET as getDossier } from "@/app/api/dossier/[id]/route";
import { POST as postDossierVote } from "@/app/api/dossier/[id]/vote/route";
import {
  getPublicDossierVoteConfig,
  getPublicDossierVoteOptions,
} from "@/components/dossier/publicVotingContract";

describe("public dossier decision cockpit contract", () => {
  it("derives explicit multi-option decisions instead of a binary political shortcut", () => {
    const config = getPublicDossierVoteConfig(chatkontrolleDossier);
    const options = getPublicDossierVoteOptions(chatkontrolleDossier);

    expect(config.enabled).toBe(true);
    expect(config.policy).toBe("standard");
    expect(config.minOptions).toBe(4);
    expect(options).toHaveLength(4);
    expect(new Set(options.map((option) => option.id)).size).toBe(options.length);
    expect(options.map((option) => option.label).join(" ")).toContain("Gezielte Maßnahmen");
    expect(options.map((option) => option.label).join(" ")).toContain("Alternative Kinderschutzmaßnahmen");
  });

  it("exposes the voting capability through the real public dossier runtime", async () => {
    const response = await getDossier(
      new NextRequest("http://localhost/api/dossier/chatkontrolle"),
      { params: Promise.resolve({ id: "chatkontrolle" }) },
    );
    expect(response.status).toBe(200);
    const payload = await response.json();
    expect(payload.ok).toBe(true);
    expect(payload.dossier.meta.id).toBe("chatkontrolle");
    expect(payload.dossier.voteConfig).toMatchObject({
      enabled: true,
      policy: "standard",
      minOptions: 4,
    });
  });

  it("fails closed before persistence when a client submits an unknown option", async () => {
    const response = await postDossierVote(
      new NextRequest("http://localhost/api/dossier/chatkontrolle/vote", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ optionId: "invented-option" }),
      }),
      { params: Promise.resolve({ id: "chatkontrolle" }) },
    );

    expect(response.status).toBe(400);
    await expect(response.json()).resolves.toMatchObject({
      ok: false,
      error: "invalid_option",
    });
  });

  it("keeps unsupported dossiers fail-closed with retry metadata", async () => {
    const response = await postDossierVote(
      new NextRequest("http://localhost/api/dossier/unsupported-dossier/vote", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ optionId: "option-a" }),
      }),
      { params: Promise.resolve({ id: "unsupported-dossier" }) },
    );

    expect(response.status).toBe(503);
    await expect(response.json()).resolves.toMatchObject({
      ok: false,
      error: "vote_runtime_unavailable",
      dossierId: "unsupported-dossier",
      retryable: true,
    });
  });
});
