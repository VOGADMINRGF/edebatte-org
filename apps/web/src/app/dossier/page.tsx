import type { Metadata } from "next";
import DossierIndex from "./ui";
import { CHATKONTROLLE_DOSSIER_ITEM } from "@/features/dossier/publicEditorialDossiers";
import { listPublishedDossiers } from "@/features/dossier/publicRuntime";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export const metadata: Metadata = {
  title: "Dossiers",
  description: "Veröffentlichte Debattenstände mit Positionen, Quellen und offenen Fragen.",
};

export default async function DossierIndexPage() {
  const runtimeResult = await listPublishedDossiers()
    .then((items) => ({ items, loadFailed: false }))
    .catch(() => ({ items: [], loadFailed: true }));
  const items = [
    CHATKONTROLLE_DOSSIER_ITEM,
    ...runtimeResult.items.filter(
      (item) => item.id !== CHATKONTROLLE_DOSSIER_ITEM.id && item.slug !== CHATKONTROLLE_DOSSIER_ITEM.slug,
    ),
  ];
  return (
    <main className="public-canvas min-h-screen">
      <h1 className="sr-only">Dossiers</h1>
      <DossierIndex items={items} loadFailed={runtimeResult.loadFailed && items.length === 0} />
    </main>
  );
}
