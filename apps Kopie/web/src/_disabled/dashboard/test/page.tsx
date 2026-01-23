// apps/web/src/app/dashboard/test/page.tsx
"use client";
import AdminDashboard from "../admin/page";
import NGODashboard from "../ngo/page";
import ManageContributionsDashboard from "../manage-contributions/page";

export default function TestDashboardOverview() {
  return (
    <div className="max-w-7xl mx-auto space-y-8">
      <h1 className="text-4xl font-bold text-center my-8">
        Alle Dashboards im Schnelltest
      </h1>
      <div className="border rounded-xl p-8">
        <h2 className="text-2xl mb-4">Admin</h2>
        <AdminDashboard />
      </div>
      <div className="border rounded-xl p-8">
        <h2 className="text-2xl mb-4">NGO</h2>
        <NGODashboard />
      </div>
      <div className="border rounded-xl p-8">
        <h2 className="text-2xl mb-4">Beiträge/Redaktion</h2>
        <ManageContributionsDashboard />
      </div>
    </div>
  );
}
