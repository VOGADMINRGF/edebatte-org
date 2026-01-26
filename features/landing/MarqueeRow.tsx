"use client";

import type { LandingTile } from "./landingSeeds";

function resolveTileTarget(tile: LandingTile) {
  if (tile.statementId) {
    return { href: `/statements/${tile.statementId}` };
  }
  if (tile.dossierId) {
    return { href: `/dossier/${tile.dossierId}` };
  }
  if (tile.kind === "option" || tile.kind === "vote") {
    return { href: "/howtoworks/edebatte/abstimmen" };
  }
  if (tile.kind === "question") {
    return { href: "/howtoworks/edebatte/dossier" };
  }
  return { href: "/howtoworks/edebatte/dossier" };
}

export default function MarqueeRow({
  label,
  items,
  now,
  speedSeconds = 60,
  reverse = false,
}: {
  label: string;
  items: LandingTile[];
  now?: number;
  speedSeconds?: number;
  reverse?: boolean;
}) {
  const clock = now ?? Date.now();
  const pinned = items
    .filter((tile) => typeof tile.freshUntil === "number" && tile.freshUntil > clock)
    .slice(0, 6);

  const pinnedIds = new Set(pinned.map((tile) => tile.id));
  const scrollItems = items.filter((tile) => !pinnedIds.has(tile.id));
  const doubled = scrollItems.length ? [...scrollItems, ...scrollItems] : scrollItems;

  return (
    <div className="relative">
      <div className="mb-2 flex items-center justify-between px-4">
        <p className="text-[11px] font-semibold uppercase tracking-[0.22em] text-slate-500">{label}</p>
        <span className="text-[11px] text-slate-400">{items.length} Beiträge</span>
      </div>

      <div className="relative overflow-hidden">
        <div className="pointer-events-none absolute inset-y-0 left-0 w-16 bg-gradient-to-r from-white/90 to-transparent" />
        <div className="pointer-events-none absolute inset-y-0 right-0 w-16 bg-gradient-to-l from-white/90 to-transparent" />

        {pinned.length > 0 && (
          <div className="mb-3 flex gap-3 overflow-x-auto pb-1">
            {pinned.map((t) => {
              const target = resolveTileTarget(t);
              const kindLabel = t.kind === "option" || t.kind === "vote" ? "Abstimmung" : "Debattenpunkt";
              return (
                <a
                  key={t.id}
                  href={target.href}
                  className="group min-w-[220px] rounded-2xl border border-sky-200/80 bg-white/90 px-4 py-3 shadow-sm backdrop-blur hover:bg-white"
                >
                  <div className="flex items-center gap-2">
                    <span className="rounded-full bg-cyan-100 px-2 py-0.5 text-[11px] font-semibold text-cyan-700">
                      Neu
                    </span>
                    <span className="rounded-full bg-slate-100 px-2 py-0.5 text-[11px] font-semibold text-slate-600">
                      {kindLabel}
                    </span>
                  </div>
                  <p className="mt-2 text-sm font-semibold text-slate-900 group-hover:underline">{t.text}</p>
                </a>
              );
            })}
          </div>
        )}

        {doubled.length > 0 && (
          <div
            className={`flex w-max gap-3 ${reverse ? "edb-marquee-rev" : "edb-marquee"}`}
            style={{ ["--marquee-duration" as string]: `${speedSeconds}s` }}
          >
            {doubled.map((t, idx) => {
              const target = resolveTileTarget(t);
              const kindLabel = t.kind === "option" || t.kind === "vote" ? "Abstimmung" : "Debattenpunkt";
              return (
                <a
                  key={`${t.id}-${idx}`}
                  href={target.href}
                  className="group rounded-2xl border border-slate-200/60 bg-white/70 px-4 py-3 shadow-sm backdrop-blur hover:bg-white"
                >
                  <div className="flex items-center gap-2">
                    <span className="rounded-full bg-slate-100 px-2 py-0.5 text-[11px] font-semibold text-slate-600">
                      {kindLabel}
                    </span>
                    {t.tag && (
                      <span className="rounded-full bg-slate-100 px-2 py-0.5 text-[11px] font-semibold text-slate-600">
                        {t.tag}
                      </span>
                    )}
                    <span className="text-[11px] text-slate-400">•</span>
                    <span className="text-[11px] text-slate-500">Öffentlich</span>
                  </div>
                  <p className="mt-2 max-w-[320px] text-sm font-semibold text-slate-900 group-hover:underline">
                    {t.text}
                  </p>
                </a>
              );
            })}
          </div>
        )}

        <style jsx>{`
          @keyframes edbMarquee {
            0% { transform: translateX(0); }
            100% { transform: translateX(-50%); }
          }
          @keyframes edbMarqueeRev {
            0% { transform: translateX(-50%); }
            100% { transform: translateX(0); }
          }
          .edb-marquee {
            animation-name: edbMarquee;
            animation-timing-function: linear;
            animation-iteration-count: infinite;
            animation-duration: var(--marquee-duration);
          }
          .edb-marquee-rev {
            animation-name: edbMarqueeRev;
            animation-timing-function: linear;
            animation-iteration-count: infinite;
            animation-duration: var(--marquee-duration);
          }
          @media (max-width: 768px) {
            .edb-marquee,
            .edb-marquee-rev {
              animation-duration: calc(var(--marquee-duration) * 1.35);
            }
          }
          @media (prefers-reduced-motion: reduce) {
            .edb-marquee,
            .edb-marquee-rev {
              animation-duration: 0s;
              animation-iteration-count: 1;
              transform: translateX(0);
            }
          }
        `}</style>
      </div>
    </div>
  );
}
