export type GraphPrimary = "neo4j" | "arango" | "memgraph";
export const GRAPH_PRIMARY =
  (process.env.GRAPH_PRIMARY as GraphPrimary) || "neo4j";
