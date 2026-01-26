"use client";

import * as React from "react";
import type { ExampleItem, ExampleStats } from "@/lib/examples/types";
import { LANDING_COPY, type Lang } from "@features/landing/landingCopy";
import { LandingKindIcon } from "./LandingKindIcon";
import { StateCrestBadge } from "./StateCrestBadge";
import { STATE_CRESTS } from "./stateCrests";

const WORLD_FLAG = String.fromCodePoint(0x1f30d);
const EU_FLAG = String.fromCodePoint(0x1f1ea, 0x1f1fa);
const REGION_PLACE = "🏘️";

const TOPIC_TONES = [
  "border-sky-200/80 bg-sky-100/70 text-sky-700",
  "border-cyan-200/80 bg-cyan-100/70 text-cyan-700",
  "border-indigo-200/80 bg-indigo-100/70 text-indigo-700",
  "border-blue-200/80 bg-blue-100/70 text-blue-700",
  "border-teal-200/80 bg-teal-100/70 text-teal-700",
];

function stableHash(input: string) {
  let h = 2166136261;
  for (let i = 0; i < input.length; i += 1) {
    h ^= input.charCodeAt(i);
    h = Math.imul(h, 16777619);
  }
  return h >>> 0;
}

function topicTone(topic: string) {
  const idx = stableHash(topic) % TOPIC_TONES.length;
  return TOPIC_TONES[idx];
}

type LocationBadge =
  | { kind: "crest"; label: string; regionCode: string }
  | { kind: "emoji"; label: string; emoji: string };

function countryToFlagEmoji(countryCode: string) {
  const cc = (countryCode ?? "").toUpperCase();
  if (cc.length !== 2) return "🏳️";
  const A = "A".charCodeAt(0);
  return String.fromCodePoint(
    0x1f1e6 + (cc.charCodeAt(0) - A),
    0x1f1e6 + (cc.charCodeAt(1) - A),
  );
}

function resolveRegionCode(item: ExampleItem) {
  if (!item.region) return null;
  const region = item.region.trim();
  const country = item.country?.toUpperCase();

  if (country === "DE") {
    const code = toDeStateCode(region);
    if (code) return code;
  }

  const upper = region.toUpperCase();
  if (upper.includes("-")) return upper;
  if (country && country.length === 2) {
    return `${country}-${upper}`;
  }
  return upper;
}

const DE_STATE_MAP: Record<string, string> = {
  "baden-württemberg": "DE-BW",
  "baden-wuerttemberg": "DE-BW",
  badenwurttemberg: "DE-BW",
  bayern: "DE-BY",
  bavaria: "DE-BY",
  berlin: "DE-BE",
  brandenburg: "DE-BB",
  bremen: "DE-HB",
  hamburg: "DE-HH",
  hessen: "DE-HE",
  "mecklenburg-vorpommern": "DE-MV",
  mecklenburgvorpommern: "DE-MV",
  niedersachsen: "DE-NI",
  "nordrhein-westfalen": "DE-NW",
  nordrheinwestfalen: "DE-NW",
  "rheinland-pfalz": "DE-RP",
  rheinlandpfalz: "DE-RP",
  saarland: "DE-SL",
  sachsen: "DE-SN",
  "sachsen-anhalt": "DE-ST",
  sachsenanhalt: "DE-ST",
  "schleswig-holstein": "DE-SH",
  schleswigholstein: "DE-SH",
  thüringen: "DE-TH",
  thueringen: "DE-TH",
  thuringia: "DE-TH",
};

function toDeStateCode(region?: string | null) {
  const key = (region ?? "").trim().toLowerCase();
  return DE_STATE_MAP[key];
}

function locationBadge(item: ExampleItem): LocationBadge {
  if (item.scope === "WORLD")
    return { kind: "emoji", emoji: WORLD_FLAG, label: "WORLD" };

  if (item.scope === "EU")
    return { kind: "emoji", emoji: EU_FLAG, label: "EU" };

  if (item.scope === "REGION") {
    const regionCode = resolveRegionCode(item);
    const crest = regionCode ? STATE_CRESTS[regionCode] : undefined;

    if (crest && regionCode) {
      return { kind: "crest", label: crest.name, regionCode };
    }

    const label = item.region ?? "Region";
    return { kind: "emoji", emoji: REGION_PLACE, label };
  }

  if (item.country) {
    const label = item.region ? `${item.country}-${item.region}` : item.country;
    return { kind: "emoji", emoji: countryToFlagEmoji(item.country), label };
  }

  return { kind: "emoji", emoji: WORLD_FLAG, label: "GLOBAL" };
}

function formatCompact(n?: number) {
  if (n == null) return null;
  if (n >= 1_000_000) return `${Math.round(n / 100_000) / 10}M`;
  if (n >= 1_000) return `${Math.round(n / 100) / 10}k`;
  return `${n}`;
}

function deriveStats(item: ExampleItem): ExampleStats {
  if (item.stats) return item.stats;
  const base = stableHash(`${item.id}:${item.title_de}`);
  const participants = 280 + (base % 12_400);
  const votes = item.kind === "Abstimmung" ? Math.round(participants * (1.3 + (base % 25) / 100)) : undefined;
  const updatedHoursAgo = (base % 24) + 1;
  return { participants, votes, updatedHoursAgo };
}

export function ExampleSnippetCard(props: {
  item: ExampleItem;
  lang: Lang;
  onPick?: (item: ExampleItem) => void;
  onOpen?: (item: ExampleItem) => void;
  compact?: boolean;
}) {
  const { item, compact, lang } = props;
  const t = LANDING_COPY[lang];
  const title = lang === "en" ? item.title_en || item.title_de : item.title_de;
  const topics = lang === "en" ? item.topics_en || item.topics : item.topics;
  const kindLabel = item.kind === "Abstimmung" ? t.cards.kindVote : t.cards.kindTopic;
  const isVote = item.kind === "Abstimmung";
  const stats = deriveStats(item);
  const votes = formatCompact(stats.votes);
  const participants = formatCompact(stats.participants);
  const hours = stats.updatedHoursAgo;
  const badge = locationBadge(item);
  const canPick = !!props.onPick;
  const canOpen = !!props.onOpen;
  const interactive = canPick || canOpen;

  return (
    <div
      className={[
        "rounded-2xl border border-white/60 bg-gradient-to-br from-white/95 via-white/90 to-sky-50/80",
        "shadow-[0_12px_40px_rgba(15,23,42,0.12)]",
        "px-4 py-3",
        "backdrop-blur-[3px]",
        interactive ? "transition hover:-translate-y-[1px] hover:shadow-[0_18px_50px_rgba(15,23,42,0.16)]" : "",
        interactive ? "pointer-events-auto" : "pointer-events-none",
        interactive ? "cursor-pointer" : "",
      ].join(" ")}
      role={interactive ? "button" : undefined}
      tabIndex={interactive ? 0 : -1}
      onClick={() => {
        if (canOpen) {
          props.onOpen?.(item);
          return;
        }
        if (canPick) props.onPick?.(item);
      }}
      onKeyDown={(e) => {
        if (!interactive) return;
        if (e.key === "Enter" || e.key === " ") {
          if (canOpen) {
            props.onOpen?.(item);
            return;
          }
          props.onPick?.(item);
        }
      }}
    >
      <div className="mb-2 flex flex-wrap items-center gap-2">
        <span className="inline-flex items-center gap-2 rounded-full border border-black/10 bg-white/85 px-2.5 py-1 text-[11px] font-semibold text-black/65">
          {badge.kind === "crest" ? (
            <StateCrestBadge regionCode={badge.regionCode} size={14} className="shrink-0" />
          ) : (
            <span aria-hidden="true">{badge.emoji}</span>
          )}
          <span>{badge.label}</span>
        </span>
        <span
          className={`inline-flex items-center gap-1.5 rounded-full border px-2.5 py-1 text-[11px] font-semibold ${
            isVote
              ? "border-sky-200 bg-sky-100 text-sky-700"
              : "border-cyan-200 bg-cyan-100 text-cyan-700"
          }`}
        >
          <LandingKindIcon kind={isVote ? "vote" : "topic"} className="h-3.5 w-3.5" />
          {kindLabel}
        </span>
        {topics.slice(0, compact ? 1 : 2).map((topic) => (
          <span
            key={topic}
            className={`inline-flex items-center rounded-full border px-2.5 py-1 text-[11px] font-semibold ${topicTone(
              topic,
            )}`}
          >
            {topic}
          </span>
        ))}
      </div>

      <div className="line-clamp-2 text-sm font-semibold text-black/80">{title}</div>

      <div className="mt-2 flex items-center justify-between text-[11px] text-black/45">
        <div className="flex items-center gap-3">
          {participants && (
            <span>
              {t.cards.participants} {participants}
            </span>
          )}
          {votes && (
            <span>
              {t.cards.votes} {votes}
            </span>
          )}
        </div>
        {typeof hours === "number" && <span>{t.cards.activeAgo(hours)}</span>}
      </div>

    </div>
  );
}
