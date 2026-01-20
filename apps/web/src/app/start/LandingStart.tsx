"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import LandingAssistant from "@features/landing/LandingAssistant";
import type { LandingScope, LandingTile } from "@features/landing/landingSeeds";
import type { GeoInfo } from "@/lib/geo/getGeoFromHeaders";
import type { ExampleItem, ExampleKind } from "@/lib/examples/types";
import type { BucketBlock } from "@/components/landing/ExamplesBackdrop";
import { ExamplesMarqueeRows } from "@/components/landing/ExamplesMarqueeRows";
import { buildPrefillUrl, createDraftAndNavigate } from "@features/common/utils/draftNavigation";
import { PrelaunchGateModal } from "@/components/landing/PrelaunchGateModal";
import { useLocale } from "@/context/LocaleContext";
import { normalizeLang, type Lang } from "@features/landing/landingCopy";

type LandingStartProps = {
  blocks: BucketBlock[];
  geo: GeoInfo;
};

const SCOPE_TO_LABEL: Record<LandingScope, string> = {
  world: "WORLD",
  eu: "EU",
  country: "HEIMATLAND",
  region: "BUNDESLAND / BUNDESSTAAT",
};

function tileToExample(
  tile: LandingTile,
  scope: LandingScope,
  geo: GeoInfo,
  index: number,
  lang: Lang,
): ExampleItem | null {
  const title = tile.text?.trim();
  if (!title) return null;
  const kind: ExampleKind =
    tile.kind === "option" || tile.kind === "vote" ? "Abstimmung" : "Debattenpunkt";
  const scopeLabel = scope === "world" ? "WORLD" : scope === "eu" ? "EU" : scope === "region" ? "REGION" : "COUNTRY";
  const topics = tile.tag ? [tile.tag] : ["Neu"];
  return {
    id: `live-${Date.now()}-${index}`,
    kind,
    topics,
    topics_en: lang === "en" ? topics : undefined,
    title_de: title,
    title_en: lang === "en" ? title : undefined,
    scope: scopeLabel,
    country: scopeLabel === "COUNTRY" || scopeLabel === "REGION" ? geo.country : undefined,
    region: scopeLabel === "REGION" ? geo.region : undefined,
  };
}

export default function LandingStart({ blocks, geo }: LandingStartProps) {
  const { locale } = useLocale();
  const lang = useMemo(() => normalizeLang(locale), [locale]);
  const [liveBlocks, setLiveBlocks] = useState<BucketBlock[]>(() => blocks);
  const [prefillText, setPrefillText] = useState("");
  const [showGate, setShowGate] = useState(false);
  const [gateAcknowledged, setGateAcknowledged] = useState(false);
  const pendingSubmitRef = useRef<null | (() => void)>(null);
  const pendingRefineRef = useRef<null | (() => void)>(null);

  useEffect(() => {
    try {
      if (window.localStorage.getItem("edb_prelaunch_gate_ack") === "1") {
        setGateAcknowledged(true);
      }
    } catch {
      // ignore
    }
  }, []);

  const handleIngest = useCallback(
    (scope: LandingScope, tiles: LandingTile[]) => {
      const label = SCOPE_TO_LABEL[scope];
      if (!label) return;
      setLiveBlocks((prev) =>
        prev.map((block) => {
          if (block.label !== label) return block;
          const seen = new Set(block.items.map((item) => item.title_de));
          const incoming = tiles
            .map((tile, idx) => tileToExample(tile, scope, geo, idx, lang))
            .filter((item): item is ExampleItem => Boolean(item))
            .filter((item) => {
              if (seen.has(item.title_de)) return false;
              seen.add(item.title_de);
              return true;
            });
          return {
            ...block,
            items: [...incoming, ...block.items].slice(0, 32),
          };
        }),
      );
    },
    [geo, lang],
  );

  const handleAnalyzeRequest = useCallback(
    (actions: { submit: () => void; refine: () => void }) => {
      if (gateAcknowledged) {
        actions.submit();
        return;
      }
      pendingSubmitRef.current = actions.submit;
      pendingRefineRef.current = actions.refine;
      setShowGate(true);
    },
    [gateAcknowledged],
  );

  const handleGateSubmit = useCallback(() => {
    setShowGate(false);
    setGateAcknowledged(true);
    try {
      window.localStorage.setItem("edb_prelaunch_gate_ack", "1");
    } catch {
      // ignore
    }
    const runSubmit = pendingSubmitRef.current;
    pendingSubmitRef.current = null;
    pendingRefineRef.current = null;
    runSubmit?.();
  }, []);

  const handleGateRefine = useCallback(() => {
    setShowGate(false);
    const runRefine = pendingRefineRef.current;
    pendingSubmitRef.current = null;
    pendingRefineRef.current = null;
    runRefine?.();
  }, []);

  const titleForLang = useCallback(
    (item: ExampleItem) => (lang === "en" ? item.title_en || item.title_de : item.title_de),
    [lang],
  );

  const ingestExample = useCallback(
    (item: ExampleItem) => {
      const title = titleForLang(item);
      const topics = lang === "en" ? item.topics_en || item.topics : item.topics;
      try {
        void fetch("/api/examples/ingest", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          keepalive: true,
          body: JSON.stringify({
            exampleId: item.id,
            lang,
            title,
            kind: item.kind,
            scope: item.scope,
            topics,
            country: item.country,
            region: item.region,
          }),
        });
      } catch {
        // ignore
      }
    },
    [lang, titleForLang],
  );

  return (
    <section className="relative min-h-screen overflow-x-hidden bg-slate-50 pb-16">
      <ExamplesMarqueeRows
        blocks={liveBlocks}
        lang={lang}
        onPick={(item) => setPrefillText(titleForLang(item))}
        onOpen={(item) => {
          const isVote = item.kind === "Abstimmung";
          const targetPath = isVote ? "/statements/new" : "/contribute";
          const title = titleForLang(item);
          ingestExample(item);
          void createDraftAndNavigate({
            kind: isVote ? "statement" : "topic",
            text: title,
            targetPath,
            fallbackPath: buildPrefillUrl(targetPath, title),
          });
        }}
      />

      <div className="relative z-10 mx-auto flex min-h-screen w-full max-w-5xl flex-col items-center justify-start px-4 py-10 sm:px-6 lg:justify-center lg:py-0">
        <div className="w-full max-w-4xl self-center">
          <LandingAssistant
            onIngest={handleIngest}
            prefillText={prefillText}
            onAnalyzeRequest={handleAnalyzeRequest}
            lang={lang}
          />
        </div>
      </div>

      <PrelaunchGateModal
        open={showGate}
        onClose={() => setShowGate(false)}
        lang={lang}
        onRefine={handleGateRefine}
        onSubmit={handleGateSubmit}
      />
    </section>
  );
}
