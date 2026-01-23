import DashboardLayout from "@features/dashboard/components/DashboardLayout";
import OrgDashboard from "@features/organization/components/OrgDashboard";
import { getActiveOrg } from "@/utils/orgHelpers"; // ggf. Dummy
export default function OrgsPage() {
  const org = getActiveOrg(); // Kannst du nach deinem Modell mocken oder aus DB holen
  return (
    <DashboardLayout>
      <OrgDashboard org={org} />
    </DashboardLayout>
  );
}
