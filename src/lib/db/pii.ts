import { piiConn as triPiiConn, piiCol as triPiiCol } from "@core/db/triMongo";

export const piiConn = triPiiConn;
export const piiDb = () => piiConn();
export const piiCol = triPiiCol;

export default { piiConn, piiDb, piiCol };
