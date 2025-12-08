import { cookies } from "next/headers";
import { redirect } from "next/navigation";
import { AccountClient } from "./AccountClient";
import { getAccountOverview } from "@features/account/service";

export const metadata = {
  title: "Mein Konto · VoiceOpenGov",
};

type Props = {
  searchParams?: Record<string, string | string[] | undefined>;
};

export default async function AccountPage({ searchParams }: Props) {
  const cookieStore = await cookies();
  const userId = cookieStore.get("u_id")?.value;
  if (!userId) {
    redirect(`/login?next=${encodeURIComponent("/account")}`);
  }

  const overview = await getAccountOverview(userId);
  if (!overview) {
    redirect(`/login?next=${encodeURIComponent("/account")}`);
  }

  const membershipNotice =
    typeof searchParams?.membership === "string" && searchParams.membership === "thanks";

  // TODO: PageView Telemetrie für Account-Seite ergänzen, sobald globales Event-Logging steht.
  return (
    <main className="min-h-screen bg-gradient-to-b from-slate-50 via-white to-white py-10">
      <div className="mx-auto flex max-w-5xl flex-col gap-6 px-4">
        <header className="space-y-2">
          <p className="text-xs uppercase tracking-wide text-slate-500">Account</p>
          <h1 className="text-3xl font-semibold text-slate-900">Dein Profil &amp; Zugang</h1>
          <p className="text-sm text-slate-600">
            Hier findest du deine wichtigsten Informationen auf einen Blick und kannst Anzeigename, Locale oder
            Newsletter-Einstellungen anpassen.
          </p>
        </header>
        <AccountClient initialData={overview} membershipNotice={membershipNotice} />
      </div>
    </main>
  );
}
