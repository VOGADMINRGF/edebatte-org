import type { Collection, Db, Document as MongoDocument } from "mongodb";
import type { Connection } from "mongoose";
import { getPiiConn, pii } from "@vog/tri-mongo";

export type PiiDocument<T extends object = object> = T & {
  _id: MongoDocument["_id"];
  createdAt?: Date;
  updatedAt?: Date;
};

let cachedConn: Promise<Connection> | null = null;

export function piiConn(): Promise<Connection> {
  if (!cachedConn) cachedConn = getPiiConn();
  return cachedConn;
}

export async function piiDb(): Promise<Db> {
  const conn = await piiConn();
  const dbName = conn.name || conn.db?.databaseName;
  if (!dbName) throw new Error("piiConn missing database name");
  return conn.getClient().db(dbName);
}

export function piiCol<TSchema extends PiiDocument = PiiDocument>(
  name: string,
): Promise<Collection<TSchema>> {
  return pii.getCol<TSchema>(name);
}

export default { piiConn, piiDb, piiCol };
