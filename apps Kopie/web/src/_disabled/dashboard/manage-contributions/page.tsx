// apps/web/src/app/dashboard/manage-contributions/page.tsx
"use client";
import TabNav from "@/components/TabNav";
import StatementList from "@features/statement/components/StatementList";
import ContributionList from "@features/contribution/components/ContributionList";
import SwipeAdminList from "@features/swipe/components/SwipeAdminList";
import { useRolePermission } from "@features/user/hooks/useRolePermission";

/**
 * Dashboard für die Redaktions-/Community-Manager.
 * Userverwaltung/Settings/Reports etc. sind hier NICHT sichtbar.
 */
export default function ManageContributionsDashboard() {
  const hasManagerRole = useRolePermission([
    "admin",
    "moderator",
    "b2b",
    "ngo",
    "community",
  ]);
  if (!hasManagerRole) return <div>Zugriff verweigert</div>;

  return (
    <main className="max-w-6xl mx-auto p-8">
      <h1 className="text-3xl font-bold mb-6">Inhalts-Dashboard</h1>
      <TabNav tabs={["Statements", "Beiträge", "Swipes"]}>
        <StatementList />
        <ContributionList />
        <SwipeAdminList />
      </TabNav>
    </main>
  );
}
