import { notFound } from "next/navigation";
import { publicOrigin } from "@/utils/publicOrigin";
import { QuestionSetClient } from "./QuestionSetClient";

export default async function QRScanPage({ params }: any) {
  const { qrId } = params;

  // Call to API (server or client) to resolve QR-Entry
  const base = process.env.NEXT_PUBLIC_API_URL || publicOrigin();
  const res = await fetch(`${base}/api/qr/resolve?qrId=${qrId}`, { cache: "no-store" });
  const { success, data } = await res.json();
  if (!success || !data) return notFound();

  // Route je nach Typ
  if (data.targetType === "statement") {
    return <RedirectToStatement id={data.targetIds[0]} />;
  }
  if (data.targetType === "contribution") {
    return <RedirectToContribution id={data.targetIds[0]} />;
  }
  if (data.targetType === "stream") {
    return <RedirectToStream id={data.targetIds[0]} />;
  }
  if (data.targetType === "set") {
    const code = data.targetIds?.[0];
    if (!code) return notFound();
    return <QuestionSetClient code={code} />;
  }
  if (data.targetType === "custom") {
    return <CustomFlow data={data} />;
  }

  return notFound();
}

// Dummy-Komponenten für das Beispiel
function RedirectToStatement({ id }: any) {
  // Hier Voting-Komponente rendern
  return <div>Statement Voting für ID: {id}</div>;
}
function RedirectToContribution({ id }: any) {
  // Beitrag anzeigen
  return <div>Beitrag ID: {id}</div>;
}
function RedirectToStream({ id }: any) {
  // Stream-Komponente einbinden
  return <div>Stream ID: {id}</div>;
}
function CustomFlow({ data }: any) {
  // Individueller Flow
  return <div>Individuelle Aktion: {JSON.stringify(data)}</div>;
}
