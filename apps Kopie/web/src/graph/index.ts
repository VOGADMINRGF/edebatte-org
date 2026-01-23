// apps/web/src/graph/index.ts
import { GRAPH_PRIMARY } from "./config";
import neo4jRepo from "./neo4jRepo";
import arangoRepo from "./arangoRepo";
import memgraphRepo from "./memgraphRepo";

type Repo = {
  ensureSchema?: (...args: any[]) => Promise<any>;
  ensureGraph?: (...args: any[]) => Promise<any>;
  ensure?: (...args: any[]) => Promise<any>;
  seedGraph?: (...args: any[]) => Promise<any>;
  seed?: (...args: any[]) => Promise<any>;
};

const activeGraphRepo: Repo = (() => {
  switch (GRAPH_PRIMARY) {
    case "arango":
      return arangoRepo;
    case "memgraph":
      return memgraphRepo;
    case "neo4j":
    default:
      return neo4jRepo;
  }
})();

const noop = async () => ({ ok: true, skipped: true });

export async function ensureGraph(...args: any[]) {
  const fn = activeGraphRepo.ensureGraph ?? activeGraphRepo.ensureSchema ?? activeGraphRepo.ensure ?? noop;
  return fn(...args);
}

export async function seedGraph(...args: any[]) {
  const fn = activeGraphRepo.seedGraph ?? activeGraphRepo.seed ?? noop;
  return fn(...args);
}

export * from "./types";
export * from "./config";
