import * as tri from "@core/db/triMongo";

const asFn = <T>(value: unknown): (() => T) => {
  if (typeof value === "function") {
    return value as () => T;
  }
  if (value === undefined) {
    throw new Error("[db/core] Missing coreConn implementation");
  }
  return () => value as T;
};

const coreConnSource =
  (tri as Record<string, unknown>).coreConn ??
  ((tri as Record<string, unknown>).default as Record<string, unknown> | undefined)?.coreConn;

export const coreConn = asFn<any>(coreConnSource);
export const coreDb = () => (coreConn() as any).db ?? (coreConn() as any);
export const coreCol = (name: string) =>
  typeof (tri as any).coreCol === "function"
    ? (tri as any).coreCol(name)
    : coreDb().collection(name);

export default { coreConn, coreDb, coreCol };
