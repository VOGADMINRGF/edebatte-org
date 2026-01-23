import { aql } from "arangojs";
import { getArango } from "@/utils/arangoClient";
import {
  GraphRepo,
  Id,
  Report,
  Region,
  Statement,
  Topic,
  User,
  Vote,
} from "./types";
const GRAPH = "vog";

async function ensureCollections() {
  const db = getArango();
  for (const name of VCOLS) {
    if (!(await db.collection(name).exists()))
      await db.collection(name).create();
  }
  for (const name of ECOLS) {
    if (!(await db.edgeCollection(name).exists()))
      await db.edgeCollection(name).create();
  }
}

async function ensureGraph() {
  const db = getArango();
  const g = db.graph(GRAPH);
  const exists = await g.exists();
  if (!exists) {
    await db.createGraph(GRAPH, [
      { collection: "has_topic", from: ["statements"], to: ["topics"] },
      { collection: "in_region", from: ["statements"], to: ["regions"] },
      { collection: "contains", from: ["reports"], to: ["statements"] },
      { collection: "cast", from: ["users"], to: ["votes"] },
      { collection: "on", from: ["votes"], to: ["statements"] },
    ]);
  }
}

async function upsertVertex(col: string, key: string, doc: any) {
  const db = getArango();
  const c = db.collection(col);
  const _key = key;
  const exists = await c.documentExists(_key);
  if (exists) await c.update(_key, doc, { keepNull: false });
  else await c.save({ _key, ...doc });
}

async function upsertEdge(
  col: string,
  _from: string,
  _to: string,
  data: any = {},
) {
  const db = getArango();
  const c = db.edgeCollection(col);
  await c.save({ _from, _to, ...data }, { overwriteMode: "ignore" });
}

export default repo;
