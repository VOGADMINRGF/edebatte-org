"use client";

import * as React from "react";
import { useLocale } from "@/context/LocaleContext";
import { useAutoTranslateText } from "@/lib/i18n/autoTranslate";
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

function routingHintForBucket(bucket: string, lang: Lang) {
  const de = {
    WORLD: "Routing: global (z. B. UN / internationale Standards)",
    EU: "Routing: EU (Kommission/Parlament/Rat)",
    NACHBARLÄNDER: "Routing: Nachbarländer / grenznahe Themen",
    HEIMATLAND: "Routing: Bund/Land (Gesetze, Ministerien, Behörden)",
    HEIMATREGION: "Routing: Kommune/Region (lokale Umsetzung)",
    HOME_COUNTRY: "Routing: Bund/Land (Gesetze, Ministerien, Behörden)",
    HOME_REGION: "Routing: Kommune/Region (lokale Umsetzung)",
    NEIGHBORS: "Routing: Nachbarländer / grenznahe Themen",
  } as const;

  const en = {
    WORLD: "Routing: global (e.g., UN / international standards)",
    EU: "Routing: EU level (Commission/Parliament/Council)",
    NACHBARLÄNDER: "Routing: neighboring countries / cross-border topics",
    HEIMATLAND: "Routing: national/state (laws, ministries, agencies)",
    HEIMATREGION: "Routing: local/region (implementation)",
    HOME_COUNTRY: "Routing: national/state (laws, ministries, agencies)",
    HOME_REGION: "Routing: local/region (implementation)",
    NEIGHBORS: "Routing: neighboring countries / cross-border topics",
  } as const;

  const map = lang === "en" ? en : de;
  return map[bucket as keyof typeof map] ?? (lang === "en" ? "Routing: —" : "Routing: —");
}

export function ExamplesMarqueeRows(props: {
  blocks: Block[];
  lang: Lang;
  onPick?: (item: ExampleItem) => void;
  onOpen?: (item: ExampleItem) => void;
}) {
  const { locale } = useLocale();
  const t = useAutoTranslateText({ locale, namespace: "landing-marquee" });
  const { ref, size } = useElementSize<HTMLDivElement>();

  // keep sizes stable; just reduce “header heaviness”
  const cardWidth = 260;
  const gap = 12;
  const minCount = Math.max(10, Math.ceil((size.width + gap) / (cardWidth + gap)) + 6);
  const speeds = [64, 72, 80, 88, 96, 104];

  return (
    <div ref={ref} className="absolute inset-0 z-0 overflow-hidden">
      {/* calmer backdrop (less “heavy white overlay”) */}
      <div className="pointer-events-none absolute inset-0 edb-backdrop-glow bg-[radial-gradient(900px_520px_at_30%_0%,rgba(26,140,255,0.18),transparent_58%),radial-gradient(900px_520px_at_72%_0%,rgba(24,207,200,0.16),transparent_58%)]" />
      <div className="pointer-events-none absolute inset-0 edb-backdrop-waves bg-[linear-gradient(120deg,rgba(26,140,255,0.06),transparent_48%),linear-gradient(300deg,rgba(24,207,200,0.06),transparent_48%)]" />
      <div className="pointer-events-none absolute inset-0 bg-white/25" />

      {/* tighter vertical rhythm */}
      <div className="relative mx-auto grid h-[100svh] min-h-screen w-full grid-rows-[repeat(5,minmax(0,1fr))] gap-3 overflow-hidden px-3 pt-14 pb-5 sm:gap-4 sm:px-6">
        {props.blocks.map((block, idx) => {
          const baseItems = tileToCount(block.items, minCount);
          const doubled = baseItems.length ? [...baseItems, ...baseItems] : baseItems;
          const duration = speeds[idx % speeds.length];

          const baseLabel = labelForBucket(block.label, props.lang);
          const baseHint = hintForBucket(block.label, props.lang);
          const baseRoute = routingHintForBucket(block.label, props.lang);
          const label = t(baseLabel, `label.${block.label}`);
          const hint = baseHint ? t(baseHint, `hint.${block.label}`) : "";
          const route = t(baseRoute, `route.${block.label}`);

          return (
            <section key={block.label} className="relative min-h-0 flex flex-col">
              {/* Slim header (no “bar” look) */}
              <div className="mb-1 flex flex-wrap items-center justify-between gap-x-3 gap-y-1">
                <div className="flex flex-wrap items-center gap-x-2 gap-y-1">
                  <span className="text-[10px] font-semibold uppercase tracking-[0.22em] text-slate-500">
                    {label}
                  </span>
                  <span className="text-[10px] text-slate-400">•</span>
                  <span className="text-[10px] text-slate-400">{route}</span>
                </div>

                {hint && (
                  <div className="text-[10px] text-slate-400">
                    {hint}
                  </div>
                )}
              </div>

              <div className="relative min-h-0 flex-1 overflow-hidden">
                {/* softer edge masks */}
                <div className="pointer-events-none absolute inset-y-0 left-0 w-14 bg-gradient-to-r from-slate-50/70 to-transparent" />
                <div className="pointer-events-none absolute inset-y-0 right-0 w-14 bg-gradient-to-l from-slate-50/70 to-transparent" />

                {doubled.length > 0 && (
                  <div
                    className="flex w-max gap-3 edb-marquee"
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

      <div className="pointer-events-none absolute inset-0 bg-[radial-gradient(1200px_700px_at_50%_30%,transparent_40%,rgba(0,0,0,0.05)_100%)]" />

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
