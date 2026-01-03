import Link from "next/link";

type HubItem = {
  title: string;
  description: string;
  href: string;
};

const SECTIONS: Array<{ title: string; items: HubItem[] }> = [
  {
    title: "Operations",
    items: [
      {
        title: "Telemetry Hub",
        description: "AI Usage, Health, Logs",
        href: "/admin/telemetry",
      },
      {
        title: "Analytics (Legacy)",
        description: "Registrierungen, Rollen, Pakete",
        href: "/admin/analytics",
      },
    ],
  },
  {
    title: "Konfiguration",
    items: [
      {
        title: "Admin Settings",
        description: "Pricing und Systemwerte",
        href: "/admin/settings",
      },
    ],
  },
];

export default function AdminSystemHubPage() {
  return (
    <main className="mx-auto flex max-w-6xl flex-col gap-6 px-4 py-8">
      <header>
        <p className="text-xs font-semibold uppercase tracking-[0.18em] text-slate-500">
          Admin · System
        </p>
        <h1 className="text-2xl font-bold text-slate-900">System Hub</h1>
        <p className="text-sm text-slate-600">
          Betriebs- und Konfigurationsbereiche schnell erreichbar.
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
