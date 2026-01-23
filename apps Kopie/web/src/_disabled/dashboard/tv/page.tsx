// apps/web/src/app/dashboard/tv/page.tsx

"use client";
import { useState } from "react";
import TabNav from "@/components/TabNav";
import StreamList from "@features/stream/components/StreamList";
import StatementList from "@features/statement/components/StatementList";
import EventList from "@features/tv/components/EventList";
import ReportingWidget from "@features/politics/components/ReportingWidget"; // Optional: Für spätere Reporting/Analytics-Erweiterung
import { useRolePermission } from "@features/user/hooks/useRolePermission";
import { useAuth } from "@features/auth/hooks/useAuth";

export default function TVDashboard() {
  const hasTV = useRolePermission(["admin", "tv", "media"]);
  const { user } = useAuth();
  const [tab, setTab] = useState(0);

  if (!hasTV) return <div>Zugriff verweigert</div>;

  return (
    <main className="max-w-5xl mx-auto p-8">
      <h1 className="text-3xl font-bold mb-6">TV-/Medien-Dashboard</h1>
      <TabNav
        tabs={["Live-Streams", "Statements", "Termine", "Reporting"]}
        tab={tab}
        setTab={setTab}
        children={[
          <StreamList key="streams" tvView accentColor="#2D89EF" />, // accentColor: optional CI-Farbe für TV
          <StatementList key="statements" tvView />,
          <EventList key="events" tvView />,
          // Reporting/Analytics: Nur für Premium-User sichtbar!
          <div key="reporting" className="mt-8">
            {user?.premium ? (
              <>
                <h2 className="text-2xl font-bold mb-4">Media-Reporting</h2>
                <ReportingWidget user={user} mediaView />
              </>
            ) : (
              <div className="text-gray-400 text-sm text-center mt-10">
                <span className="inline-block bg-yellow-100 text-yellow-800 rounded px-2 py-1 mb-2">
                  Premium-Feature
                </span>
                <p>
                  Das Media-Reporting steht nur Premium-Accounts zur Verfügung.
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
          </div>,
        ]}
      />
    </main>
  );
}
