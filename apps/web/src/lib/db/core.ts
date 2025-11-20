import * as tri from "@core/db/triMongo";
export const coreConn = asFn<any>(
  (tri as any).coreConn || (tri as any).getCoreConn || (tri as any).core,
);
export const coreDb = () => (coreConn() as any).db ?? (coreConn() as any);
export const coreCol = (name: string) =>
  typeof (tri as any).coreCol === "function"
    ? (tri as any).coreCol(name)
    : coreDb().collection(name);

export default { coreConn, coreDb, coreCol };
