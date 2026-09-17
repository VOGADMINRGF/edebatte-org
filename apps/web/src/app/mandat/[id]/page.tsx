import Link from "next/link";
import { notFound } from "next/navigation";
import {
  getMandateById,
  isPublicReadOnlyMandate,
  type Mandate,
  supportsAuthorityDerivationFromEDebatte,
  supportsAutomaticAssignment,
  supportsMandateEditInPublicSurface,
  supportsMembershipHandoff,
} from "@features/mandate";

type PageProps = {
  params: Promise<{ id: string }>;
};

const statusLabels: Record<Mandate["status"], string> = {
  entwurf: "Entwurf",
  in_pruefung: "In Prüfung",
  aktiv: "Aktiv",
  in_umsetzung: "In Umsetzung",
  abgeschlossen: "Abgeschlossen",
  ausgesetzt: "Ausgesetzt",
};

const verificationLabels: Record<Mandate["verificationStatus"], string> = {
  unverified: "Ungeprüft",
  pending: "Prüfung ausstehend",
  verified: "Verifiziert",
  rejected: "Zurückgewiesen",
};

function formatDate(dateIso: string): string {
  return new Date(`${dateIso}T00:00:00.000Z`).toLocaleDateString("de-DE", {
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  });
}

function buildReferenceItems(mandate: Mandate): Array<{ label: string; value: string; href: string | null }> {
  return [
    {
      label: "Dossier",
      value: mandate.sourceDossierId ?? "nicht verknüpft",
      href: mandate.sourceDossierId ? `/dossier/${encodeURIComponent(mandate.sourceDossierId)}` : null,
    },
    {
      label: "Runde",
      value: mandate.sourceRoundId ?? "nicht verknüpft",
      href: mandate.sourceRoundId ? `/runden?round=${encodeURIComponent(mandate.sourceRoundId)}` : null,
    },
    {
      label: "Anlassraum",
      value: mandate.sourceAnlassraumId ?? "nicht verknüpft",
      href: mandate.sourceAnlassraumId
        ? `/anlassraum?anlassraumId=${encodeURIComponent(mandate.sourceAnlassraumId)}`
        : null,
    },
  ];
}

export default async function MandatDetailPage({ params }: PageProps) {
  const { id } = await params;
  const mandate = getMandateById(id);

  if (!mandate || !isPublicReadOnlyMandate(mandate)) {
    notFound();
  }

  const references = buildReferenceItems(mandate);

  return (
    <main className="mx-auto min-h-screen max-w-4xl px-4 py-10 space-y-6">
      <header className="rounded-3xl border border-[rgb(var(--border))] bg-[rgb(var(--card))] p-6 shadow-sm space-y-3">
        <p className="text-xs font-semibold uppercase tracking-wide text-[rgb(var(--muted))]">
          eDebatte Verantwortungsregister
        </p>
        <h1 className="text-2xl font-semibold text-[rgb(var(--fg))]">{mandate.title}</h1>
        <p className="text-sm text-[rgb(var(--muted))]">{mandate.subject}</p>
        <p className="text-sm text-[rgb(var(--fg))]">{mandate.publicSummary}</p>
        <div className="flex flex-wrap gap-2 text-xs text-[rgb(var(--muted))]">
          <span className="vog-chip vog-chip--status">Verantwortungsnachweis</span>
          <span className="vog-chip vog-chip--status">Status: {statusLabels[mandate.status]}</span>
          <span className="vog-chip vog-chip--status">Verifikation: {verificationLabels[mandate.verificationStatus]}</span>
          <span className="vog-chip vog-chip--status">Letzte Aktualisierung: {formatDate(mandate.lastUpdatedAt)}</span>
        </div>
      </header>

      <section className="grid gap-4 md:grid-cols-2">
        <article className="rounded-3xl border border-[rgb(var(--border))] bg-[rgb(var(--card))] p-5 shadow-sm space-y-2">
          <h2 className="text-base font-semibold text-[rgb(var(--fg))]">Verantwortung</h2>
          <p className="text-sm text-[rgb(var(--muted))]">
            Verantwortliche {mandate.responsibility.holderKind === "person" ? "Person" : "Organisation"}
          </p>
          <p className="text-sm font-semibold text-[rgb(var(--fg))]">{mandate.responsibility.holderLabel}</p>
          <p className="text-sm text-[rgb(var(--muted))]">Rolle: {mandate.responsibility.roleLabel}</p>
          <p className="text-sm text-[rgb(var(--muted))]">Verantwortung beginnt: {formatDate(mandate.validFrom)}</p>
          <p className="text-sm text-[rgb(var(--muted))]">
            Verantwortung endet: {mandate.validUntil ? formatDate(mandate.validUntil) : "offen"}
          </p>
        </article>

        <article className="rounded-3xl border border-[rgb(var(--border))] bg-[rgb(var(--card))] p-5 shadow-sm space-y-2">
          <h2 className="text-base font-semibold text-[rgb(var(--fg))]">Autorisierung</h2>
          <p className="text-sm text-[rgb(var(--muted))]">Aussteller: {mandate.authority.issuerLabel}</p>
          <p className="text-sm text-[rgb(var(--muted))]">Referenz: {mandate.authority.decisionReference}</p>
          <p className="text-sm text-[rgb(var(--muted))]">
            eDebatte dokumentiert diese Autorisierung nur. Sie entsteht nicht durch ein Dossier, eine Runde oder ein Mehrheitsbild in eDebatte.
          </p>
        </article>
      </section>

      <section className="rounded-3xl border border-[rgb(var(--border))] bg-[rgb(var(--card))] p-5 shadow-sm space-y-2">
        <h2 className="text-base font-semibold text-[rgb(var(--fg))]">Herkunft / Provenienz</h2>
        <p className="text-sm text-[rgb(var(--muted))]">Register: {mandate.provenance.registerLabel}</p>
        <p className="text-sm text-[rgb(var(--muted))]">{mandate.provenance.sourceLabel}</p>
        <p className="text-sm text-[rgb(var(--muted))]">Consent-Status: {mandate.consentStatus}</p>
        <p className="text-sm text-[rgb(var(--muted))]">Sichtbarkeit: {mandate.visibility}</p>
      </section>

      <section className="rounded-3xl border border-[rgb(var(--border))] bg-[rgb(var(--card))] p-5 shadow-sm space-y-3">
        <h2 className="text-base font-semibold text-[rgb(var(--fg))]">Bezug zu Dossier / Runde / Anlassraum</h2>
        <div className="grid gap-2 md:grid-cols-3">
          {references.map((reference) => (
            <div key={reference.label} className="rounded-2xl border border-[rgb(var(--border))] bg-[rgb(var(--bg))] p-3">
              <p className="text-xs font-semibold uppercase tracking-wide text-[rgb(var(--muted))]">{reference.label}</p>
              {reference.href ? (
                <Link href={reference.href} className="text-sm font-medium text-[rgb(var(--fg))] underline underline-offset-2">
                  {reference.value}
                </Link>
              ) : (
                <p className="text-sm text-[rgb(var(--muted))]">{reference.value}</p>
              )}
            </div>
          ))}
        </div>
      </section>

      <section className="rounded-3xl border border-[rgb(var(--border))] bg-[rgb(var(--card))] p-5 shadow-sm space-y-2">
        <h2 className="text-base font-semibold text-[rgb(var(--fg))]">Transparenzhinweis</h2>
        <p className="text-sm text-[rgb(var(--muted))]">{mandate.transparency.publicNote}</p>
        <p className="text-sm text-[rgb(var(--muted))]">{mandate.transparency.scopeNote}</p>
        <p className="text-sm text-[rgb(var(--muted))]">{mandate.transparency.confidentialHintBoundary}</p>
        <p className="text-sm text-[rgb(var(--muted))]">
          Diese Oberfläche ist öffentlich lesbar und read-only. Es gibt hier keine Bearbeitungsfunktion, keine automatische Zuordnung,
          keine automatische Mitgliedschaftsübernahme und keine automatische Ableitung von Mandaten oder Weisungen aus eDebatte-Ergebnissen.
        </p>
      </section>

      <section className="flex flex-wrap gap-3">
        <Link href="/mandat" className="btn-secondary text-sm">
          Zurück zur Übersicht
        </Link>
        <Link href="/howtoworks/edebatte/mandat" className="btn-ghost text-sm">
          Produktkontext ansehen
        </Link>
      </section>

      <section className="sr-only">
        <p>supportsMembershipHandoff: {String(supportsMembershipHandoff())}</p>
        <p>supportsAutomaticAssignment: {String(supportsAutomaticAssignment())}</p>
        <p>supportsAuthorityDerivationFromEDebatte: {String(supportsAuthorityDerivationFromEDebatte())}</p>
        <p>supportsMandateEditInPublicSurface: {String(supportsMandateEditInPublicSurface())}</p>
      </section>
    </main>
  );
}
