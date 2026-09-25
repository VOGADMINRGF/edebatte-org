import type { Metadata } from "next";
import LandingStart from "./LandingStart";
import { getSessionUser } from "@/lib/server/auth/sessionUser";
import { userIsAdminDashboard } from "@/lib/server/auth/admin";
import { buildStartExperienceModel } from "@/features/start/startExperience";
import { buildHomeStructuredData, buildPublicPageMetadata } from "@/lib/seo/publicDiscovery";

/* page-contract: delegated-h1 */

const HOME_TITLE = "eDebatte – Mitmachen oder eine eigene Frage starten";
const HOME_DESCRIPTION =
  "Stimme mit ab, ergänze Perspektiven, Quellen oder offene Fragen – oder starte selbst kostenlos eine Frage für andere.";

const HOME_STRUCTURED_DATA = JSON.stringify(buildHomeStructuredData());

export const metadata: Metadata = {
  ...buildPublicPageMetadata({
    path: "/",
    title: HOME_TITLE,
    description: HOME_DESCRIPTION,
    ogType: "website",
  }),
  title: { absolute: HOME_TITLE },
};

export default async function StartPage() {
  const user = await getSessionUser();
  const isAdmin = user ? userIsAdminDashboard(user) : false;
  const experience = await buildStartExperienceModel({ user, isAdmin });

  return (
    <>
      <script
        type="application/ld+json"
        suppressHydrationWarning
        dangerouslySetInnerHTML={{ __html: HOME_STRUCTURED_DATA }}
      />
      <main id="main-content" className="min-h-[100svh]">
        <LandingStart experience={experience} />
      </main>
    </>
  );
}
