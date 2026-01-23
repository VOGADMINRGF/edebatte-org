"use client";
import { useState, useEffect } from "react";
import TabNav from "@/components/TabNav";
import StreamList from "@features/stream/components/StreamList";
import StreamForm from "@features/stream/components/StreamForm";
import StatementList from "@features/statement/components/StatementList";
import StatementForm from "@features/statement/components/StatementForm";
import AnalyticsBox from "@features/politics/components/AnalyticsBox";
import ReportingWidget from "@features/politics/components/ReportingWidget";
import { useAuth } from "@features/auth/hooks/useAuth";
import { useRolePermission } from "@features/user/hooks/useRolePermission";
import { FiPlus } from "react-icons/fi";

export default function PolitikDashboard() {
  const { user } = useAuth();
  const hasAccess = useRolePermission(["admin", "politik"]);
  const [tab, setTab] = useState(0);

  // Für Forms
  const [showStreamForm, setShowStreamForm] = useState(false);
  const [editStream, setEditStream] = useState(null);
  const [showStatementForm, setShowStatementForm] = useState(false);
  const [editStatement, setEditStatement] = useState(null);

  // Analytics
  const [streams, setStreams] = useState<any[]>([]);
  useEffect(() => {
    fetch("/api/streams")
      .then((res) => res.json())
      .then((data) => setStreams(data))
      .catch(() => setStreams([]));
  }, [showStreamForm]);

  // Region/GEO aus Profil
  const myDistrict = user?.district || user?.region || null;
  const myLevel = user?.politicalLevel || "landkreis";

  if (!hasAccess)
    return (
      <div className="text-center text-gray-400 mt-16">Zugriff verweigert</div>
    );

  return (
    <main className="max-w-6xl mx-auto px-4 py-12 space-y-8">
      <h1 className="text-3xl font-bold text-blue-700 mb-2">
        Politik-Dashboard
      </h1>

      {/* Advanced AnalyticsBox immer oben */}
      <AnalyticsBox
        level={myLevel}
        district={myDistrict}
        streams={streams}
        userId={user?._id}
        focus
      />

      {/* Navigation Tabs */}
      <TabNav
        tabs={["Streams", "Statements", "Reporting"]}
        tab={tab}
        setTab={setTab}
        children={[
          // Tab 1: Streams
          <div key="streams">
            <div className="flex justify-end mb-4">
              <button
                onClick={() => {
                  setEditStream(null);
                  setShowStreamForm(true);
                }}
                className="flex items-center px-4 py-2 rounded bg-blue-700 text-white font-bold shadow hover:bg-blue-800 transition"
              >
                <FiPlus className="mr-2" /> Stream anlegen
              </button>
            </div>
            <StreamList
              politikView
              user={user}
              onEdit={(stream) => {
                setEditStream(stream);
                setShowStreamForm(true);
              }}
            />
            {showStreamForm && (
              <StreamForm
                stream={editStream}
                onSave={() => {
                  setShowStreamForm(false);
                  setEditStream(null);
                }}
                onCancel={() => {
                  setShowStreamForm(false);
                  setEditStream(null);
                }}
                user={user}
              />
            )}
          </div>,

          // Tab 2: Statements
          <div key="statements">
            <div className="flex justify-end mb-4">
              <button
                onClick={() => {
                  setEditStatement(null);
                  setShowStatementForm(true);
                }}
                className="flex items-center px-4 py-2 rounded bg-blue-700 text-white font-bold shadow hover:bg-blue-800 transition"
              >
                <FiPlus className="mr-2" /> Statement verfassen
              </button>
            </div>
            <StatementList
              politikView
              user={user}
              onEdit={(statement) => {
                setEditStatement(statement);
                setShowStatementForm(true);
              }}
            />
            {showStatementForm && (
              <StatementForm
                statement={editStatement}
                onSubmit={() => {
                  setShowStatementForm(false);
                  setEditStatement(null);
                }}
                onCancel={() => {
                  setShowStatementForm(false);
                  setEditStatement(null);
                }}
                user={user}
              />
            )}
          </div>,

          // Tab 3: Reporting (nur Premium)
          <div key="reporting" className="mt-8">
            {user?.premium ? (
              <>
                <h2 className="text-2xl font-bold mb-4">
                  Monatsreporting für deine Region/Rolle
                </h2>
                <ReportingWidget user={user} streams={streams} />
              </>
            ) : (
              <div className="text-gray-400 text-sm text-center mt-10">
                <span className="inline-block bg-yellow-100 text-yellow-800 rounded px-2 py-1 mb-2">
                  Premium-Feature
                </span>
                <p>
                  Das Monatsreporting steht nur Premium-Accounts zur Verfügung.
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
