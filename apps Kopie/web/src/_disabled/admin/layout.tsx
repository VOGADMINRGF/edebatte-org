// apps/web/src/app/admin/layout.tsx
import type { ReactNode } from "react";
import { redirect } from "next/navigation";
import { ThemeProvider } from "@/components/theme/ThemeProvider";
import SidebarNav from "@features/dashboard/components/admin/SidebarNavAdmin";
import { getServerUser } from "@/lib/auth/getServerUser";
import { ADMIN_ALLOWED_ROLES } from "./config/adminConfig";

type UserWithRole = { role?: string };

export default async function AdminLayout({
  children,
}: {
  children: ReactNode;
}) {
  const user = await getServerUser();

  // TS-sicher ermitteln: hat das Objekt ein 'role'-Feld?
  const role =
    user && typeof user === "object" && "role" in user
      ? ((user as UserWithRole).role ?? "guest")
      : "guest";

  if (!user || !ADMIN_ALLOWED_ROLES.includes(role as any)) {
    redirect(`/login?next=/admin&reason=admin-only`);
  }

  return (
    <ThemeProvider>
      <div className="min-h-screen flex bg-white text-black dark:bg-neutral-900 dark:text-neutral-100">
        <SidebarNav />
        <main className="flex-1 p-6">{children}</main>
      </div>
    </ThemeProvider>
  );
}
