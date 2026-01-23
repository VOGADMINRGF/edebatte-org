import { redirect } from "next/navigation";
import Link from "next/link";
import { ReactNode } from "react";
import { getSessionUser } from "@/lib/server/auth/sessionUser";
import { sessionHasPassedTwoFactor, userRequiresTwoFactor } from "@/lib/server/auth/twoFactor";
import { userIsAdminDashboard } from "@/lib/server/auth/roles";
import AdminSidebar from "./AdminSidebar";
import AdminSearchButton from "./AdminSearchButton";

type Props = {
  children: ReactNode;
};

export const metadata = {
  title: "Admin · eDebatte",
};

export default async function AdminLayout({ children }: Props) {
  const user = await getSessionUser();
  const requiresTwoFactor = userRequiresTwoFactor(user);
  const hasTwoFactor = sessionHasPassedTwoFactor(user);
  const sessionValid = user?.sessionValid ?? false;

  logGate({
    path: "/admin",
    userId: user?._id ? String(user._id) : null,
    email: maskEmail((user as any)?.email),
    roles: (user as any)?.roles || (user as any)?.role,
    sessionValid,
    requiresTwoFactor,
    hasTwoFactor,
  });

  if (!user || !sessionValid) {
    redirect(`/login?next=${encodeURIComponent("/admin")}`);
  }

  if (requiresTwoFactor && !hasTwoFactor) {
    redirect(`/login?next=${encodeURIComponent("/admin")}`);
  }

  if (!userIsAdminDashboard(user)) {
    redirect("/");
  }

  return (
    <div className="min-h-screen bg-gradient-to-b from-slate-50 via-white to-white">
      <div className="mx-auto flex max-w-6xl gap-6 px-4 py-8">
        <aside className="hidden w-72 shrink-0 flex-col gap-3 rounded-3xl bg-white/90 p-4 shadow-[0_18px_45px_rgba(15,23,42,0.06)] ring-1 ring-slate-100 md:flex">
          <AdminSidebar userEmail={maskEmail(user.email ?? null)} />
        </aside>

        <main className="flex-1 space-y-6">
          <header className="flex flex-wrap items-center justify-between gap-3 rounded-3xl bg-white/90 px-4 py-3 shadow-[0_10px_30px_rgba(15,23,42,0.05)] ring-1 ring-slate-100">
            <div>
              <p className="text-[11px] font-semibold uppercase tracking-[0.18em] text-sky-600">Admin Dashboard</p>
              <h1 className="text-xl font-semibold text-slate-900">Kontrolle & Insights</h1>
            </div>
            <div className="flex items-center gap-2">
              <AdminSearchButton />
              <Link
                href="/"
                className="inline-flex items-center rounded-full border border-slate-200 bg-white px-3 py-1.5 text-sm font-semibold text-slate-700 hover:border-sky-300 hover:text-sky-700"
              >
                Zurück zur App
              </Link>
            </div>
          </header>

          {children}
        </main>
      </div>
    </div>
  );
}

function maskEmail(email?: string | null) {
  if (!email) return null;
  const [name, domain] = email.split("@");
  if (!domain) return email;
  const head = name.slice(0, 2);
  return `${head}${name.length > 2 ? "***" : ""}@${domain}`;
}

function logGate(payload: Record<string, unknown>) {
  try {
    console.log("[admin-layout]", payload);
  } catch {
    // ignore
  }
}
