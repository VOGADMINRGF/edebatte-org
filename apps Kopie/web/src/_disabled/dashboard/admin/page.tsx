"use client";
import TabNav from "@/components/TabNav";
import StatementList from "@features/statement/components/StatementList";
import ContributionList from "@features/contribution/components/ContributionList";
import SwipeAdminList from "@features/swipe/components/SwipeAdminList";
import UserAdminList from "@features/user/components/UserAdminList";
import ReportList from "@features/report/components/ReportList";
import { useRolePermission } from "@features/user/hooks/useRolePermission";

// Beispiel: Optional für Debugging (kannst du später entfernen)
import { useAuth } from "@features/auth/hooks/useAuth";

export default function AdminDashboard() {
  return (
    <main>
      <StatementList />
    </main>
  );
}
