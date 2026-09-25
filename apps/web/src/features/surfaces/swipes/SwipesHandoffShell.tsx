"use client";

import * as React from "react";
import type { SurfaceContext } from "@/features/surface";
import { CreateHandoffPanel } from "@/features/create/CreateHandoffPanel";
import { useCreateHandoffDraft } from "@/features/create/useCreateHandoffDraft";
import { SwipesSurface } from "@/features/surfaces/swipes";

export function SwipesHandoffShell(props: {
  context: SurfaceContext;
  initialTopic?: string;
  initialClaim?: string;
  initialStance?: string;
  fromCreate?: boolean;
  fromDraftId?: string | null;
  requireAuthAfterFreeVotes?: boolean;
  showWelcomeHint?: boolean;
  handoffId?: string | null;
}) {
  const draft = useCreateHandoffDraft(props.handoffId ?? null);

  return (
    <div className="space-y-4">
      {draft ? (
        <div className="mx-auto w-full max-w-6xl px-4 pt-6 sm:px-6">
          <CreateHandoffPanel draft={draft} title="Passende Beteiligungsfrage vorbereitet" />
          <p className="mt-2 text-xs text-[rgb(var(--muted))]">
            Das passt zu deinem Beitrag. Du entscheidest hier selbst, ob du zustimmst, widersprichst oder mehr erfahren möchtest. Nichts wird automatisch veröffentlicht oder abgestimmt.
          </p>
        </div>
      ) : null}
      <SwipesSurface
        context={props.context}
        initialTopic={props.initialTopic}
        initialClaim={props.initialClaim}
        initialStance={props.initialStance}
        fromCreate={props.fromCreate}
        fromDraftId={props.fromDraftId}
        requireAuthAfterFreeVotes={props.requireAuthAfterFreeVotes}
        showWelcomeHint={props.showWelcomeHint}
      />
    </div>
  );
}
