//features/map/components/MapClient.tsx
"use client";

import { useEffect, useMemo, useState } from "react";
import maplibregl from "maplibre-gl";
import { resolveTimeRange, type TimeRangeKey } from "@/utils/timeRange";

type MapPoint = {
  id: string;
  regionCode: string;
  regionName: string;
  claimCount: number;
  decisionCount: number;
  location?: { type: "Point"; coordinates: [number, number] } | null;
};

const STYLE_FALLBACK = "https://demotiles.maplibre.org/style.json";

export default function MapClient({ locale = "de" }: { locale?: string }) {
  const [map, setMap] = useState<maplibregl.Map | null>(null);
  const [points, setPoints] = useState<MapPoint[]>([]);
  const [bbox, setBbox] = useState<[number, number, number, number]>([13.3, 52.45, 13.6, 52.6]); // Berlin Demo
  const [timeRange, setTimeRange] = useState<TimeRangeKey>("90d");

  // Map container
  const containerId = useMemo(() => `map-${Math.random().toString(36).slice(2)}`, []);

  // Load points when bbox changes
  useEffect(() => {
    const q = new URLSearchParams({
      bbox: bbox.join(","),
      limit: "300",
      locale,
      timeRange,
    });
    fetch(`/api/map/points?${q.toString()}`, { cache: "no-store" })
      .then((r) => r.json())
      .then((j) => setPoints(j.points || []))
      .catch(() => {});
  }, [bbox, locale, timeRange]);

  // Init maplibre
  useEffect(() => {
    const el = document.getElementById(containerId);
    if (!el) return;

    const map = new maplibregl.Map({
      container: containerId,
      style: (process.env.NEXT_PUBLIC_MAP_STYLE_URL || process.env.MAP_STYLE_URL || STYLE_FALLBACK) as string,
      center: [(bbox[0] + bbox[2]) / 2, (bbox[1] + bbox[3]) / 2],
      zoom: 11,
    });

    map.addControl(new maplibregl.NavigationControl({ showCompass: false }), "top-left");

    // Track bbox updates
    map.on("moveend", () => {
      const b = map.getBounds();
      setBbox([b.getWest(), b.getSouth(), b.getEast(), b.getNorth()]);
    });

    setMap(map);
    return () => map.remove();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [containerId]);

  // Render points as simple markers (no cluster yet)
  useEffect(() => {
    if (!map) return;

    const id = "vog-points";
    const srcId = "vog-points-src";

    if (map.getLayer(id)) map.removeLayer(id);
    if (map.getSource(srcId)) map.removeSource(srcId);

    const withLocation = points.filter((p) => p.location);
    const fc = {
      type: "FeatureCollection",
      features: withLocation.map((p) => ({
        type: "Feature",
        geometry: { type: "Point", coordinates: p.location!.coordinates },
        properties: {
          title: p.regionName,
          regionCode: p.regionCode,
          claimCount: p.claimCount,
          decisionCount: p.decisionCount,
        },
      })),
    } as GeoJSON.FeatureCollection;

    map.addSource(srcId, { type: "geojson", data: fc });

    map.addLayer({
      id,
      type: "circle",
      source: srcId,
      paint: {
        "circle-radius": [
          "interpolate",
          ["linear"],
          ["get", "claimCount"],
          0,
          4,
          100,
          10,
          500,
          18,
        ],
        "circle-stroke-width": 1,
        "circle-stroke-color": "#ffffff",
        "circle-color": "#2563eb",
      },
    });

    return () => {
      if (map.getLayer(id)) map.removeLayer(id);
      if (map.getSource(srcId)) map.removeSource(srcId);
    };
  }, [map, points]);

  const rangeInfo = resolveTimeRange(timeRange);
  const topRegions = [...points]
    .sort((a, b) => b.claimCount - a.claimCount)
    .slice(0, 6);

  return (
    <div className="relative h-full w-full">
      <div id={containerId} style={{ width: "100%", height: "100%" }} />
      <div className="pointer-events-none absolute left-3 top-3 flex w-72 flex-col gap-2 rounded-2xl border border-white/60 bg-white/90 p-3 text-xs shadow-lg">
        <div className="flex items-center justify-between">
          <span className="text-[11px] font-semibold uppercase text-slate-500">Zeitraum</span>
          <select
            className="pointer-events-auto rounded-full border border-slate-200 px-3 py-1 text-xs"
            value={timeRange}
            onChange={(e) => setTimeRange(e.target.value as TimeRangeKey)}
          >
            <option value="30d">30 Tage</option>
            <option value="90d">90 Tage</option>
            <option value="365d">12 Monate</option>
            <option value="all">Gesamter Zeitraum</option>
          </select>
        </div>
        <p className="text-[11px] text-slate-500">{rangeInfo.label}</p>
        <div className="text-[11px] font-semibold uppercase text-slate-500">Top-Regionen</div>
        <div className="pointer-events-auto space-y-1">
          {topRegions.length === 0 ? (
            <p className="text-[11px] text-slate-400">Noch keine Daten.</p>
          ) : (
            topRegions.map((region) => (
              <div key={region.id} className="flex items-center justify-between rounded-xl bg-slate-100/80 px-2 py-1">
                <div className="flex flex-col">
                  <span className="text-xs font-semibold text-slate-800">{region.regionName}</span>
                  <span className="text-[10px] text-slate-500">{region.regionCode}</span>
                </div>
                <div className="text-right">
                  <span className="block text-xs font-semibold text-slate-900">{region.claimCount}</span>
                  <span className="text-[10px] text-slate-500">Claims</span>
                </div>
              </div>
            ))
          )}
        </div>
        <div>
          <p className="text-[11px] font-semibold uppercase text-slate-500">Legende</p>
          <div className="mt-1 flex items-center gap-2 text-[11px] text-slate-500">
            <span className="inline-flex h-3 w-3 rounded-full bg-slate-300" />
            wenige Claims
            <span className="ml-auto inline-flex h-4 w-4 rounded-full bg-slate-900" />
            viele Claims
          </div>
        </div>
      </div>
    </div>
  );
}
