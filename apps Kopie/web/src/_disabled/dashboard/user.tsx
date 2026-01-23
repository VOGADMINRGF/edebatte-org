// features/dashboard/pages/user.tsx
import { useContext } from "react";
import { UserContext } from "@features/user/context/UserContext";
import DashboardLayout from "@features/dashboard/components/DashboardLayout";
import UserDashboard from "@features/user/components/UserDashboard";

export default function UserPage() {
  const user = useContext(UserContext); // oder dein useUser() Hook

  // Guard: Nur eingeloggte User oder bestimme Rollen dürfen das sehen
  if (!user) {
    return (
      <DashboardLayout>
        <div>Bitte einloggen.</div>
      </DashboardLayout>
    );
  }
  // Optional: Nach Rolle differenzieren
  if (!["user", "org", "redaktion", "admin"].includes(user.role)) {
    return (
      <DashboardLayout>
        <div>Zugriff verweigert.</div>
      </DashboardLayout>
    );
  }
  return (
    <DashboardLayout>
      <UserDashboard user={user} />
    </DashboardLayout>
  );
}
