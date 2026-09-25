import Link from "next/link";
import type { RegionPublicationVisibilityState } from "@features/region";
import VoxyFloatingDock from "@/components/voxy/VoxyFloatingDock";
import RundenPublicInputPanel from "./RundenPublicInputPanel";

const PUBLIC_CREATE_HREF =
  "/create?mode=source&intent=contribution&source=runden&reason=public_anlassraum_input";

const VISIBILITY_GUIDE: ReadonlyArray<{
  state: Extract<
    RegionPublicationVisibilityState,
    | "public_unverified"
    | "internal_review"
    | "public_reviewed"
    | "public_official"
    | "archived"
    | "blocked"
  >;
  label: string;
  hint: string;
}> = [
  { state: "public_unverified", label: "Als Vorschlag sichtbar", hint: "Der Beitrag ist sichtbar, aber noch nicht geprüft." },
  { state: "internal_review", label: "Noch nicht öffentlich", hint: "Der Beitrag wird zuerst geprüft." },
  { state: "public_reviewed", label: "Geprüft veröffentlicht", hint: "Der Beitrag ist sichtbar, aber nicht automatisch eine amtliche Aussage." },
  { state: "public_official", label: "Offiziell veröffentlicht", hint: "Dieser Status braucht eine ausdrückliche Freigabe durch eine berechtigte Rolle." },
  { state: "archived", label: "Archiviert", hint: "Der Beitrag bleibt nachvollziehbar, ist aber nicht mehr aktiv." },
  { state: "blocked", label: "Nicht sichtbar", hint: "Inhalte können zurückgehalten werden, wenn Regeln oder Schutzinteressen betroffen sind." },
] as const;

const INPUT_KINDS = [
  { title: "Frage", body: "Was ist noch unklar oder sollte gemeinsam beantwortet werden?" },
  { title: "Quelle", body: "Ein Link, Dokument oder anderer Beleg, der zum Verständnis beiträgt." },
  { title: "Perspektive", body: "Eine Erfahrung, Einordnung oder Gegenposition, die bisher fehlt." },
  { title: "Alternative", body: "Ein weiterer Vorschlag, der bei den bisherigen Möglichkeiten fehlt." },
  { title: "Hinweis", body: "Ein kurzer Sachhinweis oder eine Korrektur zum aktuellen Stand." },
] as const;

function visibilityAccent(state: (typeof VISIBILITY_GUIDE)[number]["state"]): string {
  if (state === "public_unverified") return "border-amber-300/70 bg-amber-50 text-amber-900";
  if (state === "internal_review") return "border-slate-300/80 bg-slate-100 text-slate-900";
  if (state === "public_reviewed") return "border-emerald-300/70 bg-emerald-50 text-emerald-900";
  if (state === "public_official") return "border-sky-300/70 bg-sky-50 text-sky-900";
  if (state === "archived") return "border-stone-300/80 bg-stone-100 text-stone-900";
  return "border-rose-300/70 bg-rose-50 text-rose-900";
}

export default function RundenPublicSharingGuide(props: {
  featuredAnlassraumId?: string | null;
  featuredAnlassraumTitle?: string | null;
}) {
  return (
    <section className="grid gap-4">
      <div className="grid gap-4 xl:grid-cols-[1.05fr_0.95fr]">
        <div className="space-y-4 rounded-2xl border bg-[rgb(var(--card))] p-5">
          <div className="space-y-2">
            <p className="text-xs font-semibold uppercase tracking-[0.18em] text-[rgb(var(--muted))]">Gemeinsam weiterarbeiten</p>
            <h2 className="text-2xl font-semibold text-[rgb(var(--fg))]">Eine Runde endet nicht bei Ja oder Nein.</h2>
            <p className="max-w-3xl text-sm leading-6 text-[rgb(var(--muted))]">
              Menschen können direkt zur Frage beitragen: mit Quellen, Erfahrungen, Gegenargumenten, offenen Punkten oder einer fehlenden Alternative.
            </p>
            <p className="max-w-3xl text-sm leading-6 text-[rgb(var(--muted))]">
              So entsteht Schritt für Schritt ein gemeinsamer, nachvollziehbarer Stand – ohne dass jeder Beitrag automatisch als geprüft oder offiziell gilt.
            </p>
          </div>

          <div className="grid gap-3 md:grid-cols-3">
            <article className="rounded-xl border border-[rgb(var(--border))] bg-[rgb(var(--bg))] p-4">
              <h3 className="text-sm font-semibold text-[rgb(var(--fg))]">Per Link oder QR teilen</h3>
              <p className="mt-2 text-sm leading-6 text-[rgb(var(--muted))]">Menschen landen direkt bei der passenden Frage oder Runde und können mobil mitmachen.</p>
            </article>
            <article className="rounded-xl border border-[rgb(var(--border))] bg-[rgb(var(--bg))] p-4">
              <h3 className="text-sm font-semibold text-[rgb(var(--fg))]">Vor Ort nutzen</h3>
              <p className="mt-2 text-sm leading-6 text-[rgb(var(--muted))]">Bei Dialogen, Workshops oder Veranstaltungen können Rückmeldungen sofort an derselben Stelle gesammelt werden.</p>
            </article>
            <article className="rounded-xl border border-[rgb(var(--border))] bg-[rgb(var(--bg))] p-4">
              <h3 className="text-sm font-semibold text-[rgb(var(--fg))]">Nachrichten weiterdenken</h3>
              <p className="mt-2 text-sm leading-6 text-[rgb(var(--muted))]">Ein Artikel oder Beitrag kann um Quellen, Gegenpositionen, Fragen und Beteiligung ergänzt werden.</p>
            </article>
          </div>

          <div className="flex flex-wrap gap-2">
            <Link href={PUBLIC_CREATE_HREF} className="vog-btn-brand">Etwas beitragen</Link>
            <Link href="/runden/demo" className="vog-btn-secondary">Beispiel ansehen</Link>
          </div>
        </div>

        <div className="space-y-4 rounded-2xl border bg-[rgb(var(--card))] p-5">
          <div>
            <p className="text-xs font-semibold uppercase tracking-[0.18em] text-[rgb(var(--muted))]">Was fehlt noch?</p>
            <h2 className="mt-1 text-2xl font-semibold text-[rgb(var(--fg))]">Direkt ergänzen statt nur kommentieren.</h2>
          </div>

          <div className="grid gap-3 sm:grid-cols-2">
            {INPUT_KINDS.map((kind) => (
              <article key={kind.title} className="rounded-xl border border-[rgb(var(--border))] bg-[rgb(var(--bg))] p-4">
                <h3 className="text-sm font-semibold text-[rgb(var(--fg))]">{kind.title}</h3>
                <p className="mt-2 text-sm leading-6 text-[rgb(var(--muted))]">{kind.body}</p>
              </article>
            ))}
          </div>

          <details className="rounded-xl border border-[rgb(var(--border))] bg-[rgb(var(--bg))] p-4">
            <summary className="cursor-pointer text-sm font-semibold text-[rgb(var(--fg))]">Wie wird sichtbar, was geprüft oder offiziell ist?</summary>
            <div className="mt-3 space-y-3">
              {VISIBILITY_GUIDE.map((entry) => (
                <div key={entry.state} className="rounded-lg border border-[rgb(var(--border))] bg-[rgb(var(--card))] p-3">
                  <span className={`rounded-full border px-2 py-0.5 text-xs font-semibold ${visibilityAccent(entry.state)}`}>{entry.label}</span>
                  <p className="mt-2 text-sm leading-6 text-[rgb(var(--muted))]">{entry.hint}</p>
                </div>
              ))}
            </div>
          </details>
        </div>
      </div>

      <RundenPublicInputPanel
        anlassraumId={props.featuredAnlassraumId ?? null}
        anlassraumTitle={props.featuredAnlassraumTitle ?? null}
      />

      <VoxyFloatingDock
        title="Voxy fragen"
        body="Ich helfe dir beim Verstehen, Formulieren oder Ergänzen."
        primaryAction={{ href: PUBLIC_CREATE_HREF, label: "Frage stellen" }}
        secondaryAction={{ href: "/themen", label: "Themen ansehen" }}
        chips={["Quellen", "Perspektiven", "offene Fragen"]}
      />
    </section>
  );
}
