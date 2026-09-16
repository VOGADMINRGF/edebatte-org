import Link from "next/link";
import { redirect } from "next/navigation";
import { listRundenEntryItems } from "@features/topicRound/entrySource";

const CANONICAL_ID_PATTERN = /^[a-zA-Z0-9][a-zA-Z0-9._:-]{0,159}$/;

function firstParam(value?: string | string[]) {
  return Array.isArray(value) ? value[0] : value;
}

function normalizeTitle(value?: string) {
  return String(value ?? "").trim().slice(0, 300);
}

function entryHref(entry: Awaited<ReturnType<typeof listRundenEntryItems>>[number]) {
  return entry.operatingHref ?? entry.entryHref ?? entry.intakeHref ?? "/runden";
}

export default async function VogQuestionHandoffPage({
  params,
  searchParams,
}: {
  params: Promise<{ canonicalId: string }>;
  searchParams?: Promise<Record<string, string | string[] | undefined>> | Record<string, string | string[] | undefined>;
}) {
  const { canonicalId: rawCanonicalId } = await params;
  const canonicalId = decodeURIComponent(rawCanonicalId).trim();
  const resolvedSearchParams = (await searchParams) ?? {};
  const sourceTitle = normalizeTitle(firstParam(resolvedSearchParams.sourceTitle));

  if (!CANONICAL_ID_PATTERN.test(canonicalId)) {
    redirect("/runden");
  }

  const entries = await listRundenEntryItems({ limit: 100 }).catch(() => []);
  const exact = entries.find((entry) =>
    [entry.topicKey, entry.id, entry.anlassraumId]
      .filter(Boolean)
      .some((value) => String(value).trim().toLowerCase() === canonicalId.toLowerCase()),
  );

  if (exact) {
    redirect(entryHref(exact));
  }

  const questionLabel = sourceTitle || `Öffentliche VoiceOpenGov-Frage ${canonicalId}`;
  const backHref = `https://www.voiceopengov.org/fragen#${encodeURIComponent(canonicalId)}`;
  const contributionParams = new URLSearchParams({
    mode: "source",
    intent: "contribution",
    source: "voiceopengov",
    reason: "vog_public_question_handoff",
    canonicalId,
    signalTitle: questionLabel.slice(0, 160),
    prefill: `Ich möchte zu dieser VoiceOpenGov-Frage beitragen: ${questionLabel}`.slice(0, 1200),
    returnTo: `/runden/vog/${encodeURIComponent(canonicalId)}?sourceTitle=${encodeURIComponent(questionLabel)}`,
  });

  return (
    <main className="public-canvas min-h-screen">
      <section className="public-shell min-h-screen py-10 md:py-16">
        <div className="mx-auto max-w-4xl space-y-6">
          <header className="public-dialog-surface overflow-hidden p-6 md:p-9">
            <p className="text-xs font-semibold uppercase tracking-[0.18em] text-[rgb(var(--muted))]">
              VoiceOpenGov → eDebatte
            </p>
            <h1 className="mt-4 text-3xl font-semibold leading-tight text-[rgb(var(--fg))] md:text-5xl">
              {questionLabel}
            </h1>
            <p className="mt-4 max-w-3xl text-base leading-7 text-[rgb(var(--muted))]">
              Diese Frage hat eine stabile, sprachunabhängige ID. Ein veröffentlichter Anlassraum ist dafür aktuell noch nicht eindeutig verknüpft. Wir schicken dich deshalb nicht kommentarlos auf die Startseite und erzeugen auch keinen zweiten Wahrheitsstand.
            </p>
            <div className="mt-5 flex flex-wrap items-center gap-2 text-xs text-[rgb(var(--muted))]">
              <span className="rounded-full border border-[rgb(var(--border))] px-3 py-1.5">ID: {canonicalId}</span>
              <span className="rounded-full border border-amber-300/50 bg-amber-50 px-3 py-1.5 text-amber-900">Raum-Verknüpfung in Vorbereitung</span>
            </div>
          </header>

          <section className="public-proof-zone rounded-2xl border bg-[rgb(var(--card))] p-6 md:p-8">
            <p className="text-xs font-semibold uppercase tracking-[0.16em] text-[rgb(var(--muted))]">Was du jetzt tun kannst</p>
            <h2 className="mt-2 text-2xl font-semibold text-[rgb(var(--fg))]">Die Frage trotzdem weiterbringen.</h2>
            <p className="mt-3 max-w-3xl text-sm leading-6 text-[rgb(var(--muted))]">
              Du kannst eine Quelle, Perspektive, Korrektur oder Alternative vorbereiten. Sobald der kanonische Anlassraum verbunden ist, soll dieser Einstieg automatisch direkt dorthin führen.
            </p>
            <div className="mt-6 flex flex-wrap gap-3">
              <Link href={`/create?${contributionParams.toString()}`} className="vog-btn-brand">
                Quelle oder Perspektive beitragen
              </Link>
              <Link href="/runden" className="vog-btn-secondary">
                Laufende Fragen ansehen
              </Link>
              <a href={backHref} className="vog-btn-secondary">
                Zurück zu VoiceOpenGov ↗
              </a>
            </div>
          </section>
        </div>
      </section>
    </main>
  );
}
