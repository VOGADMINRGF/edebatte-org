import { pickHumanChallenge } from "@/lib/spam/humanChallenge";
import { PROFESSIONAL_SERVICES } from "@features/pricing/professionalServices";
import KontaktPageClient from "./KontaktPageClient";

export const dynamic = "force-dynamic";

export default function KontaktPage({
  searchParams,
}: {
  searchParams?: { sent?: string; error?: string; offer?: string };
}) {
  const sent = searchParams?.sent === "1";
  const error = searchParams?.error;
  const challenge = pickHumanChallenge();
  const professionalOffer = searchParams?.offer
    ? PROFESSIONAL_SERVICES.find((service) => service.id === searchParams.offer) ?? null
    : null;

  return (
    <main className="min-h-screen bg-[rgb(var(--card))]">
      <h1 className="sr-only">Kontakt</h1>
      <KontaktPageClient
        sent={sent}
        error={error}
        challenge={challenge}
        professionalOfferLabel={professionalOffer?.name.de}
      />
    </main>
  );
}
