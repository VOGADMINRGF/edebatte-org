import { demoMandate } from "@features/mandate/demoMandate";

const STATUS_STYLES: Record<string, string> = {
  done: "bg-emerald-100 text-emerald-700",
  in_progress: "bg-amber-100 text-amber-700",
  planned: "bg-slate-100 text-slate-600",
};

export default function DemoMandatPage() {
  return (
    <main className="mx-auto min-h-screen max-w-6xl px-4 py-10 space-y-6">
      <header className="rounded-3xl border border-slate-200 bg-white/90 p-6 shadow-sm space-y-3">
        <p className="text-xs font-semibold uppercase tracking-wide text-slate-500">Demo - Mandat</p>
        <h1 className="text-3xl font-semibold text-slate-900">{demoMandate.title}</h1>
        <p className="text-sm text-slate-600">{demoMandate.summary}</p>
        <div className="flex flex-wrap items-center gap-3 text-xs text-slate-500">
          <span className="rounded-full bg-slate-100 px-3 py-1 font-semibold text-slate-700">
            {demoMandate.region}
          </span>
          <span>Status: {demoMandate.status}</span>
          <span>Letztes Update: {new Date(demoMandate.lastUpdated).toLocaleDateString("de-DE")}</span>
        </div>
      </header>

      <section className="grid gap-4 lg:grid-cols-3">
        <div className="lg:col-span-2 rounded-3xl border border-slate-200 bg-white/90 p-5 shadow-sm space-y-3">
          <h2 className="text-sm font-semibold text-slate-900">Timeline & Meilensteine</h2>
          <ol className="space-y-3 text-sm">
            {demoMandate.timeline.map((item, idx) => (
              <li
                key={idx}
                className="flex flex-wrap items-start justify-between gap-3 rounded-2xl border border-slate-100 bg-slate-50/80 px-4 py-3"
              >
                <div>
                  <p className="font-semibold text-slate-800">{item.label}</p>
                  <p className="text-xs text-slate-500">{new Date(item.date).toLocaleDateString("de-DE")}</p>
                  {item.note && <p className="text-xs text-slate-500 mt-1">{item.note}</p>}
                </div>
                <span
                  className={`h-fit rounded-full px-3 py-1 text-xs font-semibold ${STATUS_STYLES[item.status]}`}
                >
                  {item.status === "done"
                    ? "erledigt"
                    : item.status === "in_progress"
                    ? "laeuft"
                    : "geplant"}
                </span>
              </li>
            ))}
          </ol>
        </div>

        <div className="rounded-3xl border border-slate-200 bg-white/90 p-5 shadow-sm space-y-3">
          <h2 className="text-sm font-semibold text-slate-900">Wirkung</h2>
          <div className="space-y-3">
            {demoMandate.impact.map((metric) => (
              <div key={metric.label} className="rounded-2xl border border-slate-100 bg-slate-50/80 px-4 py-3">
                <p className="text-xs font-semibold uppercase text-slate-500">{metric.label}</p>
                <p className="text-xl font-semibold text-slate-900">{metric.value}</p>
                <p className="text-xs text-slate-500">{metric.trend}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      <section className="grid gap-4 lg:grid-cols-2">
        <div className="rounded-3xl border border-slate-200 bg-white/90 p-5 shadow-sm space-y-3">
          <h2 className="text-sm font-semibold text-slate-900">Zustaendigkeiten</h2>
          <div className="space-y-3 text-sm">
            {demoMandate.responsibilities.map((resp) => (
              <div key={resp.area} className="rounded-2xl border border-slate-100 bg-slate-50/80 px-4 py-3 space-y-2">
                <div className="flex items-center justify-between gap-2">
                  <p className="font-semibold text-slate-800">{resp.area}</p>
                  <span className={`rounded-full px-3 py-1 text-xs font-semibold ${STATUS_STYLES[resp.status]}`}>
                    {resp.status === "done" ? "erledigt" : resp.status === "in_progress" ? "laeuft" : "geplant"}
                  </span>
                </div>
                <p className="text-xs text-slate-600">Owner: {resp.owner}</p>
                {resp.partners && resp.partners.length > 0 && (
                  <p className="text-xs text-slate-500">Partner: {resp.partners.join(", ")}</p>
                )}
                <ul className="list-disc pl-4 text-xs text-slate-600">
                  {resp.deliverables.map((item) => (
                    <li key={item}>{item}</li>
                  ))}
                </ul>
              </div>
            ))}
          </div>
        </div>

        <div className="rounded-3xl border border-slate-200 bg-white/90 p-5 shadow-sm space-y-3">
          <h2 className="text-sm font-semibold text-slate-900">Risiken & offene Punkte</h2>
          <div className="space-y-3 text-sm">
            {demoMandate.risks.map((risk) => (
              <div key={risk.title} className="rounded-2xl border border-slate-100 bg-slate-50/80 px-4 py-3 space-y-1">
                <p className="font-semibold text-slate-800">{risk.title}</p>
                <p className="text-xs text-slate-600">Owner: {risk.owner}</p>
                <p className="text-xs text-slate-500">Mitigation: {risk.mitigation}</p>
              </div>
            ))}
          </div>
        </div>
      </section>
    </main>
  );
}
