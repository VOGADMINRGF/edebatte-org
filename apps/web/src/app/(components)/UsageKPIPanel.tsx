"use client";

type Tone = "token" | "cost" | "warning" | "default";

export type UsageKPI = {
  label: string;
  value: string;
  hint?: string;
  trendPct?: number;
  tone?: Tone;
};

const toneStyles: Record<Tone, string> = {
  token:
    "from-sky-50/90 via-white to-cyan-50 border border-sky-100 text-sky-900 shadow-[0_15px_35px_rgba(14,165,233,0.15)]",
  cost:
    "from-rose-50/90 via-white to-orange-50 border border-rose-100 text-rose-900 shadow-[0_15px_35px_rgba(244,114,182,0.15)]",
  warning:
    "from-amber-50/90 via-white to-yellow-50 border border-amber-100 text-amber-900 shadow-[0_15px_35px_rgba(251,191,36,0.15)]",
  default:
    "from-white via-slate-50 to-slate-100 border border-slate-100 text-slate-900 shadow-[0_15px_35px_rgba(15,23,42,0.08)]",
};

function trendBadge(trendPct?: number) {
  if (typeof trendPct !== "number") return null;
  const isPositive = trendPct >= 0;
  const color = isPositive ? "text-emerald-600" : "text-rose-600";
  const icon = isPositive ? "▲" : "▼";
  return (
    <span className={`ml-auto text-[11px] font-semibold ${color}`}>
      {icon} {Math.abs(trendPct).toFixed(1)}%
    </span>
  );
}

export function UsageKPIPanel({ items }: { items: UsageKPI[] }) {
  return (
    <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
      {items.map((item) => (
        <article key={item.label}>
          <div
            className={`relative overflow-hidden rounded-3xl bg-gradient-to-br p-5 transition hover:scale-[1.01] ${toneStyles[item.tone ?? "default"]}`}
          >
            <div className="absolute -right-6 -top-6 h-20 w-20 rounded-full bg-white/40 blur-2xl" />
            <div className="absolute -left-6 -bottom-6 h-16 w-16 rounded-full bg-white/30 blur-xl" />
            <div className="relative flex flex-col gap-2">
              <div className="flex items-start gap-2 text-xs font-semibold uppercase tracking-wider text-slate-500">
                <span>{item.label}</span>
                {trendBadge(item.trendPct)}
              </div>
              <div className="text-3xl font-bold">{item.value}</div>
              {item.hint && (
                <p className="text-[11px] text-slate-600">{item.hint}</p>
              )}
            </div>
          </div>
        </article>
      ))}
    </div>
  );
}
