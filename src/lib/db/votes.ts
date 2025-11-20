import { votesConn as triVotesConn, votesCol as triVotesCol } from "@core/db/triMongo";

export const votesConn = triVotesConn;
export const votesDb = () => votesConn();
export const votesCol = triVotesCol;

export default { votesConn, votesDb, votesCol };
