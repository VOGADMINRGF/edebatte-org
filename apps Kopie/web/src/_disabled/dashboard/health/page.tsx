import DashboardLayout from "@features/dashboard/components/DashboardLayout";
import SystemMatrix from "@features/dashboard/components/SystemMatrix";
export default function HealthPage() {
  return (
    <DashboardLayout>
      <SystemMatrix />
    </DashboardLayout>
  );
}
