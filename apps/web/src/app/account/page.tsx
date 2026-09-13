// file: app/account/page.tsx
import { redirect } from "next/navigation";
import { AccountClient } from "./AccountClient";
import { getAccountOverview } from "@features/account/service";
import { readSession } from "@/utils/session";
import {
  getCreateSupportTicketForUser,
  listCreateSupportNotificationsForUser,
} from "@/features/support/createSupportTickets";
import CreateSupportTicketAccountCard from "./CreateSupportTicketAccountCard";
import CreateSupportNotifications from "./CreateSupportNotifications";
import { loadOptionalAccountData } from "@features/account/optionalAccountData";

export const metadata = {
  title: "Mein Konto & eDebatte · eDebatte",
};

type Props = {
  searchParams?: Record<string, string | string[] | undefined>;
};

function readParam(
  params: Record<string, string | string[] | undefined>,
  key: string,
): string | undefined {
  const value = params[key];
  if (typeof value === "string") return value;
  if (Array.isArray(value)) return value[0];
  return undefined;
}

export default async function AccountPage({ searchParams }: Props) {
  const params = await Promise.resolve(searchParams ?? {});
  const session = await readSession();
  const userId = session?.uid ?? null;

  if (!userId) {
    redirect(`/login?next=${encodeURIComponent("/account")}`);
  }

  const overview = await getAccountOverview(userId);
  if (!overview) {
    redirect(`/login?next=${encodeURIComponent("/account")}`);
  }

  const membershipNotice = readParam(params, "membership") === "thanks";
  const preorderNotice = readParam(params, "preorder") === "thanks";
  const welcomeParam = readParam(params, "welcome");
  const welcomeNotice = Boolean(welcomeParam && ["1", "true", "yes"].includes(welcomeParam));
  const supportTicketNumber = readParam(params, "ticket")?.trim() ?? null;
  const [supportTicket, supportNotifications] = await Promise.all([
    supportTicketNumber
      ? loadOptionalAccountData({
          source: "support_ticket",
          fallback: null,
          load: () => getCreateSupportTicketForUser(supportTicketNumber, userId),
        })
      : Promise.resolve(null),
    loadOptionalAccountData({
      source: "support_notifications",
      fallback: [],
      load: () => listCreateSupportNotificationsForUser(userId),
    }),
  ]);
  const supportLocale = overview.uiLocale === "en" ? "en" : "de";

  return (
    <main className="min-h-screen bg-[rgb(var(--bg))] py-4 md:py-8">
      <style>{`
        @media (max-width: 767px) {
          [data-account-mobile-hub] > div {
            gap: 1rem !important;
          }
          [data-account-mobile-hub] section[aria-label="Identitätsprüfung offen"] a[href="/account/security"] {
            display: none !important;
          }
          [data-account-mobile-hub] nav:has(a[href="/swipes"]):has(a[href="/create"]),
          [data-account-mobile-hub] button[aria-label="Inbox öffnen"] {
            display: none !important;
          }
        }
      `}</style>
      <div className="mx-auto flex w-full max-w-7xl flex-col gap-4 px-4 pb-[calc(env(safe-area-inset-bottom)+1.5rem)] md:gap-6 md:px-6 md:pb-12">
        <header className="space-y-1">
          <p className="text-[10px] font-semibold uppercase tracking-[0.18em] text-sky-500">Profil</p>
          <h1 className="text-[1.5rem] font-semibold leading-tight text-[rgb(var(--fg))] md:text-[1.9rem]">
            Mein Profil
          </h1>
          <p className="max-w-xl text-sm leading-5 text-[rgb(var(--muted))]">
            Deine Interessen, Beiträge und Nachrichten an einem Ort.
          </p>
        </header>

        <CreateSupportNotifications
          notifications={supportNotifications}
          locale={supportLocale}
        />

        {supportTicketNumber ? (
          <CreateSupportTicketAccountCard
            ticketNumber={supportTicketNumber}
            ticket={supportTicket}
            locale={supportLocale}
          />
        ) : null}

        <div data-account-mobile-hub>
          <AccountClient
            initialData={overview}
            membershipNotice={membershipNotice}
            preorderNotice={preorderNotice}
            welcomeNotice={welcomeNotice}
          />
        </div>
      </div>
    </main>
  );
}
