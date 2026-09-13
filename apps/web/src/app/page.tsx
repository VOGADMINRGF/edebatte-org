import type { Metadata } from "next";
import StartPage from "./start/page";
import { buildPublicPageMetadata } from "@/lib/seo/publicDiscovery";

/* page-contract: delegated-h1 */

const HOME_TITLE = "eDebatte – Gesellschaftliche Willensbildung vor dem Verfahren";
const HOME_DESCRIPTION =
  "Vom Anliegen zur gemeinsamen Agenda: Problemklärung, Evidenz, Perspektiven und Handlungsoptionen verbinden – für demokratische Zusammenarbeit von lokal bis global.";

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