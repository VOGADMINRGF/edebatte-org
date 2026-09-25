import Link from "next/link";
import { buildMarketingCampaignControlReadModel } from "@/features/marketing/campaignControl/readModel";
import type { MarketingControlChannel } from "@/features/marketing/campaignControl/contracts";
import { getMarketingContentOperations } from "@/features/marketing/contentOperations/data";
import DistributionPreparationAction from "./DistributionPreparationAction";

export const metadata = { title: "Marketing-Inhalte prüfen · Admin · eDebatte" };

type UiLocale = "de" | "en";
type PageProps = {
  searchParams?: Promise<{
    lang?: string | string[];
    campaign?: string | string[];
  }>;
};

const COPY = {
  de: {
    eyebrow: "Admin · Marketing · Inhaltsprüfung",
    title: "Marketing-Inhalte prüfen",
    intro: "Hier stehen ausschließlich konkrete Marketingbeiträge, die noch fachlich oder visuell geprüft werden müssen. Sie sind nicht Teil der allgemeinen Editorial-Queue.",
    count: "Inhalte zur Prüfung",
    campaign: "Kampagne",
    channels: "Kanäle",
    responsible: "Prüfauftrag",
    caption: "Caption-Entwurf",
    script: "Script-Entwurf",
    cta: "Call-to-Action",
    openCampaign: "Kampagnenkontext öffnen",
    back: "Zur Marketing-Zentrale",
    empty: "Aktuell wartet kein Marketinginhalt auf Prüfung.",
    noScript: "Kein separates Script erforderlich.",
  },
  en: {
    eyebrow: "Admin · Marketing · Content review",
    title: "Review marketing content",
    intro: "This view contains only concrete marketing content that still needs professional or visual review. It is separate from the general editorial queue.",
    count: "Content items to review",
    campaign: "Campaign",
    channels: "Channels",
    responsible: "Review task",
    caption: "Caption draft",
    script: "Script draft",
    cta: "Call to action",
    openCampaign: "Open campaign context",
    back: "Back to marketing control",
    empty: "No marketing content is waiting for review right now.",
    noScript: "No separate script is required.",
  },
} as const;

export default async function MarketingReviewPage({ searchParams }: PageProps) {
  const params = await searchParams;
  const locale: UiLocale = first(params?.lang) === "en" ? "en" : "de";
  const copy = COPY[locale];
  const campaignId = first(params?.campaign);
  const control = buildMarketingCampaignControlReadModel();
  const campaigns = new Map(control.campaigns.map((row) => [row.campaign.id, row]));
  const items = getMarketingContentOperations().filter(
    (item) => item.status === "review_ready" && (!campaignId || item.campaignId === campaignId),
  );

  return (
    <main className="space-y-6 pb-12" data-testid="admin-marketing-review">
      <header className="rounded-3xl border border-[rgb(var(--border))] bg-[rgb(var(--card))] p-5 sm:p-7">
        <p className="text-xs font-semibold uppercase tracking-[0.14em] text-sky-700 dark:text-sky-300">{copy.eyebrow}</p>
        <h1 className="mt-2 text-3xl font-bold text-[rgb(var(--fg))]">{copy.title}</h1>
        <p className="mt-3 max-w-4xl text-sm leading-6 text-[rgb(var(--muted))]">{copy.intro}</p>
        <div className="mt-5 inline-flex rounded-2xl border border-sky-200 bg-sky-50 px-4 py-3 dark:border-sky-400/30 dark:bg-sky-400/10">
          <span className="text-sm font-semibold text-[rgb(var(--fg))]">{copy.count}: {items.length}</span>
        </div>
      </header>

      {items.length ? (
        <section className="grid gap-4 xl:grid-cols-2" aria-label={copy.count}>
          {items.map((item) => {
            const campaign = campaigns.get(item.campaignId);
            return (
              <article id={`content-${item.id}`} key={item.id} className="scroll-mt-6 rounded-3xl border border-[rgb(var(--border))] bg-[rgb(var(--card))] p-5">
                <div className="flex flex-wrap items-start justify-between gap-3">
                  <div>
                    <p className="text-xs font-semibold uppercase tracking-[0.1em] text-sky-700 dark:text-sky-300">{item.kind.replaceAll("_", " ")}</p>
                    <h2 className="mt-1 text-xl font-bold text-[rgb(var(--fg))]">{item.title}</h2>
                    <p className="mt-1 text-sm text-[rgb(var(--muted))]">{campaign?.campaign.title ?? item.campaignId}</p>
                  </div>
                  <span className="rounded-full border border-amber-300 bg-amber-50 px-3 py-1 text-xs font-semibold text-amber-900 dark:bg-amber-400/10 dark:text-amber-100">
                    {locale === "de" ? "Zur Freigabe" : "Ready for review"}
                  </span>
                </div>

                <dl className="mt-4 grid gap-3 rounded-2xl bg-[rgb(var(--bg))] p-4 text-sm sm:grid-cols-2">
                  <Definition label={copy.campaign} value={campaign?.campaign.title ?? item.campaignId} />
                  <Definition label={copy.channels} value={item.channels.map((channel) => channelLabel(channel as MarketingControlChannel)).join(", ")} />
                  <Definition label={copy.responsible} value={item.responsibleLabel} />
                  <Definition label={copy.cta} value={`${item.cta.label} · ${item.cta.url}`} />
                </dl>

                <div className="mt-4 space-y-3">
                  <TextPanel title={copy.caption} body={item.captionDraft} />
                  <TextPanel title={copy.script} body={item.scriptDraft ?? copy.noScript} />
                </div>

                <DistributionPreparationAction contentId={item.id} locale={locale} />

                <div className="mt-5 flex flex-wrap gap-2">
                  <Link href={`/admin/marketing?lang=${locale}&campaign=${encodeURIComponent(item.campaignId)}#campaign-detail`} className="inline-flex rounded-xl bg-sky-700 px-3 py-2 text-sm font-semibold text-white hover:bg-sky-800">
                    {copy.openCampaign} →
                  </Link>
                </div>
              </article>
            );
          })}
        </section>
      ) : (
        <div className="rounded-3xl border border-dashed border-[rgb(var(--border))] bg-[rgb(var(--card))] p-8 text-center text-sm text-[rgb(var(--muted))]">{copy.empty}</div>
      )}

      <footer className="border-t border-[rgb(var(--border))] pt-5">
        <Link href={`/admin/marketing?lang=${locale}`} className="inline-flex rounded-xl border border-[rgb(var(--border))] px-3 py-2 text-sm font-semibold text-[rgb(var(--fg))] hover:border-sky-300">{copy.back}</Link>
      </footer>
    </main>
  );
}

function first(value: string | string[] | undefined) {
  return Array.isArray(value) ? value[0] : value;
}

function channelLabel(value: MarketingControlChannel) {
  return ({
    edebatte: "eDebatte", website: "Website", download: "Download", email: "E-Mail", newsletter: "Newsletter",
    instagram: "Instagram", instagram_reels: "Instagram Reels", instagram_story: "Instagram Story", linkedin: "LinkedIn",
    facebook: "Facebook", facebook_story: "Facebook Story", tiktok: "TikTok", youtube_shorts: "YouTube Shorts",
    youtube: "YouTube", press: "Presse", meta_ads: "Meta Ads", linkedin_ads: "LinkedIn Ads", google_ads: "Google Ads",
  } as const)[value];
}

function Definition({ label, value }: { label: string; value: string }) {
  return <div><dt className="text-xs font-semibold uppercase tracking-[0.08em] text-[rgb(var(--muted))]">{label}</dt><dd className="mt-1 break-words font-medium leading-6 text-[rgb(var(--fg))]">{value}</dd></div>;
}

function TextPanel({ title, body }: { title: string; body: string }) {
  return <section className="rounded-2xl border border-[rgb(var(--border))] p-4"><h3 className="text-xs font-semibold uppercase tracking-[0.08em] text-[rgb(var(--muted))]">{title}</h3><p className="mt-2 whitespace-pre-wrap text-sm leading-6 text-[rgb(var(--fg))]">{body}</p></section>;
}
