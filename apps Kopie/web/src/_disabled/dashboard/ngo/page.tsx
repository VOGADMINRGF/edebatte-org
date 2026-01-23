// apps/web/src/app/dashboard/ngo/page.tsx

"use client";
import { useState } from "react";
import TabNav from "@/components/TabNav";
import ContributionList from "@features/contribution/components/ContributionList";
import ContributionForm from "@features/contribution/components/ContributionForm"; // falls benötigt!
import StatementList from "@features/statement/components/StatementList";
import StatementForm from "@features/statement/components/StatementForm";
import EngagementStats from "@features/ngo/components/EngagementStats";
import { useAuth } from "@features/auth/hooks/useAuth";
import { useRolePermission } from "@features/user/hooks/useRolePermission";
import { FiPlus } from "react-icons/fi";

export default function NGODashboard() {
  const { user } = useAuth();
  const hasNGO = useRolePermission(["admin", "ngo"]);
  const [tab, setTab] = useState(0);

  // Formular-Logik
  const [showContributionForm, setShowContributionForm] = useState(false);
  const [editContribution, setEditContribution] = useState(null);
  const [showStatementForm, setShowStatementForm] = useState(false);
  const [editStatement, setEditStatement] = useState(null);

  if (!hasNGO) return <div>Zugriff verweigert</div>;

  return (
    <main className="max-w-5xl mx-auto p-8">
      <h1 className="text-3xl font-bold mb-6">NGO-Dashboard</h1>
      <TabNav
        tabs={["Beiträge", "Statements", "Beteiligung"]}
        tab={tab}
        setTab={setTab}
        children={[
          // Tab 1: Beiträge
          <div key="beiträge">
            <div className="flex justify-end mb-4">
              <button
                onClick={() => {
                  setEditContribution(null);
                  setShowContributionForm(true);
                }}
                className="flex items-center px-4 py-2 rounded bg-violet-700 text-white font-bold shadow hover:bg-violet-800 transition"
              >
                <FiPlus className="mr-2" /> Beitrag erstellen
              </button>
            </div>
            <ContributionList
              ngoView
              user={user}
              onEdit={(c) => {
                setEditContribution(c);
                setShowContributionForm(true);
              }}
            />
            {showContributionForm && (
              <ContributionForm
                contribution={editContribution}
                onSave={() => {
                  setShowContributionForm(false);
                  setEditContribution(null);
                }}
                onCancel={() => {
                  setShowContributionForm(false);
                  setEditContribution(null);
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
                className="flex items-center px-4 py-2 rounded bg-violet-700 text-white font-bold shadow hover:bg-violet-800 transition"
              >
                <FiPlus className="mr-2" /> Statement verfassen
              </button>
            </div>
            <StatementList
              ngoView
              user={user}
              onEdit={(s) => {
                setEditStatement(s);
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

          // Tab 3: Beteiligung/Analytics (Premium-Handling)
          <div key="stats" className="mt-8">
            {user?.premium ? (
              <EngagementStats ngoView user={user} />
            ) : (
              <div className="text-gray-400 text-sm text-center mt-10">
                <span className="inline-block bg-yellow-100 text-yellow-800 rounded px-2 py-1 mb-2">
                  Premium-Feature
                </span>
                <p>
                  Auswertung und Analytics stehen nur Premium-Accounts zur
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
          </div>,
        ]}
      />
    </main>
  );
}
