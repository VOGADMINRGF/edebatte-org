import Link from "next/link";

type HubItem = {
  title: string;
  description: string;
  href: string;
};

const AI_ITEMS: HubItem[] = [
  {
    title: "AI Overview",
    description: "Kosten, Tokens, Errors, Smoke-Status",
    href: "/admin/telemetry/ai",
  },
  {
    title: "AI Usage",
    description: "Provider- und Pipeline-Usage",
    href: "/admin/telemetry/ai/usage",
  },
  {
    title: "AI Live Log",
    description: "Letzte Aufrufe und Fehler",
    href: "/admin/telemetry/ai/dashboard",
  },
  {
    title: "AI Orchestrator",
    description: "Smoke-Test je Provider",
    href: "/admin/telemetry/ai/orchestrator",
  },
  {
    title: "AI Flow Health",
    description: "Feeds → Analyze → Drafts → Factcheck",
    href: "/admin/telemetry/ai/flow",
  },
];

const IDENTITY_ITEMS: HubItem[] = [
  {
    title: "Identity Telemetry",
    description: "Legitimation, Status, Funnel",
    href: "/admin/telemetry/identity",
  },
];

export default function AdminTelemetryHubPage() {
  return (
    <main className="mx-auto flex max-w-6xl flex-col gap-6 px-4 py-8">
      <header>
        <p className="text-xs font-semibold uppercase tracking-[0.18em] text-slate-500">
          Admin · Telemetry
        </p>
        <h1 className="text-2xl font-bold text-slate-900">Telemetry Hub</h1>
        <p className="text-sm text-slate-600">
          Alle Health- und Usage-Ansichten an einem Ort.
        </p>
      </header>

      <section className="rounded-3xl bg-white/90 p-4 shadow ring-1 ring-slate-100">
        <div className="flex items-center justify-between">
          <h2 className="text-sm font-semibold text-slate-900">AI Telemetry</h2>
          <span className="text-xs text-slate-500">{AI_ITEMS.length} Bereiche</span>
        </div>
        <div className="mt-3 grid gap-3 md:grid-cols-2 lg:grid-cols-3">
          {AI_ITEMS.map((item) => (
            <HubCard key={item.href} {...item} />
          ))}
        </div>
      </section>

      <section className="rounded-3xl bg-white/90 p-4 shadow ring-1 ring-slate-100">
        <div className="flex items-center justify-between">
          <h2 className="text-sm font-semibold text-slate-900">Identity & Access</h2>
          <span className="text-xs text-slate-500">{IDENTITY_ITEMS.length} Bereiche</span>
        </div>
        <div className="mt-3 grid gap-3 md:grid-cols-2 lg:grid-cols-3">
          {IDENTITY_ITEMS.map((item) => (
            <HubCard key={item.href} {...item} />
          ))}
        </div>
      </section>
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
