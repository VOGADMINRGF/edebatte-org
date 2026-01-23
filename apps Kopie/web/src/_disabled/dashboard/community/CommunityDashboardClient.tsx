"use client";
import TabNav from "@/components/TabNav";
import UserAdminList from "@features/user/components/UserAdminList";
import EngagementStats from "@features/ngo/components/EngagementStats";
import StatementList from "@features/statement/components/StatementList";

export default function CommunityDashboardClient({
  me,
  demo = false,
}: {
  me: unknown;
  demo?: boolean;
}) {
  // Optional: Client-seitiger Soft-Gate (Server redirectet ohnehin)
  const hasCommunity = true;

  if (!demo && !hasCommunity) {
    return <div className="p-6">Zugriff verweigert</div>;
  }

  if (demo) {
    return (
      <div className="space-y-6 p-6">
        <h1 className="mb-6 text-3xl font-bold">Community-Dashboard (Demo)</h1>
        <EngagementStats
          periodLabel="letzte 30 Tage"
          totals={{ members: 1240, contributions: 3560, activeThisMonth: 482 }}
          kpis={[
            { label: "Neue Mitglieder", value: 138, deltaPct: 7.4 },
            { label: "Kommentare", value: 890, deltaPct: -2.1 },
          ]}
          timeseries={[
            { t: 1, v: 10 },
            { t: 2, v: 12 },
            { t: 3, v: 9 },
            { t: 4, v: 15 },
            { t: 5, v: 14 },
            { t: 6, v: 18 },
            { t: 7, v: 17 },
          ]}
          segments={[
            { label: "NGO A", value: 420 },
            { label: "NGO B", value: 315 },
            { label: "NGO C", value: 210 },
            { label: "Presse", value: 150 },
          ]}
        />
      </div>
    );
  }

  return (
    <main className="mx-auto max-w-5xl p-8">
      <h1 className="mb-6 text-3xl font-bold">Community-Dashboard</h1>
      <TabNav tabs={["User", "Beteiligung", "Statements"]}>
        <UserAdminList />
        <EngagementStats
          periodLabel="letzte 30 Tage"
          totals={{ members: 0, contributions: 0, activeThisMonth: 0 }}
          kpis={[]}
          timeseries={[]}
          segments={[]}
        />
        <StatementList />
      </TabNav>
    </main>
  );
}
