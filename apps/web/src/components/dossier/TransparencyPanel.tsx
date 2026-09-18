import type { Dossier } from "@features/dossier";
import { UI_DE } from "./labels";
import ParliamentaryContextPanel from "./ParliamentaryContextPanel";

type TransparencyPanelProps = {
  sources: Dossier["sourceSet"];
  runReceipt?: Dossier["analyze"]["runReceipt"];
  createdAt?: string | null;
  updatedAt?: string | null;
  revision?: Dossier["meta"]["revision"];
  sectionId?: string;
};

const SOURCE_TYPE_LABELS: Record<string, string> = {
  gov: "Behörde/Verwaltung",
  research: "Forschung",
  media: "Medien",
  community: "Community",
  other: "Sonstiges",
};

function formatDate(value?: string | null) {
  if (!value) return "-";
  const d = new Date(value);
  if (Number.isNaN(d.getTime())) return value;
  return d.toLocaleDateString("de-DE", { year: "numeric", month: "short", day: "2-digit" });
}

function dataPolicyText(contentPolicy: Dossier["analyze"]["runReceipt"]["contentPolicy"] | undefined) {
  if (!contentPolicy) {
    return "Es werden keine Volltexte gespeichert. Nur Titel und Links.";
  }
  if (contentPolicy.storeFullText) {
    return "Volltexte können gespeichert werden; Auszüge sind begrenzt.";
  }
  if (!contentPolicy.storeFullText && contentPolicy.storeTitles) {
    return "Es werden keine Volltexte gespeichert. Nur Titel und Links.";
  }
  return "Daten werden in komprimierter Form dokumentiert.";
}

export function TransparencyPanel({
  sources,
  runReceipt,
  createdAt,
  updatedAt,
  revision,
  sectionId,
}: TransparencyPanelProps) {
  return (
    <section id={sectionId} className="vog-card p-5 space-y-3">
      <div className="text-xs font-semibold uppercase tracking-wide text-[rgb(var(--muted))]">
        Transparenz & Protokoll
      </div>
      <div className="space-y-1 text-sm text-[rgb(var(--fg))]">
        <div>{runReceipt?.pipelineVersion ? `Analyseverfahren: ${runReceipt.pipelineVersion}` : UI_DE.analysisMethod}</div>
        <div>Verfahrensversion: {runReceipt?.promptVersion ?? "—"}</div>
        <div>Protokoll-ID: {runReceipt?.id ?? "—"}</div>
        <div>Dokumentationsstand: {runReceipt?.snapshotId ?? "—"}</div>
        {revision ? (
          <div>
            Änderungsstand: Rev {revision.rev} · Letzte Änderung: {formatDate(revision.lastChangeAt)}
          </div>
        ) : null}
      </div>
      <div className="text-[11px] text-[rgb(var(--muted))]">
        {UI_DE.created}: {formatDate(createdAt)} · {UI_DE.updated}: {formatDate(updatedAt ?? createdAt)}
      </div>
      <div className="text-[11px] text-[rgb(var(--muted))]">{dataPolicyText(runReceipt?.contentPolicy)}</div>
      <div className="pt-2 text-xs font-semibold uppercase tracking-wide text-[rgb(var(--muted))]">Quellen</div>
      <ul className="space-y-2 text-sm text-[rgb(var(--fg))]">
        {sources.length ? (
          sources.map((src, idx) => (
            <li key={`${src.canonicalUrl}-${idx}`}>
              {src.canonicalUrl ? (
                <a
                  href={src.canonicalUrl}
                  target="_blank"
                  rel="noreferrer"
                  className="underline"
                >
                  {src.title ?? src.canonicalUrl}
                </a>
              ) : (
                <span>{src.title ?? "Quelle"}</span>
              )}
              <span className="text-[rgb(var(--muted))]"> ({src.publisher ?? "-"})</span>
              <div className="mt-1 flex flex-wrap gap-2 text-[10px] text-[rgb(var(--muted))]">
                {src.sourceType ? (
                  <span className="rounded-full border border-[rgb(var(--border))] px-2 py-0.5">
                    Typ: {SOURCE_TYPE_LABELS[src.sourceType] ?? src.sourceType}
                  </span>
                ) : null}
                {src.timeRange ? (
                  <span className="rounded-full border border-[rgb(var(--border))] px-2 py-0.5">
                    Zeitraum: {src.timeRange}
                  </span>
                ) : null}
                {src.location ? (
                  <span className="rounded-full border border-[rgb(var(--border))] px-2 py-0.5">
                    Ort: {src.location}
                  </span>
                ) : null}
                {src.audience ? (
                  <span className="rounded-full border border-[rgb(var(--border))] px-2 py-0.5">
                    Zielgruppe: {src.audience}
                  </span>
                ) : null}
                {src.conflicts ? (
                  <span className="rounded-full border border-rose-400/40 bg-rose-500/10 px-2 py-0.5 text-rose-200">
                    Konflikt
                  </span>
                ) : null}
              </div>
              {src.assumptions?.length ? (
                <div className="mt-1 text-[10px] text-[rgb(var(--muted))]">
                  Annahmen: {src.assumptions.join(", ")}
                </div>
              ) : null}
              {src.conflicts ? (
                <div className="mt-1 text-[10px] text-[rgb(var(--muted))]">
                  Interessenkonflikt: {src.conflicts}
                </div>
              ) : null}
            </li>
          ))
        ) : (
          <li className="text-[11px] text-[rgb(var(--muted))]">Keine Quellen hinterlegt.</li>
        )}
      </ul>
      <ParliamentaryContextPanel sources={sources} />
    </section>
  );
}

export default TransparencyPanel;
