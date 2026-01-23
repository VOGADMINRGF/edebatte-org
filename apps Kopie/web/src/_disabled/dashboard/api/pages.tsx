// features/dashboard/pages/api.tsx
"use client";
import DashboardLayout from "../../../../../../features/dashboard/components/DashboardLayout";
import ApiDashboard from "../../../../../../features/dashboard/components/ApiDashboard";

export default function ApiDashboardPage() {
  return (
    <DashboardLayout>
      <ApiDashboard />
    </DashboardLayout>
  );
}
