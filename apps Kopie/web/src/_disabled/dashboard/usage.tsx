import DashboardLayout from "../../../../../features/dashboard/components/DashboardLayout";
import UsageKPIPanel from "../components/UsageKPIPanel";
import AnalyticsPanel from "../../../../../features/dashboard/components/AnalyticsPanel";
export default function UsagePage() {
  return (
    <DashboardLayout>
      <UsageKPIPanel />
      <div className="mt-8">
        <AnalyticsPanel />
      </div>
    </DashboardLayout>
  );
}
