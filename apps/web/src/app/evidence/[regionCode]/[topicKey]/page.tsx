import { findEvidenceClaims } from "@core/evidence/query";
import { getRegionName } from "@core/regions/regionTranslations";
import { cookies, headers } from "next/headers";

function detectLocale(): string {
  const cookieStore = cookies();
  const cookieLang = cookieStore.get("lang")?.value;
  if (cookieLang) return cookieLang;
  const acceptLanguage = headers().get("accept-language");
  if (acceptLanguage) {
    const primary = acceptLanguage.split(",")[0]?.split(";")[0]?.trim();
    if (primary) return primary.slice(0, 2);
  }
  return "de";
}

export default async function EvidenceTopicPage({
  params,
}: {
  params: { regionCode: string; topicKey: string };
}) {
  const locale = detectLocale();
  const { items } = await findEvidenceClaims({
    regionCode: params.regionCode === "global" ? undefined : params.regionCode,
    topicKey: params.topicKey,
    locale,
    limit: 50,
    offset: 0,
  });

  const regionName =
    params.regionCode === "global"
      ? "Global / offen"
      : await getRegionName(params.regionCode, locale);

  return (
    <main className="mx-auto flex max-w-5xl flex-col gap-4 px-4 py-10">
      <header className="space-y-1">
        <p className="text-xs font-semibold uppercase tracking-wide text-slate-500">Evidence · Topic</p>
        <h1 className="text-2xl font-bold text-slate-900">
          Claims zu {params.topicKey} – {regionName}
        </h1>
      </header>
      <section className="space-y-3">
        {items.length === 0 ? (
          <p className="text-sm text-slate-600">Keine Claims für diese Kombination gefunden.</p>
        ) : (
          items.map((entry) => (
            <article key={entry.claim._id.toHexString()} className="rounded-2xl border border-slate-200 bg-white p-4 shadow-sm">
              <p className="text-sm text-slate-900">{entry.claim.text}</p>
              <p className="text-xs text-slate-500">
                {entry.claim.sourceType} · Pipeline {entry.claim.meta?.pipeline ?? "n/a"}
              </p>
            </article>
          ))
        )}
      </section>
    </main>
  );
}
