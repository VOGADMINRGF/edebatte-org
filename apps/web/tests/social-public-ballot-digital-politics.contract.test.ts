import { readFileSync } from "node:fs";
import { resolve } from "node:path";
import { describe, expect, it } from "vitest";
import {
  DIGITAL_POLITICS_BALLOT_ID,
  DIGITAL_POLITICS_QUESTIONS,
} from "../src/features/socialPublicBallot/digitalPolitics";

function readSource(path: string) {
  return readFileSync(resolve(process.cwd(), path), "utf8");
}

describe("digital politics social public ballot", () => {
  it("keeps the main eDebatte usage question first and offers eight neutral depth questions", () => {
    expect(DIGITAL_POLITICS_BALLOT_ID).toBe("social-digital-politics-01");
    expect(DIGITAL_POLITICS_QUESTIONS).toHaveLength(8);
    expect(DIGITAL_POLITICS_QUESTIONS[0]?.id).toBe("use-edebatte");
    expect(DIGITAL_POLITICS_QUESTIONS[0]?.title).toContain("Würdest du eDebatte nutzen");

    const ids = DIGITAL_POLITICS_QUESTIONS.map((question) => question.id);
    expect(new Set(ids).size).toBe(ids.length);

    for (const question of DIGITAL_POLITICS_QUESTIONS) {
      expect(question.options).toHaveLength(5);
    }

    const organizationQuestion = DIGITAL_POLITICS_QUESTIONS.find(
      (question) => question.id === "citizen-organizations",
    );
    expect(organizationQuestion?.note).toContain("VoiceOpenGov");
    expect(organizationQuestion?.note).toContain("keine Zustimmung");
  });

  it("keeps participation public and separates post-vote follow-up from the vote", () => {
    const client = readSource(
      "src/app/anlassraum/digitalisierung-politik/DigitalPoliticsBallotClient.tsx",
    );
    const route = readSource(
      "src/app/api/public-ballots/digital-politics/vote/route.ts",
    );

    expect(client).toContain("/api/public-ballots/digital-politics/vote");
    expect(client).toContain("/api/public/updates");
    expect(client).toContain("Double-Opt-in");
    expect(client).toContain("/register?source=digitalisierung-politik");
    expect(client).toContain("Ohne Anmeldung weiter");
    expect(client).toContain("kein repräsentatives Wahlergebnis");

    expect(route).toContain("VoteModel");
    expect(route).toContain("open_guest");
    expect(route).toContain("httpOnly: true");
    expect(route).toContain("incrementRateLimit");
  });

  it("records only explicit UTM attribution fields and never persists the raw referrer", () => {
    const route = readSource(
      "src/app/api/public-ballots/digital-politics/vote/route.ts",
    );
    const voteModel = readSource("src/models/votes/Vote.ts");

    expect(route).toContain('searchParams.get("utm_source")');
    expect(route).toContain('searchParams.get("utm_medium")');
    expect(route).toContain('searchParams.get("utm_campaign")');
    expect(route).toContain('searchParams.get("utm_content")');
    expect(route).toContain("url.origin !== req.nextUrl.origin");
    expect(route).toContain("ATTRIBUTION_VALUE_RE");
    expect(route).not.toContain("rawReferrer");
    expect(voteModel).toContain("attribution?: VoteAttribution");
  });

  it("fails closed when the dedicated VOTES store is unavailable and exposes a safe readiness probe", () => {
    const route = readSource(
      "src/app/api/public-ballots/digital-politics/vote/route.ts",
    );
    const productionSmoke = readSource(
      "../../scripts/ci/check-production-public-runtime.mjs",
    );

    expect(route).toContain("export async function GET()");
    expect(route).toContain("votes_store_unavailable");
    expect(route).toContain('status: 503');
    expect(route).toContain('reason,');
    expect(route).toContain('operation: "health" | "write"');
    expect(route).not.toContain('coreCol(');
    expect(route).not.toContain('CORE_MONGODB_URI');

    expect(productionSmoke).toContain('/anlassraum/digitalisierung-politik');
    expect(productionSmoke).toContain('/api/public-ballots/digital-politics/vote');
  });
});
