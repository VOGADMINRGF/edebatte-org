import { describe, expect, it } from "vitest";
import chatkontrolleDossier from "@features/dossier/data/chatkontrolleDossier";
import {
  collectPublicDossierVoteOptions,
  resolvePublicDossierVotePolicy,
} from "@/features/dossier/publicVotePolicy";

describe("public dossier decision cockpit contract", () => {
  it("exposes differentiated decision options for the Chatkontrolle reference dossier", () => {
    const options = collectPublicDossierVoteOptions(chatkontrolleDossier);

    expect(options).toHaveLength(4);
    expect(new Set(options.map((option) => option.id)).size).toBe(4);
    expect(options.map((option) => option.label)).toEqual([
      "Gezielte Maßnahmen bei konkreten Anhaltspunkten",
      "Begrenzte freiwillige Erkennung unter gesetzlichen Schutzvorgaben",
      "Weitergehende gesetzliche Erkennungspflichten",
      "Alternative Kinderschutzmaßnahmen ohne Inhaltsprüfung privater Nachrichten",
    ]);
  });

  it("enables the explicit Chatkontrolle public pilot without reducing it to a binary pro/contra vote", () => {
    const policy = resolvePublicDossierVotePolicy(chatkontrolleDossier);

    expect(policy.enabled).toBe(true);
    expect(policy.pilot).toBe(true);
    expect(policy.options).toHaveLength(4);
    expect(policy.options.every((option) => !/^(ja|nein)$/i.test(option.label))).toBe(true);
  });

  it("fails closed for an unpublished dossier even when the same pilot id and options exist", () => {
    const dossier = {
      ...chatkontrolleDossier,
      meta: {
        ...chatkontrolleDossier.meta,
        status: "draft" as const,
      },
    };

    const policy = resolvePublicDossierVotePolicy(dossier);
    expect(policy.enabled).toBe(false);
    expect(policy.reason).toContain("noch nicht veröffentlicht");
  });

  it("fails closed when a published dossier has fewer than two explicit decision options", () => {
    const dossier = {
      ...chatkontrolleDossier,
      meta: {
        ...chatkontrolleDossier.meta,
        id: "other-dossier",
      },
      analyze: {
        ...chatkontrolleDossier.analyze,
        claims: chatkontrolleDossier.analyze.claims.map((claim) => ({
          ...claim,
          debateFrame: undefined,
        })),
      },
      voteConfig: {
        enabled: true,
        policy: "civic" as const,
        minOptions: 2,
        allowCommunityOptions: true,
      },
    };

    const policy = resolvePublicDossierVotePolicy(dossier);
    expect(policy.enabled).toBe(false);
    expect(policy.options).toHaveLength(0);
  });
});
