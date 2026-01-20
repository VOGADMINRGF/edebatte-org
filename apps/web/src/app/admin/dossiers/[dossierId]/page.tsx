import AdminDossierClient from "./AdminDossierClient";

export default async function AdminDossierPage({
  params,
}: {
  params: Promise<{ dossierId: string }>;
}) {
  const { dossierId } = await params;
  return <AdminDossierClient dossierId={dossierId} />;
}
