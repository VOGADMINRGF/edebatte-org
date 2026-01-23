import { describe, expect, it } from "vitest";
import { DebateFrameSchema, StatementRecordSchema } from "@features/analyze/schemas";
import { ensureDebateFrame } from "@features/analyze/debateFrame";

describe("debateFrame schema", () => {
  it("accepts legacy claim without debateFrame", () => {
    const parsed = StatementRecordSchema.safeParse({ id: "c-1", text: "Test claim." });
    expect(parsed.success).toBe(true);
  });

  it("accepts a debateFrame sample", () => {
    const sample = {
      version: "v1",
      level: "eu",
      policyDomain: "trade",
      jurisdiction: {
        actors: ["EU Commission", "EU Council", "Member States"],
        region: "EU",
      },
      objective: "Fair trade with stable prices.",
      rights: ["Due process"],
      duties: ["Transparency"],
      minimumStandards: [{ label: "Due process", threshold: "clear justification + appeal" }],
      enforcement: {
        stages: [
          {
            stage: 1,
            type: "monitoring",
            description: "Reporting + indicators",
            exitCriteria: "Indicators stable 6 months",
          },
        ],
        humanitarianExceptions: true,
        legalSafeguards: ["proportionate", "reviewable", "time-bound"],
      },
      metrics: [{ name: "Price level", direction: "down", horizonMonths: 12 }],
      options: [{ id: "opt_statusquo", label: "Status quo", type: "status_quo" }],
      antiPopulism: {
        score: 0.5,
        gates: [{ id: "policy_decision", pass: true }],
        status: "needs_review",
        notes: "Sample",
      },
    };

    const parsed = DebateFrameSchema.safeParse(sample);
    expect(parsed.success).toBe(true);
  });

  it("auto-generates a debateFrame when missing", () => {
    const record = { id: "c-2", text: "Should the EU set stricter trade rules?", responsibility: "EU" };
    const frame = ensureDebateFrame(record as any);
    expect(frame.version).toBe("v1");
    expect(frame.level).toBe("eu");
  });
});
