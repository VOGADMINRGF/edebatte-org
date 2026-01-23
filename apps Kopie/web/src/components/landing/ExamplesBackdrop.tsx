"use client";

import * as React from "react";
import type { ExampleItem } from "@/lib/examples/types";
import { labelForBucket, type Lang } from "@features/landing/landingCopy";
import { ExampleSnippetCard } from "./ExampleSnippetCard";

export type BucketBlock = {
  label: string;
  items: ExampleItem[];
};

function useElementSize<T extends HTMLElement>() {
  const ref = React.useRef<T | null>(null);
  const [size, setSize] = React.useState({ width: 0, height: 0 });

  React.useEffect(() => {
    if (!ref.current) return;
    const el = ref.current;

    const ro = new ResizeObserver((entries) => {
      for (const e of entries) {
        const cr = e.contentRect;
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

export function ExamplesBackdrop(props: {
  blocks: BucketBlock[];
  lang: Lang;
  onPick?: (item: ExampleItem) => void;
  onOpen?: (item: ExampleItem) => void;
  className?: string;
}) {
  const { ref, size } = useElementSize<HTMLDivElement>();

  // Estimate how many cards we need to visually fill the viewport.
  const cardWidth = 320; // px
  const rowHeight = 110; // px
  const gap = 18; // px

  const cols = Math.max(1, Math.floor((size.width + gap) / (cardWidth + gap)));
  const rows = Math.max(4, Math.ceil((size.height + gap) / (rowHeight + gap)) + 2);
  const perBlock = Math.max(8, Math.ceil((cols * rows) / Math.max(1, props.blocks.length)));

  return (
    <div
      ref={ref}
      className={[
        "absolute inset-0 z-0 overflow-hidden",
        props.className || "",
      ].join(" ")}
    >
      {/* Neutral, cool brand light */}
      <div className="pointer-events-none absolute inset-0 edb-backdrop-glow bg-[radial-gradient(900px_520px_at_30%_0%,rgba(26,140,255,0.2),transparent_55%),radial-gradient(900px_520px_at_72%_0%,rgba(24,207,200,0.18),transparent_55%)]" />
      <div className="pointer-events-none absolute inset-0 edb-backdrop-waves bg-[linear-gradient(120deg,rgba(26,140,255,0.08),transparent_45%),linear-gradient(300deg,rgba(24,207,200,0.08),transparent_45%)]" />
      <div className="pointer-events-none absolute inset-0 bg-white/35" />

      <div className="relative mx-auto w-full px-6 py-10">
        <div className="grid grid-cols-1 gap-10 lg:grid-cols-2">
          {props.blocks.map((b) => {
            const items = tileToCount(b.items, perBlock);
            return (
              <section key={b.label} className="relative">
                <div className="mb-3 flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <span className="h-[2px] w-6 rounded-full bg-gradient-to-r from-sky-400/70 to-cyan-400/70" />
                    <div className="text-[11px] font-semibold tracking-[0.22em] text-black/50">
                      {labelForBucket(b.label, props.lang)}
                    </div>
                  </div>
                </div>

                <div className="grid gap-4 grid-cols-1 sm:grid-cols-2">
                  {items.map((item, idx) => (
                    <ExampleSnippetCard
                      key={`${item.id}-${idx}`}
                      item={item}
                      lang={props.lang}
                      onPick={props.onPick}
                      onOpen={props.onOpen}
                    />
                  ))}
                </div>
              </section>
            );
          })}
        </div>
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
      `}</style>
    </div>
  );
}
