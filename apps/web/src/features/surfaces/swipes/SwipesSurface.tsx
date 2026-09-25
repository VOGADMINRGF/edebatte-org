import { SwipesClient } from "@/app/swipes/SwipesClient";
import type { SurfaceContext } from "@/features/surface";
import VoxyGuide from "@/components/voxy/VoxyGuide";
import { getVoxyCopy } from "@/features/voxy/voxyCopy";

type SwipesSurfaceProps = {
  context: SurfaceContext;
  initialTopic?: string;
  initialClaim?: string;
  initialStance?: string;
  fromCreate?: boolean;
  fromDraftId?: string | null;
  requireAuthAfterFreeVotes?: boolean;
  showWelcomeHint?: boolean;
};

export function SwipesSurface({
  context,
  initialTopic = "",
  initialClaim = "",
  initialStance = "",
  fromCreate = false,
  fromDraftId = null,
  requireAuthAfterFreeVotes = false,
  showWelcomeHint = false,
}: SwipesSurfaceProps) {
  return (
    <main className="public-canvas relative min-h-[100dvh] overflow-x-clip pb-[calc(env(safe-area-inset-bottom)+8rem)] text-[rgb(var(--fg))] md:pb-14">
      <div className="pointer-events-none absolute inset-0 bg-gradient-to-b from-sky-500/10 via-transparent to-emerald-500/8 dark:from-sky-500/18 dark:to-emerald-500/12" />
      <div className="pointer-events-none absolute inset-0">
        <div className="absolute -top-32 -left-20 h-80 w-80 rounded-full bg-cyan-300/20 blur-3xl dark:bg-cyan-500/10" />
        <div className="absolute top-40 -right-24 h-[26rem] w-[26rem] rounded-full bg-sky-300/20 blur-3xl dark:bg-sky-600/10" />
        <div className="absolute bottom-0 left-1/4 h-72 w-72 rounded-full bg-emerald-300/15 blur-3xl dark:bg-emerald-600/10" />
      </div>

      <div className="public-shell relative z-10">
        <div className="mb-3 hidden md:block">
          <VoxyGuide appearance="compact" title="Voxy als Hinweis" variant="miniAvatar">
            {getVoxyCopy("swipes")}
          </VoxyGuide>
        </div>
        <SwipesClient
          initialTopic={initialTopic}
          initialClaim={initialClaim}
          initialStance={initialStance}
          fromCreate={fromCreate}
          fromDraftId={fromDraftId}
          mode={context.mode}
          audience={context.audience}
          requireAuthAfterFreeVotes={requireAuthAfterFreeVotes}
          showWelcomeHint={showWelcomeHint}
        />
      </div>
    </main>
  );
}
