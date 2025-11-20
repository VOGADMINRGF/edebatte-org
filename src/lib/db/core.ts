import { coreConn as triCoreConn, coreCol as triCoreCol } from "@core/db/triMongo";

export const coreConn = triCoreConn;
export const coreDb = () => coreConn();
export const coreCol = triCoreCol;

export default { coreConn, coreDb, coreCol };
