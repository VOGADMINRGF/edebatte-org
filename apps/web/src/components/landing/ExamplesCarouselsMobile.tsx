"use client";

import * as React from "react";
import type { ExampleItem } from "@/lib/examples/types";
import { LANDING_COPY, labelForBucket, type Lang } from "@features/landing/landingCopy";
import { ExampleSnippetCard } from "./ExampleSnippetCard";

type Block = { label: string; items: ExampleItem[] };

export function ExamplesCarouselsMobile(props: {
  blocks: Block[];
  lang: Lang;
  onPick?: (item: ExampleItem) => void;
  onOpen?: (item: ExampleItem) => void;
}) {
  const t = LANDING_COPY[props.lang];
  return (
    <div className="mt-8 space-y-8 lg:hidden">
      {props.blocks.map((block) => (
        <section key={block.label}>
          <div className="mb-3 flex items-center justify-between px-1">
            <div className="text-[11px] font-semibold tracking-[0.22em] text-black/45">
              {labelForBucket(block.label, props.lang)}
            </div>
            <div className="text-[11px] text-black/35">{t.cards.swipe}</div>
          </div>

          <div className="flex gap-4 overflow-x-auto pb-2 [-webkit-overflow-scrolling:touch]">
            {block.items.slice(0, 10).map((item, idx) => (
              <div key={`${item.id}-${idx}`} className="min-w-[260px] max-w-[260px]">
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
        </section>
      ))}
    </div>
  );
}
