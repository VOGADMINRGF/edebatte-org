"use client";
import React from "react";

export type Hints = {
  level?: "eu" | "bund" | "land" | "kommune" | null;
  regions?: string[]; // Mehrfach
  timeframe?: "aktuell" | "letzte12" | "letzte5" | "seit1990" | "unsicher" | null;
  audience?: string[]; // Mehrfach (buerger, unternehmen, staat, kinder, rentner)
  stance?: "pro" | "neutral" | "contra" | "unsicher" | null;
  other?: string;
};

function toggle(list: string[], v: string) {
  return list.includes(v) ? list.filter((x) => x !== v) : [...list, v];
}
function stripBundesweit(regions: string[]) {
  return regions.filter((x) => x !== "bundesweit");
}
const chip = (active: boolean) => "vog-chip " + (active ? "ring-2 ring-sky-400" : "");

const DE_STATES = [
  "Baden-Württemberg",
  "Bayern",
  "Berlin",
  "Brandenburg",
  "Bremen",
  "Hamburg",
  "Hessen",
  "Mecklenburg-Vorpommern",
  "Niedersachsen",
  "Nordrhein-Westfalen",
  "Rheinland-Pfalz",
  "Saarland",
  "Sachsen",
  "Sachsen-Anhalt",
  "Schleswig-Holstein",
  "Thüringen",
];

export default function ClarifyPanel({
  text,
  value,
  onChange,
}: {
  text: string;
  value: Hints;
  onChange: (v: Hints) => void;
}) {
  const [othersOpen, setOthersOpen] = React.useState(false);
  const [regionInputOpen, setRegionInputOpen] = React.useState(false);
  const [regionInput, setRegionInput] = React.useState("");
  const [statePickerOpen, setStatePickerOpen] = React.useState(false);

  // Auto-Vorschlag (debounced)
  React.useEffect(()=>{
    if(!text.trim()) return;
    const ac = new AbortController();
    const t = setTimeout(async()=>{
      try{
        const r = await fetch("/api/quality/clarify",{
          method:"POST",
          headers:{ "content-type":"application/json" },
          body: JSON.stringify({ text }),
          signal: ac.signal
        });
        const j = await r.json().catch(()=>null);
        if(j?.ok && j?.hints){
          const next:Hints = { ...(value||{}) };
          next.level ??= j.hints.level ?? null;
          if((!next.regions || next.regions.length===0) && j.hints.region){ next.regions=[j.hints.region]; }
          next.timeframe ??= j.hints.timeframe ?? null;
          next.stance ??= j.hints.stance ?? null;
          if((!next.audience || next.audience.length===0) && j.hints.audience){ next.audience=[j.hints.audience]; }
          onChange(next);
        }
      }catch{}
    }, 350);
    return ()=>{ clearTimeout(t); ac.abort(); };
  }, [text, onChange, value]);

  const v: Hints = {
    level: value?.level ?? null,
    regions: Array.isArray(value?.regions) ? value!.regions! : [],
    timeframe: value?.timeframe ?? null,
    audience: Array.isArray(value?.audience) ? value!.audience! : [],
    stance: value?.stance ?? null,
    other: value?.other ?? "",
  };

  const setRegions = (next: string[]) => {
    onChange({ ...v, regions: Array.from(new Set(next)) });
  };

  const toggleRegion = (label: string) => {
    const trimmed = label.trim();
    if (!trimmed) return;
    const base = stripBundesweit(v.regions || []);
    setRegions(toggle(base, trimmed));
  };

  const addRegion = (label: string) => {
    const trimmed = label.trim();
    if (!trimmed) return;
    const base = stripBundesweit(v.regions || []);
    setRegions([...base, trimmed]);
  };

  const setBundesweitExclusive = () => {
    const active = (v.regions || []).includes("bundesweit");
    setRegions(active ? [] : ["bundesweit"]);
    setRegionInputOpen(false);
    setStatePickerOpen(false);
  };

  return (
    <div className="space-y-3">
      <div className="text-slate-500 text-sm">Optional präzisieren (für bessere Ergebnisse):</div>

      <div className="space-y-2">
        <div className="text-xs text-slate-500">EBENE/ZUSTÄNDIGKEIT <span className="text-slate-400">(Mehrfach möglich)</span></div>
        {["eu","bund","land","kommune"].map(k=>(
          <button
            type="button"
            key={k}
            className={chip(v.level===k)}
            onClick={()=>onChange({ ...v, level: v.level===k ? null : (k as any) })}
          >
            {k==="eu"?"EU":k[0].toUpperCase()+k.slice(1)}
          </button>
        ))}
        <button
          type="button"
          className={chip(v.level===null)}
          onClick={()=>onChange({ ...v, level:null })}
        >
          Unsicher
        </button>
      </div>

      <div className="space-y-2">
        <div className="text-xs text-slate-500">ORT/REGION <span className="text-slate-400">(Mehrfach möglich)</span></div>
        <button
          className={chip(v.regions!.includes("bundesweit"))}
          type="button"
          onClick={setBundesweitExclusive}
        >
          Bundesweit
        </button>
        <button
          className={chip(v.regions!.some((x) => x !== "bundesweit"))}
          type="button"
          onClick={() => {
            setRegionInputOpen((s) => !s);
            setStatePickerOpen(false);
          }}
        >
          Stadt/Region…
        </button>
        <button
          className={chip(v.regions!.some((x) => DE_STATES.includes(x)))}
          type="button"
          onClick={() => {
            setStatePickerOpen((s) => !s);
            setRegionInputOpen(false);
          }}
        >
          Bundesland…
        </button>
        <button
          type="button"
          className={chip(v.regions!.length===0)}
          onClick={()=>onChange({ ...v, regions: [] })}
        >
          Unsicher
        </button>
        {regionInputOpen && (
          <div className="flex flex-wrap gap-2 pt-1">
            <input
              className="border rounded-xl px-3 py-1.5 text-sm"
              placeholder="Stadt oder Region"
              value={regionInput}
              onChange={(e) => setRegionInput(e.target.value)}
            />
            <button
              type="button"
              className="vog-btn"
              onClick={() => {
                addRegion(regionInput);
                setRegionInput("");
              }}
            >
              Hinzufügen
            </button>
          </div>
        )}
        {statePickerOpen && (
          <div className="flex flex-wrap gap-2 pt-1">
            {DE_STATES.map((state) => (
              <button
                type="button"
                key={state}
                className={chip(v.regions!.includes(state))}
                onClick={() => toggleRegion(state)}
              >
                {state}
              </button>
            ))}
          </div>
        )}
      </div>

      <div className="space-y-2">
        <div className="text-xs text-slate-500">ZEITRAUM</div>
        {[
          ["aktuell","Aktuell"],
          ["letzte12","Letzte 12 Monate"],
          ["letzte5","Letzte 5 Jahre"],
          ["seit1990","Seit 1990"],
          ["unsicher","Unsicher"],
        ].map(([k,lab])=>(
          <button
            type="button"
            key={k}
            className={chip(v.timeframe===k)}
            onClick={()=>onChange({ ...v, timeframe:k as any })}
          >
            {lab}
          </button>
        ))}
      </div>

      <div className="space-y-2">
        <div className="text-xs text-slate-500">BETROFFENE</div>
        {[
          ["buerger","Bürger*innen"],
          ["unternehmen","Unternehmen"],
          ["staat","Staat/Verwaltung"],
          ["kinder","Kinder/Jugendliche"],
          ["rentner","Rentner*innen"],
        ].map(([k,lab])=>(
          <button
            type="button"
            key={k}
            className={chip(v.audience!.includes(k))}
            onClick={()=>onChange({ ...v, audience: toggle(v.audience!, k) })}
          >
            {lab}
          </button>
        ))}
        <button
          type="button"
          className={chip((v.audience||[]).length===0)}
          onClick={()=>onChange({ ...v, audience: [] })}
        >
          Unsicher
        </button>
      </div>

      <div className="space-y-2">
        <div className="text-xs text-slate-500">HALTUNG (optional)</div>
        {["pro","neutral","contra","unsicher"].map(k=>(
          <button
            type="button"
            key={k}
            className={chip(v.stance===k)}
            onClick={()=>onChange({ ...v, stance: v.stance===k ? null : (k as any) })}
          >
            {k[0].toUpperCase()+k.slice(1)}
          </button>
        ))}
      </div>

      <div className="space-y-2">
        <button
          type="button"
          className={chip(!!v.other || othersOpen)}
          onClick={()=>setOthersOpen(s=>!s)}
        >
          Sonstiges…
        </button>
        {othersOpen && (
          <input className="border rounded-xl px-3 py-2 w-full" placeholder="Optional ergänzen …"
            value={v.other ?? ""} onChange={e=>onChange({ ...v, other:e.target.value })}/>
        )}
      </div>
    </div>
  );
}
