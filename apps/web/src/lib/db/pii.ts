import * as tri from "@core/db/triMongo";
export { getPiiConn, pii } from "@vog/tri-mongo";
export const piiConn = asFn<any>(
  (tri as any).piiConn || (tri as any).getPiiConn || (tri as any).pii,
);
export const piiDb = () => (piiConn() as any).db ?? (piiConn() as any);
export const piiCol = (name: string) =>
  typeof (tri as any).piiCol === "function"
    ? (tri as any).piiCol(name)
    : piiDb().collection(name);

export default { piiConn, piiDb, piiCol };
