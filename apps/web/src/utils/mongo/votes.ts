// Kompat-Wrapper für ältere Importe wie  "@/utils/mongo/votes"
import type { Collection } from "mongodb";
import { votesCol } from "@core/db/triMongo";

// Falls irgendwo getVotesDb().collection("…") benutzt wird:
export async function getVotesDb() {
  return {
    collection<T = any>(name: string) {
      return votesCol(name) as any;
    },
  };
}

// direkte Weitergabe – neue Aufrufe können auch votesCol(...) nutzen
export { votesCol };
