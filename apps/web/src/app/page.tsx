import type { Metadata } from "next";
import StartPage from "./start/page";
import { buildPublicPageMetadata } from "@/lib/seo/publicDiscovery";

/* page-contract: delegated-h1 */

const HOME_TITLE = "eDebatte – Kostenlos Abstimmungen starten und gemeinsam entscheiden";
const HOME_DESCRIPTION =
  "Starte kostenlos eine Abstimmung, sammle Positionen und mache sichtbar, was eure Gruppe gemeinsam weiterbringt.";

export const metadata: Metadata = {
  ...buildPublicPageMetadata({
    path: "/",
    title: HOME_TITLE,
    description: HOME_DESCRIPTION,
    ogType: "website",
  }),
  title: { absolute: HOME_TITLE },
};

export default function HomePage() {
  return <StartPage />;
}
