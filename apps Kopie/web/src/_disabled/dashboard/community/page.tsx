// apps/web/src/app/dashboard/community/page.tsx

"use client";
import TabNav from "@/components/TabNav";
import UserAdminList from "@features/user/components/UserAdminList";
import EngagementStats from "@features/ngo/components/EngagementStats";
import StatementList from "@features/statement/components/StatementList";
import { useRolePermission } from "@features/user/hooks/useRolePermission";

export default function CommunityDashboard() {
  const hasCommunity = useRolePermission(["admin", "community", "moderator"]);
  if (!hasCommunity) return <div>Zugriff verweigert</div>;

  return (
    <main className="max-w-5xl mx-auto p-8">
      <h1 className="text-3xl font-bold mb-6">Community-Dashboard</h1>
      <TabNav tabs={["User", "Beteiligung", "Statements"]}>
        <UserAdminList />
        <EngagementStats
          periodLabel="Demo"
          totals={{ members: 0, contributions: 0, activeThisMonth: 0 }}
          kpis={[]}
          timeseries={[]}
        />
        <StatementList />
      </TabNav>
    </main>
  );
}
