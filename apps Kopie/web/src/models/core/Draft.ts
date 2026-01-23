import type { Collection, WithId } from "mongodb";
import { coreCol, ObjectId } from "@core/db/triMongo";

export type DraftDoc = WithId<{
  status: "draft" | "analyzed" | "published";
  locale: "de" | "en";
  text: string;
  outline: Array<{ id: string; label: string; start: number; end: number; summary?: string }>;
  claims: Array<any>;
  sessionId?: string;
  createdAt?: Date;
  updatedAt?: Date;
}>;

export async function DraftCollection(): Promise<Collection<DraftDoc>> {
  return coreCol<DraftDoc>("drafts");
}

export { ObjectId };
