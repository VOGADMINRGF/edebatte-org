import Link from "next/link";
import {
  buildMarketingBrandControlReadModel,
  selectMarketingBrandControlRow,
} from "@/features/marketing/multibrand/brandControlReadModel";
import {
  MarketingPublicBrandSchema,
  type MarketingPublicBrand,
} from "@/features/marketing/multibrand/brandRoutingContract";

export const metadata = { title: "Marken · Marketing · Admin · eDebatte" };

const BRAND_LABELS: Record<MarketingPublicBrand, string> = {
  edebatte: "eDebatte",
  voiceopengov: "VoiceOpenGov",
  vote4gov: "Vote4Gov",
};

const BRAND_PURPOSE: Record<MarketingPublicBrand, string> = {
  edebatte: "Evidenz, Debattenstände, Dossiers und Beteiligung",
  voiceopengov: "Mission, Membership, Community, Partner und gesellschaftliche Aktivitäten",
  vote4gov: "Denkwerkstatt, Systemvergleich und Global-Governance-Lab",
};

type PageProps = {
  searchParams?: Promise<{ brand?: string | string[] }>;
};

export default async function MarketingBrandsPage({ searchParams }: PageProps) {
  const params = await searchParams;
  const rawBrand = Array.isArray(params?.brand) ? params?.brand[0] : params?.brand;
  const parsedBrand = MarketingPublicBrandSchema.safeParse(rawBrand);
  const selectedBrand: MarketingPublicBrand = parsedBrand.success ? parsedBrand.data : "edebatte";
  const model = buildMarketingBrandControlReadModel();
  const selected = selectMarketingBrandControlRow(model, selectedBrand);

  return (
    <main className="space-y-6 pb-12" data-testid="admin-marketing-brands">
      <header className="rounded-3xl border border-[rgb(var(--border))] bg-[rgb(var(--card))] p-5 sm:p-6">
        <p className="text-xs font-semibold uppercase tracking-[0.16em] text-sky-700 dark:text-sky-300">
          Admin · Marketing · Markensteuerung
        </p>
        <h1 className="mt-1 text-3xl font-bold text-[rgb(var(--fg))]">Eine Leitstelle, drei öffentliche Absender</h1>
        <p className="mt-2 max-w-4xl text-sm leading-6 text-[rgb(var(--muted))]">
          eDebatte steuert die gemeinsame Marketing-Infrastruktur. Öffentliche Kommunikation bleibt dennoch strikt nach eDebatte,
          VoiceOpenGov und Vote4Gov getrennt. Fehlendes Markenprofil blockiert statt still auf eDebatte zurückzufallen.
        </p>
      </header>

      <section className="grid gap-3 md:grid-cols-3" aria-label="Marken auswählen">
        {model.rows.map((row) => (
          <Link
            key={row.brand}
            href={`/admin/marketing/brands?brand=${row.brand}`}
            aria-current={row.brand === selectedBrand ? "page" : undefined}
            className={`rounded-2xl border p-4 transition ${
              row.brand === selectedBrand
                ? "border-sky-400 bg-sky-50 dark:bg-sky-400/10"
                : "border-[rgb(var(--border))] bg-[rgb(var(--card))] hover:border-sky-300"
            }`}
          >
            <div className="flex items-center justify-between gap-3">
              <h2 className="font-semibold text-[rgb(var(--fg))]">{BRAND_LABELS[row.brand]}</h2>
              <span className="rounded-full border border-[rgb(var(--border))] px-2 py-0.5 text-xs text-[rgb(var(--muted))]">
                {row.profile?.status ?? "Profil fehlt"}
              </span>
            </div>
            <p className="mt-2 text-sm leading-5 text-[rgb(var(--muted))]">{BRAND_PURPOSE[row.brand]}</p>
            <p className="mt-3 text-xs font-semibold text-[rgb(var(--fg))]">
              {row.campaigns.length} Kampagnen · {row.assets.length} Assets · {row.distributionRecords.length} Ausspielungen
            </p>
          </Link>
        ))}
      </section>

      {selected ? (
        <section className="space-y-5 rounded-3xl border border-[rgb(var(--border))] bg-[rgb(var(--card))] p-5 sm:p-6">
          <div className="flex flex-wrap items-start justify-between gap-4">
            <div>
              <p className="text-xs font-semibold uppercase tracking-[0.14em] text-[rgb(var(--muted))]">Aktive Markensicht</p>
              <h2 className="mt-1 text-2xl font-bold text-[rgb(var(--fg))]">{BRAND_LABELS[selected.brand]}</h2>
              <p className="mt-2 text-sm text-[rgb(var(--muted))]">{BRAND_PURPOSE[selected.brand]}</p>
            </div>
            <div className="grid grid-cols-2 gap-2 text-center text-xs sm:grid-cols-4">
              <Metric label="Kampagnen" value={selected.campaigns.length} />
              <Metric label="Assets" value={selected.assets.length} />
              <Metric label="Review-ready" value={selected.reviewReadyAssets} />
              <Metric label="Veröffentlicht" value={selected.distributionRecords.filter((item) => item.status === "published").length} />
            </div>
          </div>

          <div>
            <h3 className="text-sm font-semibold text-[rgb(var(--fg))]">Kampagnen</h3>
            {selected.campaigns.length ? (
              <div className="mt-2 divide-y divide-[rgb(var(--border))] overflow-hidden rounded-2xl border border-[rgb(var(--border))]">
                {selected.campaigns.map((campaign) => (
                  <div key={campaign.id} className="flex flex-wrap items-center justify-between gap-3 p-3">
                    <div>
                      <p className="font-semibold text-[rgb(var(--fg))]">{campaign.title}</p>
                      <p className="mt-1 text-xs text-[rgb(var(--muted))]">{campaign.primaryCta.label} · {campaign.status} · {campaign.readiness}</p>
                    </div>
                    <span className="rounded-full border border-[rgb(var(--border))] px-2 py-1 text-xs text-[rgb(var(--muted))]">
                      {campaign.brandProfileId}
                    </span>
                  </div>
                ))}
              </div>
            ) : (
              <p className="mt-2 rounded-2xl border border-dashed border-[rgb(var(--border))] p-4 text-sm text-[rgb(var(--muted))]">
                Für diese Marke ist noch keine Marketingkampagne angelegt.
              </p>
            )}
          </div>

          <div>
            <h3 className="text-sm font-semibold text-[rgb(var(--fg))]">Offene Blocker</h3>
            {selected.blockers.length ? (
              <div className="mt-2 flex flex-wrap gap-2">
                {selected.blockers.map((blocker) => (
                  <span key={blocker} className="rounded-full border border-amber-300 bg-amber-50 px-2.5 py-1 text-xs font-medium text-amber-900 dark:bg-amber-400/10 dark:text-amber-100">
                    {blocker}
                  </span>
                ))}
              </div>
            ) : (
              <p className="mt-2 text-sm text-[rgb(var(--muted))]">Keine markenspezifischen Kampagnenblocker.</p>
            )}
          </div>

          <div className="flex flex-wrap gap-2">
            <Link href="/admin/marketing" className="rounded-xl bg-sky-700 px-4 py-2 text-sm font-semibold text-white hover:bg-sky-800">
              Zum Marketing-Cockpit
            </Link>
            <Link href="/admin/marketing/review" className="rounded-xl border border-[rgb(var(--border))] px-4 py-2 text-sm font-semibold text-[rgb(var(--fg))] hover:border-sky-300">
              Inhalte & Freigaben
            </Link>
            <Link href="/admin/marketing/insights" className="rounded-xl border border-[rgb(var(--border))] px-4 py-2 text-sm font-semibold text-[rgb(var(--fg))] hover:border-sky-300">
              Ergebnisse
            </Link>
          </div>
        </section>
      ) : null}
    </main>
  );
}

function Metric({ label, value }: { label: string; value: number }) {
  return (
    <div className="rounded-xl border border-[rgb(var(--border))] bg-[rgb(var(--bg))] px-3 py-2">
      <div className="text-lg font-bold text-[rgb(var(--fg))]">{value}</div>
      <div className="text-[11px] text-[rgb(var(--muted))]">{label}</div>
    </div>
  );
}
