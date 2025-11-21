// Legacy helper that used to proxy @core/db/triMongo into the app layer.
import tri from "@core/db/triMongo/index";

export const getDb = tri.getDb;
export const getCol = tri.getCol;

export const coreConn = tri.coreConn;
export const votesConn = tri.votesConn;
export const piiConn = tri.piiConn;

export const coreCol = tri.coreCol;
export const votesCol = tri.votesCol;
export const piiCol = tri.piiCol;

export default tri;
