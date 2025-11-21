import { coreCol } from "@core/db/triMongo";
import type {
  EvidenceClaimDoc,
  EvidenceItemDoc,
  EvidenceLinkDoc,
  EvidenceDecisionDoc,
} from "./types";

const CLAIMS_COLLECTION = "evidence_claims";
const ITEMS_COLLECTION = "evidence_items";
const LINKS_COLLECTION = "evidence_links";
const DECISIONS_COLLECTION = "evidence_decisions";

const ensured = {
  claims: false,
  items: false,
  links: false,
  decisions: false,
};

async function ensureClaimIndexes() {
  if (ensured.claims) return;
  const col = await coreCol<EvidenceClaimDoc>(CLAIMS_COLLECTION);
  await col.createIndex({ claimId: 1 }, { unique: true });
  await col.createIndex({ regionCode: 1, topicKey: 1 });
  ensured.claims = true;
}

async function ensureItemIndexes() {
  if (ensured.items) return;
  const col = await coreCol<EvidenceItemDoc>(ITEMS_COLLECTION);
  await col.createIndex({ url: 1 }, { unique: true });
  await col.createIndex({ publisher: 1 });
  await col.createIndex({ sourceKind: 1, publishedAt: -1 });
  ensured.items = true;
}

async function ensureLinkIndexes() {
  if (ensured.links) return;
  const col = await coreCol<EvidenceLinkDoc>(LINKS_COLLECTION);
  await col.createIndex({ fromClaimId: 1 });
  await col.createIndex({ toEvidenceId: 1 }, { sparse: true });
  await col.createIndex({ toClaimId: 1 }, { sparse: true });
  ensured.links = true;
}

async function ensureDecisionIndexes() {
  if (ensured.decisions) return;
  const col = await coreCol<EvidenceDecisionDoc>(DECISIONS_COLLECTION);
  await col.createIndex({ claimId: 1 }, { unique: true });
  await col.createIndex({ regionCode: 1 });
  ensured.decisions = true;
}

export async function evidenceClaimsCol() {
  await ensureClaimIndexes();
  return coreCol<EvidenceClaimDoc>(CLAIMS_COLLECTION);
}

export async function evidenceItemsCol() {
  await ensureItemIndexes();
  return coreCol<EvidenceItemDoc>(ITEMS_COLLECTION);
}

export async function evidenceLinksCol() {
  await ensureLinkIndexes();
  return coreCol<EvidenceLinkDoc>(LINKS_COLLECTION);
}

export async function evidenceDecisionsCol() {
  await ensureDecisionIndexes();
  return coreCol<EvidenceDecisionDoc>(DECISIONS_COLLECTION);
}
