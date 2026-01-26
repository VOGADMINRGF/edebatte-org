import { pickHumanChallenge } from "@/lib/spam/humanChallenge";
import KontaktPageClient from "./KontaktPageClient";

export const dynamic = "force-dynamic";

export default function KontaktPage({
  searchParams,
}: {
  searchParams?: { sent?: string; error?: string };
}) {
  const sent = searchParams?.sent === "1";
  const error = searchParams?.error;
  const challenge = pickHumanChallenge();

  return <KontaktPageClient sent={sent} error={error} challenge={challenge} />;
}
