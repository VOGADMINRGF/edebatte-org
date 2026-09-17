import { redirect } from "next/navigation";

import { readSession } from "@/utils/session";
import NewsletterPreferencesClient from "./NewsletterPreferencesClient";

export const metadata = {
  title: "Briefing & Benachrichtigungen · eDebatte",
};

export default async function AccountNotificationsPage() {
  const session = await readSession();
  if (!session?.uid) {
    redirect(`/login?next=${encodeURIComponent("/account/notifications")}`);
  }

  return (
    <main className="min-h-screen bg-[rgb(var(--bg))] py-6 md:py-10">
      <div className="mx-auto w-full max-w-4xl px-4 md:px-6">
        <div className="mb-6 space-y-2">
          <p className="text-xs font-semibold uppercase tracking-[0.18em] text-sky-500">Mein Briefing</p>
          <h1 className="text-2xl font-semibold text-[rgb(var(--fg))] md:text-3xl">Newsletter & Benachrichtigungen</h1>
          <p className="max-w-3xl text-sm text-[rgb(var(--muted))]">
            Lege fest, welche eDebatte-Updates du bekommst, wie oft sie kommen und welche von dir gewählten Signale für die Personalisierung genutzt werden dürfen.
          </p>
        </div>
        <NewsletterPreferencesClient />
      </div>
    </main>
  );
}
