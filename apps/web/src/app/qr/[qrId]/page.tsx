import { redirect } from "next/navigation";
import type { Metadata } from "next";
import { publicOrigin } from "@/utils/publicOrigin";
import { QuestionSetClient } from "./QuestionSetClient";

type PageProps = {
  params: Promise<{ qrId: string }>;
};

type QrResolved = {
  targetType: "statement" | "contribution" | "stream" | "campaign" | "campaign_session" | "set" | "custom" | string;
  targetIds: string[];
  title?: string | null;
  meta?: Record<string, string | number | boolean | null>;
};

type QrResolveResponse = {
  success: boolean;
  data?: QrResolved | null;
};

export async function generateMetadata({ params }: PageProps): Promise<Metadata> {
  const { qrId } = await params;
  return {
    title: `QR Teilnahme · ${qrId}`,
    description: "Teilnahme an einer Abstimmung oder Kampagne per QR-Code.",
  };
}

export default async function QRScanPage({ params }: PageProps) {
  const { qrId } = await params;

  const base = process.env.NEXT_PUBLIC_API_URL || publicOrigin();
  let body: QrResolveResponse | null = null;
  try {
    const res = await fetch(`${base}/api/qr/resolve?qrId=${encodeURIComponent(qrId)}`, {
      cache: "no-store",
    });
    body = (await res.json().catch(() => null)) as QrResolveResponse | null;
  } catch {
    body = null;
  }
  if (!body?.success || !body?.data) {
    return <QrFallback qrId={qrId} reason="not_found" />;
  }
  const data = body.data;

  if (data.targetType === "statement") {
    const id = data.targetIds?.[0];
    if (!id) return <QrFallback qrId={qrId} reason="invalid_target" />;
    return redirect(`/statements/${encodeURIComponent(id)}`);
  }
  if (data.targetType === "contribution") {
    const id = data.targetIds?.[0];
    if (!id) return <QrFallback qrId={qrId} reason="invalid_target" />;
    return redirect(`/contribute?source=qr&target=${encodeURIComponent(id)}`);
  }
  if (data.targetType === "stream") {
    const id = data.targetIds?.[0];
    if (!id) return <QrFallback qrId={qrId} reason="invalid_target" />;
    return redirect(`/stream/${encodeURIComponent(id)}`);
  }
  if (data.targetType === "campaign") {
    return <CampaignQrLanding id={data.targetIds[0]} title={data.title} />;
  }
  if (data.targetType === "campaign_session") {
    return <CampaignQrLanding id={data.targetIds[0]} sessionId={data.targetIds[1]} title={data.title} />;
  }
  if (data.targetType === "set") {
    const code = data.targetIds?.[0];
    if (!code) return <QrFallback qrId={qrId} reason="invalid_target" />;
    return <QuestionSetClient code={code} />;
  }
  if (data.targetType === "custom") {
    return <CustomFlow data={data} />;
  }

  return <QrFallback qrId={qrId} reason="unsupported" />;
}

function QrFallback({
  qrId,
  reason,
}: {
  qrId: string;
  reason: "not_found" | "invalid_target" | "unsupported";
}) {
  const ctaClassName = "inline-flex w-full items-center justify-center sm:w-auto";
  const description =
    reason === "invalid_target"
      ? "Der QR-Code enthält kein belastbares Ziel. Du kannst trotzdem über die bestehenden review-first Einstiege weiterarbeiten."
      : reason === "unsupported"
        ? "Dieser QR-Code verweist auf einen nicht freigeschalteten Zieltyp. Es wird keine automatische Teilnahme oder Veröffentlichung ausgelöst."
        : "Dieser QR-Code ist nicht mehr verfügbar oder wurde noch nicht sicher vorbereitet. Du kannst trotzdem über die bestehenden review-first Einstiege weiterarbeiten.";

  return (
    <main
      className="mx-auto flex min-h-[100svh] max-w-2xl flex-col gap-6 px-4 py-12"
      data-testid="qr-entry-fallback"
      data-qr-fallback-reason={reason}
    >
      <header className="space-y-2">
        <p className="text-xs font-semibold uppercase tracking-wide text-[rgb(var(--muted))]">
          QR-Einstieg
        </p>
        <h1 className="text-2xl font-bold text-[rgb(var(--fg))]">QR-Code nicht verfügbar</h1>
        <p className="text-sm text-[rgb(var(--muted))]">{description}</p>
      </header>

      <section className="rounded-2xl border border-[rgb(var(--border))] bg-[rgb(var(--card))] p-4 text-sm shadow-sm">
        <p className="font-semibold text-[rgb(var(--fg))]">QR-ID</p>
        <p className="mt-1 break-all text-[rgb(var(--muted))]">{qrId}</p>
        <p className="mt-3 text-[rgb(var(--muted))]">
          Dieser Einstieg bleibt guardrailed: kein Auto-Publish, kein Vote und keine stille
          Weiterleitung in produktive Schreibpfade.
        </p>
      </section>

      <div className="flex flex-col gap-3 text-sm sm:flex-row sm:flex-wrap sm:items-center">
        <a
          href="/start"
          className={`landing-cta-primary public-cta-primary vog-btn-brand ${ctaClassName}`}
        >
          Über Start weiter
        </a>
        <a
          href="/stream"
          className={`vog-btn-secondary landing-cta-secondary ${ctaClassName}`}
        >
          Live- und Event-Kontexte ansehen
        </a>
      </div>
    </main>
  );
}

function CampaignQrLanding({
  id,
  sessionId,
  title,
}: {
  id: string;
  sessionId?: string;
  title?: string | null;
}) {
  const ctaClassName = "inline-flex w-full items-center justify-center sm:w-auto";
  const params = new URLSearchParams({ source: "qr" });
  if (sessionId) params.set("session", sessionId);
  const liveHref = `/live/${encodeURIComponent(id)}?${params.toString()}`;
  return (
    <main
      className="mx-auto flex min-h-[100svh] max-w-2xl flex-col gap-6 px-4 py-12"
      data-testid="qr-campaign-landing"
    >
      <header className="space-y-2">
        <p className="text-xs font-semibold uppercase tracking-wide text-[rgb(var(--muted))]">
          Kampagnen-QR
        </p>
        <h1 className="text-2xl font-bold text-[rgb(var(--fg))]">{title ?? "Kampagne"}</h1>
        <p className="text-sm text-[rgb(var(--muted))]">
          Du bist über einen QR-Code hierher gekommen. Öffne denselben review-first Live-Einstieg
          wie auf dem Kampagnenlink.
        </p>
      </header>

      <section className="rounded-2xl border border-[rgb(var(--border))] bg-[rgb(var(--card))] p-4 text-sm shadow-sm">
        {sessionId ? (
          <div className="space-y-1 text-[rgb(var(--muted))]">
            <p>
              Session: <span className="font-semibold text-[rgb(var(--fg))]">{sessionId}</span>
            </p>
            <p className="text-xs text-[rgb(var(--muted))]">
              Hinweis: Die QR-Session kann lokal aushängen oder im Stream eingebunden sein.
            </p>
          </div>
        ) : (
          <p className="text-[rgb(var(--muted))]">
            Kein separater Session-Kontext übergeben. Der Live-Einstieg bleibt trotzdem nutzbar.
          </p>
        )}
      </section>

      <div className="flex flex-col gap-3 text-sm sm:flex-row sm:flex-wrap sm:items-center">
        <a
          href={liveHref}
          className={`landing-cta-primary public-cta-primary vog-btn-brand ${ctaClassName}`}
        >
          Live-Einstieg öffnen
        </a>
        <a
          href={`/campaign/${id}`}
          className={`vog-btn-secondary landing-cta-secondary ${ctaClassName}`}
        >
          Kampagnenkontext ansehen
        </a>
      </div>

      <p className="text-xs text-[rgb(var(--muted))]">
        Hinweis: Der QR-Code öffnet nur einen Entwurfs- und Review-Einstieg. Es wird nichts
        automatisch veröffentlicht oder gezählt.
      </p>
    </main>
  );
}

function CustomFlow({ data }: { data: QrResolved }) {
  return (
    <main className="mx-auto flex max-w-2xl flex-col gap-4 px-4 py-10">
      <h1 className="text-xl font-semibold text-[rgb(var(--fg))]">Individuelle Aktion</h1>
      <p className="text-sm text-[rgb(var(--muted))]">
        Dieser QR-Code führt zu einem benutzerdefinierten Flow. Bitte folge den Hinweisen der
        Veranstaltung oder Organisation.
      </p>
      <pre className="rounded-2xl border border-[rgb(var(--border))] bg-[rgb(var(--bg))] p-3 text-xs text-[rgb(var(--muted))]">
        {JSON.stringify({ targetType: data.targetType, meta: data.meta ?? null }, null, 2)}
      </pre>
    </main>
  );
}
