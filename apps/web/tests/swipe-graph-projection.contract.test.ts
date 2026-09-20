import { beforeEach, describe, expect, it, vi } from "vitest";

const neo4jMocks = vi.hoisted(() => ({
  run: vi.fn(),
  close: vi.fn(),
  session: vi.fn(),
  getNeo4jDriver: vi.fn(),
}));

vi.mock("@/utils/neo4jClient", () => ({
  getNeo4jDriver: neo4jMocks.getNeo4jDriver,
}));

import {
  getSwipeGraphProjectionDecision,
  recordSwipeVoteInGraph,
} from "@/features/graph/swipes";

const vote = {
  userId: "user-1",
  statementId: "statement-1",
  decision: "agree" as const,
  source: "swipes" as const,
};

function setProjectionEnv(values: Record<string, string | undefined>) {
  for (const key of [
    "GRAPH_PRIMARY",
    "NEO4J_URI",
    "NEO4J_USER",
    "NEO4J_PASSWORD",
    "VERCEL",
    "VERCEL_ENV",
  ]) {
    delete process.env[key];
  }
  for (const [key, value] of Object.entries(values)) {
    if (value !== undefined) process.env[key] = value;
  }
}

describe("swipe graph projection production guard", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    neo4jMocks.close.mockResolvedValue(undefined);
    neo4jMocks.session.mockReturnValue({
      run: neo4jMocks.run,
      close: neo4jMocks.close,
    });
    neo4jMocks.getNeo4jDriver.mockReturnValue({ session: neo4jMocks.session });
  });

  it("does not touch Neo4j when another graph provider is primary", async () => {
    setProjectionEnv({
      GRAPH_PRIMARY: "arango",
      NEO4J_URI: "neo4j+s://graph.example.org",
      NEO4J_USER: "neo4j",
      NEO4J_PASSWORD: "secret",
      VERCEL: "1",
    });

    expect(getSwipeGraphProjectionDecision()).toEqual({
      enabled: false,
      reason: "graph_primary_not_neo4j",
    });

    await recordSwipeVoteInGraph(vote);
    expect(neo4jMocks.getNeo4jDriver).not.toHaveBeenCalled();
  });

  it("fails closed before loading the Neo4j client when config is incomplete", async () => {
    setProjectionEnv({
      GRAPH_PRIMARY: "neo4j",
      NEO4J_URI: "neo4j+s://graph.example.org",
      NEO4J_USER: "neo4j",
      VERCEL: "1",
    });

    expect(getSwipeGraphProjectionDecision()).toEqual({
      enabled: false,
      reason: "neo4j_config_missing",
    });

    await recordSwipeVoteInGraph(vote);
    expect(neo4jMocks.getNeo4jDriver).not.toHaveBeenCalled();
  });

  it.each([
    "bolt://localhost:7687",
    "bolt://127.0.0.1:7687",
    "bolt://0.0.0.0:7687",
    "bolt://[::1]:7687",
  ])("blocks Vercel loopback Neo4j projection for %s", async (uri) => {
    setProjectionEnv({
      GRAPH_PRIMARY: "neo4j",
      NEO4J_URI: uri,
      NEO4J_USER: "neo4j",
      NEO4J_PASSWORD: "secret",
      VERCEL_ENV: "production",
    });

    expect(getSwipeGraphProjectionDecision()).toEqual({
      enabled: false,
      reason: "vercel_loopback_blocked",
    });

    await recordSwipeVoteInGraph(vote);
    expect(neo4jMocks.getNeo4jDriver).not.toHaveBeenCalled();
  });

  it("keeps local Neo4j usable outside Vercel", () => {
    const decision = getSwipeGraphProjectionDecision({
      GRAPH_PRIMARY: "neo4j",
      NEO4J_URI: "bolt://127.0.0.1:7687",
      NEO4J_USER: "neo4j",
      NEO4J_PASSWORD: "secret",
    });

    expect(decision).toEqual({ enabled: true, reason: "neo4j_remote_configured" });
  });

  it("keeps remote Neo4j failures observable while always closing the session", async () => {
    setProjectionEnv({
      GRAPH_PRIMARY: "neo4j",
      NEO4J_URI: "neo4j+s://graph.example.org",
      NEO4J_USER: "neo4j",
      NEO4J_PASSWORD: "secret",
      VERCEL: "1",
    });
    neo4jMocks.run.mockRejectedValueOnce(new Error("remote graph unavailable"));

    await expect(recordSwipeVoteInGraph(vote)).rejects.toThrow("remote graph unavailable");
    expect(neo4jMocks.getNeo4jDriver).toHaveBeenCalledTimes(1);
    expect(neo4jMocks.run).toHaveBeenCalledTimes(1);
    expect(neo4jMocks.close).toHaveBeenCalledTimes(1);
  });
});
