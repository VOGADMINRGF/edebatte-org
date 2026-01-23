import Link from "next/link";

type HubItem = {
  title: string;
  description: string;
  href: string;
};

const SECTIONS: Array<{ title: string; items: HubItem[] }> = [
  {
    title: "Nutzer & Rollen",
    items: [
      {
        title: "Organisationen",
        description: "Orgs, Teams und Seats verwalten",
        href: "/admin/orgs",
      },
      {
        title: "Nutzerverwaltung",
        description: "User suchen, Rollen setzen, Pakete pflegen",
        href: "/admin/users",
      },
      {
        title: "Access Center",
        description: "Seitenzugriffe und Gruppen-Regeln",
        href: "/admin/access",
      },
      {
        title: "Access Overrides",
        description: "User-spezifische Freigaben",
        href: "/admin/access/users",
      },
    ],
  },
  {
    title: "Kommunikation",
    items: [
      {
        title: "Newsletter",
        description: "Abonnenten hinzufuegen und bereinigen",
        href: "/admin/newsletter",
      },
    ],
  },
  {
    title: "Identity & Legitimation",
    items: [
      {
        title: "Identity Funnel",
        description: "Registrierung, Verifikation, 2FA",
        href: "/admin/identity",
      },
      {
        title: "Identity Telemetry",
        description: "Status, Funnel-Health, Events",
        href: "/admin/telemetry/identity",
      },
    ],
  },
  {
    title: "Pricing & Regeln",
    items: [
      {
        title: "Admin Settings",
        description: "Pricing, Limits und Konfiguration",
        href: "/admin/settings",
      },
    ],
  },
];

export default function AdminPeopleHubPage() {
  return (
    <main className="mx-auto flex max-w-6xl flex-col gap-6 px-4 py-8">
      <header>
        <p className="text-xs font-semibold uppercase tracking-[0.18em] text-slate-500">
          Admin · People
        </p>
        <h1 className="text-2xl font-bold text-slate-900">People Hub</h1>
        <p className="text-sm text-slate-600">
          Rollen, Regeln, Newsletter und Identity an einem Ort.
        </p>
      </header>

      {SECTIONS.map((section) => (
        <section
          key={section.title}
          className="rounded-3xl bg-white/90 p-4 shadow ring-1 ring-slate-100"
        >
          <div className="flex items-center justify-between">
            <h2 className="text-sm font-semibold text-slate-900">{section.title}</h2>
            <span className="text-xs text-slate-500">{section.items.length} Bereiche</span>
          </div>
          <div className="mt-3 grid gap-3 md:grid-cols-2 lg:grid-cols-3">
            {section.items.map((item) => (
              <HubCard key={item.href} {...item} />
            ))}
          </div>
        </section>
      ))}
    </main>
  );
}

function HubCard({ title, description, href }: HubItem) {
  return (
    <Link
      href={href}
      className="rounded-3xl bg-white/95 p-4 shadow ring-1 ring-slate-100 transition hover:-translate-y-0.5 hover:ring-sky-200"
    >
      <p className="text-[11px] font-semibold uppercase tracking-[0.16em] text-slate-500">
        {title}
      </p>
      <p className="mt-2 text-sm text-slate-700">{description}</p>
    </Link>
  );
}
