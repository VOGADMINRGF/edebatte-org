// apps/web/src/lib/dbCore.ts  (Mongo)
import { PrismaClient } from "@/db/core";
const g = globalThis as any;
export const prismaCore =
  g.__prismaCore ??
  new PrismaClient({
    log: process.env.NODE_ENV === "development" ? ["warn", "error"] : ["error"],
  });
if (process.env.NODE_ENV !== "production") g.__prismaCore = prismaCore;
