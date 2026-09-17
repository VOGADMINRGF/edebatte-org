"use client";

import { useEffect, useState } from "react";
import type { Dossier } from "@features/dossier";
import type { DossierPublicUpdateContext } from "@features/dossier/updateReadModel";
import demoFallback from "@features/dossier/data/demoDossier";
import DossierWorkspace from "@/components/dossier/DossierWorkspace";
import DossierDecisionCockpit from "@/components/dossier/DossierDecisionCockpit";
import ParliamentaryContextPanel from "@/components/dossier/ParliamentaryContextPanel";
import {
  isRegionDraftDossierId,
  shouldAllowDemoDossierFallback,
} from "@/features/runtimeDataGuardrails";

type ApiResponse =
  | {
      ok: true;
      dossier: Dossier;
      updateContext?: DossierPublicUpdateContext | null;
      sourceStatusLabel?: string | null;
    }
  | { ok: false; error?: string; dossierId?: string; status?: string };

export type DossierLoadState =
  | "loading"
  | "ready"
  | "review_only"
  | "not_found"
  | "load_failed";

export function DossierPagePublicBody({
  dossierId,
  dossier,
  loadState,
  updateContext = null,
  sourceStatusLabel = null,
  demo = false,
}: {
  dossierId: string;
  dossier: Dossier | null;
  loadState: DossierLoadState;
  updateContext?: DossierPublicUpdateContext | null;
  sourceStatusLabel?: string | null;
  demo?: boolean;
  handoffDraft?: unknown;
}) {
  if (loadState === "loading") {
    return (
      <div className="mx-auto w-full max-w-[1180px] px-4 py-12 sm:px-6">
        <p className="text-sm text-[rgb(var(--muted))]" role="status">
          Dossier wird geladen…
        </p>
      </div>
    );
  }

  if (loadState === "review_only") {
    return (
      <div className="mx-auto w-full max-w-[1180px] px-4 py-12 sm:px-6">
        <section className="rounded-3xl border border-amber-300/60 bg-amber-500/10 p-6">
          <h1 className="text-xl font-semibold text-[rgb(var(--fg))]">
            Reviewpflichtiger Dossier-Entwurf
          </h1>
          <p className="mt-2 text-sm leading-6 text-[rgb(var(--muted))]">
            Dieser Stand ist noch nicht öffentlich freigegeben. Quellen, Positionen und
            Beteiligung bleiben bis zur bewussten Veröffentlichung im zuständigen Review-Arbeitsraum.
          </p>
          <p className="mt-2 text-xs text-[rgb(var(--muted))]">
            Es wird kein Demo-Dossier als Ersatz angezeigt.
          </p>
        </section>
      </div>
    );
  }

  if (loadState === "not_found") {
    return (
      <div className="mx-auto w-full max-w-[1180px] px-4 py-12 sm:px-6">
        <section className="rounded-3xl border border-[rgb(var(--border))] bg-[rgb(var(--card))] p-6">
          <h1 className="text-xl font-semibold text-[rgb(var(--fg))]">Dossier nicht gefunden</h1>
          <p className="mt-2 text-sm leading-6 text-[rgb(var(--muted))]">
            Für diese ID liegt kein öffentlich verfügbarer Dossierstand vor. Es wird kein
            Demo-Inhalt als Ersatz angezeigt.
          </p>
          {isRegionDraftDossierId(dossierId) ? (
            <p className="mt-2 text-xs text-[rgb(var(--muted))]">
              Regionale Entwürfe bleiben bis zur Veröffentlichung im Review.
            </p>
          ) : null}
        </section>
      </div>
    );
  }

  if (loadState === "load_failed") {
    return (
      <div className="mx-auto w-full max-w-[1180px] px-4 py-12 sm:px-6">
        <section className="rounded-3xl border border-rose-300/60 bg-rose-500/10 p-6">
          <h1 className="text-xl font-semibold text-[rgb(var(--fg))]">
            Dossier konnte nicht geladen werden
          </h1>
          <p className="mt-2 text-sm leading-6 text-[rgb(var(--muted))]">
            Die Laufzeitdaten sind derzeit nicht verfügbar. Ein Demo-Fallback bleibt auf diesem
            produktiven Pfad ausgeschlossen.
          </p>
        </section>
      </div>
    );
  }

  if (!dossier) return null;

  if (demo) {
    return (
      <DossierWorkspace
        dossier={dossier}
        updateContext={updateContext}
        sourceStatusLabel={sourceStatusLabel}
        demo
      />
    );
  }

  return (
    <div data-public-dossier-cockpit="true">
      <style>{`
        [data-public-dossier-cockpit="true"] [data-dossier-workspace="true"] > header:first-of-type {
          display: none;
        }
        [data-public-dossier-cockpit="true"] [data-dossier-workspace="true"] {
          padding-top: 1.25rem;
        }
      `}</style>
      <DossierDecisionCockpit
        dossier={dossier}
        updateContext={updateContext}
        sourceStatusLabel={sourceStatusLabel}
      />
      <DossierWorkspace
        dossier={dossier}
        updateContext={updateContext}
        sourceStatusLabel={sourceStatusLabel}
        demo={false}
      />
      <div className="mx-auto w-full max-w-[1560px] px-4 pb-12 sm:px-6 lg:px-8 xl:px-10">
        <section className="rounded-[2rem] border border-[rgb(var(--border))] bg-[rgb(var(--card))] p-5 sm:p-7">
          <ParliamentaryContextPanel sources={dossier.sourceSet} />
        </section>
      </div>
    </div>
  );
}

export default function DossierPageClient({
  dossierId,
}: {
  dossierId: string;
  handoffId?: string | null;
}) {
  const demoAllowed = shouldAllowDemoDossierFallback(dossierId);
  const [dossier, setDossier] = useState<Dossier | null>(demoAllowed ? demoFallback : null);
  const [loadState, setLoadState] = useState<DossierLoadState>(
    demoAllowed ? "ready" : "loading",
  );
  const [updateContext, setUpdateContext] = useState<DossierPublicUpdateContext | null>(null);
  const [sourceStatusLabel, setSourceStatusLabel] = useState<string | null>(null);

  useEffect(() => {
    if (demoAllowed) return;
    let cancelled = false;
    fetch(`/api/dossier/${encodeURIComponent(dossierId)}`, { cache: "no-store" })
      .then((response) => response.json() as Promise<ApiResponse>)
      .then((data) => {
        if (cancelled) return;
        if (data.ok) {
          setDossier(data.dossier);
          setUpdateContext(data.updateContext ?? null);
          setSourceStatusLabel(data.sourceStatusLabel ?? null);
          setLoadState("ready");
          return;
        }
        setDossier(null);
        setUpdateContext(null);
        setSourceStatusLabel(null);
        const errorCode = "error" in data ? data.error : undefined;
        setLoadState(errorCode === "dossier_review_only" ? "review_only" : "not_found");
      })
      .catch(() => {
        if (cancelled) return;
        setDossier(null);
        setUpdateContext(null);
        setSourceStatusLabel(null);
        setLoadState("load_failed");
      });
    return () => {
      cancelled = true;
    };
  }, [demoAllowed, dossierId]);

  return (
    <DossierPagePublicBody
      dossierId={dossierId}
      dossier={dossier}
      loadState={loadState}
      updateContext={updateContext}
      sourceStatusLabel={sourceStatusLabel}
      demo={demoAllowed}
    />
  );
}
