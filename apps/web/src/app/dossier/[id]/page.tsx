import type { Metadata } from "next";
import DossierPageClient from "./ui";
import { buildShareMetadata } from "@/features/share/metadata";
import { getPublicEditorialDossier } from "@/features/dossier/publicEditorialDossiers";

type PageProps = {
  params: Promise<{ id: string }>;
};

export async function generateMetadata({ params }: PageProps): Promise<Metadata> {
  const { id } = await params;
  const editorialDossier = getPublicEditorialDossier(id);
  return buildShareMetadata({
    objectType: "dossier",
    pathOrUrl: `/dossier/${id}`,
    title: editorialDossier?.meta.title ?? `Dossier ${id}`,
    description:
      editorialDossier?.analyze.report.summary ??
      "Dossier-Ansicht mit Kontext, Einordnung und offenen Anschlussfragen.",
    ogType: "article",
  });
}

export default async function DossierPage({
  params,
}: PageProps) {
  const { id } = await params;
  return (
    <main className="min-h-screen bg-[rgb(var(--bg))]">
      <h1 className="sr-only">Dossier</h1>
      <DossierPageClient dossierId={id} />
    </main>
  );
}
