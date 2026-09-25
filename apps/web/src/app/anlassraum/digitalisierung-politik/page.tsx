import type { Metadata } from "next";
import { buildPublicPageMetadata } from "@/lib/seo/publicDiscovery";
import DigitalPoliticsBallotClient from "./DigitalPoliticsBallotClient";

export const metadata: Metadata = buildPublicPageMetadata({
  path: "/anlassraum/digitalisierung-politik",
  title: "Digitalisierung politischer Beteiligung · eDebatte",
  description:
    "Offene Konsultation: Würdest du eDebatte nutzen? Stimme ohne Login ab und sag, was digitale politische Beteiligung für dich leisten müsste.",
});

export default function DigitalPoliticsBallotPage() {
  return (
    <>
      <h1 className="sr-only">Digitalisierung politischer Beteiligung</h1>
      <DigitalPoliticsBallotClient />
    </>
  );
}
