"use client";
/**
 * Presse-Dashboard: Alles zu Statements, Beiträgen, Reports und exklusivem Reporting.
 * Mit Tab-Navigation, Premium-Upgrade-Handling und Medien-spezifischem Analytics.
 */

import { useState } from "react";
import TabNav from "@/components/TabNav";
import StatementList from "@features/statement/components/StatementList";
import ContributionList from "@features/contribution/components/ContributionList";
import ReportList from "@features/report/components/ReportList";
import ReportingWidget from "@features/politics/components/ReportingWidget";
import AnalyticsBox from "@features/politics/components/AnalyticsBox";
import { useRolePermission } from "@features/user/hooks/useRolePermission";
import { useAuth } from "@features/auth/hooks/useAuth";

export default function PresseDashboard() {
  const isPresse = useRolePermission(["admin", "presse"]);
  const { user } = useAuth();
  const [tab, setTab] = useState(0);

  if (!isPresse) return <div>Zugriff verweigert</div>;

  // Optional: Lade Streams oder Reports, falls Analytics/ReportingWidget sie braucht
  // const [streams, setStreams] = useState<any[]>([]);
  // useEffect(() => { fetch("/api/streams").then(res => res.json()).then(setStreams); }, []);

  return (
    <main className="max-w-5xl mx-auto p-8">
      <h1 className="text-3xl font-bold mb-6">Presse-Dashboard</h1>

      {/* Beispiel: AnalyticsBox ganz oben im Reports-Tab oder hier global für Medienrelevanz */}
      {tab === 2 && (
        <div className="mb-8">
          <AnalyticsBox presseView user={user} />
        </div>
      )}

      {/* Tab-Navigation für Statements, Beiträge, Reports/Analytics */}
      <TabNav
        tabs={["Statements", "Beiträge", "Reports & Analytics"]}
        tab={tab}
        setTab={setTab}
        children={[
          // --- Tab 1: Statements (Statements für Medien/Presse) ---
          <StatementList key="statements" presseView user={user} />,

          // --- Tab 2: Beiträge (nur veröffentlichte oder relevante Beiträge) ---
          <ContributionList key="contributions" presseView user={user} />,

          // --- Tab 3: Reports & Analytics (Medien-Insights + ReportingWidget) ---
          <div key="reports-analytics">
            {/* Report-List (z.B. aktuelle Berichte, politische Analysen, Factchecks) */}
            <ReportList presseView user={user} />

            {/* Medien-Analytics/Top-Themen-Widget */}
            <div className="mt-10 mb-8">
              <AnalyticsBox presseView user={user} />
            </div>

            {/* Premium-Medien-Reporting */}
            <div className="mt-10">
              {user?.premium ? (
                <>
                  <h2 className="text-2xl font-bold mb-4">
                    Monatsreporting für dein Medienhaus
                  </h2>
                  <ReportingWidget user={user} /* streams={streams} */ />
                </>
              ) : (
                <div className="text-gray-400 text-sm text-center">
                  <span className="inline-block bg-yellow-100 text-yellow-800 rounded px-2 py-1 mb-2">
                    Premium-Feature
                  </span>
                  <p>
                    Das Medienreporting steht nur Premium-Accounts zur
                    Verfügung.
                    <br />
                    <a
                      href="/upgrade"
                      className="text-indigo-600 hover:underline"
                    >
                      Jetzt upgraden
                    </a>
                  </p>
                </div>
              )}
            </div>
          </div>,
        ]}
      />
    </main>
  );
}
