// apps/web/src/lib/contribution/regionLookup.ts
import { prisma } from "@/lib/prisma";

export async function findRegionByCodeOrName(codeOrName?: string) {
  if (!codeOrName) return null;

  // optional chaining, weil der Shim leer ist – im echten Build sind die Methoden vorhanden
  const byCode =
    (await prisma.region?.findUnique?.({ where: { code: codeOrName } })) ||
    null;
  if (byCode) return byCode;

  const byName =
    (await prisma.region?.findFirst?.({ where: { name: codeOrName } })) || null;
  return byName;
}
