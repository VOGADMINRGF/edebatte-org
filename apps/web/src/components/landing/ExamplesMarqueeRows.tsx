"use client";

import * as React from "react";
import type { ExampleItem } from "@/lib/examples/types";
import { hintForBucket, labelForBucket, type Lang } from "@features/landing/landingCopy";
import { ExampleSnippetCard } from "./ExampleSnippetCard";

type Block = { label: string; items: ExampleItem[] };

function useElementSize<T extends HTMLElement>() {
  const ref = React.useRef<T | null>(null);
  const [size, setSize] = React.useState({ width: 0, height: 0 });

  React.useEffect(() => {
    if (!ref.current) return;
    const el = ref.current;
    const ro = new ResizeObserver((entries) => {
      for (const entry of entries) {
        const cr = entry.contentRect;
        setSize({ width: cr.width, height: cr.height });
      }
    });
    ro.observe(el);
    return () => ro.disconnect();
  }, []);

  return { ref, size };
}

function tileToCount<T>(arr: T[], count: number): T[] {
  if (arr.length === 0) return [];
  const out: T[] = [];
  while (out.length < count) out.push(...arr);
  return out.slice(0, count);
}

export function ExamplesMarqueeRows(props: {
  blocks: Block[];
  lang: Lang;
  onPick?: (item: ExampleItem) => void;
  onOpen?: (item: ExampleItem) => void;
}) {
  const { ref, size } = useElementSize<HTMLDivElement>();
  const cardWidth = 260;
  const gap = 12;
  const minCount = Math.max(10, Math.ceil((size.width + gap) / (cardWidth + gap)) + 6);
  const speeds = [64, 72, 80, 88, 96, 104];

  return (
    <div ref={ref} className="absolute inset-0 z-0 overflow-hidden">
      <div className="pointer-events-none absolute inset-0 edb-backdrop-glow bg-[radial-gradient(900px_520px_at_30%_0%,rgba(26,140,255,0.2),transparent_55%),radial-gradient(900px_520px_at_72%_0%,rgba(24,207,200,0.18),transparent_55%)]" />
      <div className="pointer-events-none absolute inset-0 edb-backdrop-waves bg-[linear-gradient(120deg,rgba(26,140,255,0.08),transparent_45%),linear-gradient(300deg,rgba(24,207,200,0.08),transparent_45%)]" />
      <div className="pointer-events-none absolute inset-0 bg-white/35" />

      <div className="relative mx-auto w-full space-y-4 px-5 py-8">
        {props.blocks.map((block, idx) => {
          const baseItems = tileToCount(block.items, minCount);
          const doubled = baseItems.length ? [...baseItems, ...baseItems] : baseItems;
          const duration = speeds[idx % speeds.length];
          const hint = hintForBucket(block.label, props.lang);
          return (
            <section key={block.label} className="relative">
              <div className="mb-2 flex flex-wrap items-center justify-between gap-2">
                <div className="text-[11px] font-semibold tracking-[0.22em] text-black/50">
                  {labelForBucket(block.label, props.lang)}
                </div>
                {hint && <div className="text-[11px] text-black/40">{hint}</div>}
              </div>

              <div className="relative overflow-hidden">
                <div className="pointer-events-none absolute inset-y-0 left-0 w-16 bg-gradient-to-r from-slate-50/80 to-transparent" />
                <div className="pointer-events-none absolute inset-y-0 right-0 w-16 bg-gradient-to-l from-slate-50/80 to-transparent" />

                {doubled.length > 0 && (
                  <div
                    className="flex w-max gap-4 edb-marquee"
                    style={{ ["--marquee-duration" as string]: `${duration}s` }}
                  >
                    {doubled.map((item, itemIdx) => (
                      <div key={`${block.label}-${item.id}-${itemIdx}`} className="min-w-[260px] max-w-[260px]">
                        <ExampleSnippetCard
                          item={item}
                          lang={props.lang}
                          onPick={props.onPick}
                          onOpen={props.onOpen}
                          compact
                        />
                      </div>
                    ))}
                  </div>
                )}
              </div>
            </section>
          );
        })}
      </div>

      <div className="pointer-events-none absolute inset-0 bg-[radial-gradient(1200px_700px_at_50%_30%,transparent_35%,rgba(0,0,0,0.06)_100%)]" />

      <style jsx>{`
        .edb-backdrop-glow {
          animation: edbGlow 18s ease-in-out infinite alternate;
          transform-origin: center;
          background-size: 120% 120%;
        }
        .edb-backdrop-waves {
          animation: edbWaves 24s ease-in-out infinite alternate;
          background-size: 180% 180%;
        }
        @keyframes edbGlow {
          0% {
            transform: translateY(-2%) scale(1);
            opacity: 0.75;
          }
          100% {
            transform: translateY(2%) scale(1.04);
            opacity: 1;
          }
        }
        @keyframes edbWaves {
          0% {
            background-position: 0% 0%;
            opacity: 0.65;
          }
          100% {
            background-position: 100% 100%;
            opacity: 1;
          }
        }
        @keyframes edbMarquee {
          0% {
            transform: translateX(0);
          }
          100% {
            transform: translateX(-50%);
          }
        }
        .edb-marquee {
          animation-name: edbMarquee;
          animation-timing-function: linear;
          animation-iteration-count: infinite;
          animation-duration: var(--marquee-duration);
        }
        @media (max-width: 1024px) {
          .edb-marquee {
            animation-duration: calc(var(--marquee-duration) * 1.2);
          }
        }
        @media (prefers-reduced-motion: reduce) {
          .edb-marquee {
            animation-duration: 0s;
            animation-iteration-count: 1;
            transform: translateX(0);
          }
        }
      `}</style>
    </div>
  );
}
