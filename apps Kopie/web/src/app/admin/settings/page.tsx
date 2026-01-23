"use client";
import { useState } from "react";
import { adminConfig, type AdminConfig } from "@/config/admin-config";

const num = (v: string) => (Number.isFinite(Number(v)) ? Number(v) : 0);

export default function AdminSettingsPage() {
 
;  const [cfg, setCfg] = useState<AdminConfig>(adminConfig);
  function num(v: string) { return Number(v) || 0; }
  return (
    <div className="p-6 max-w-2xl mx-auto">
      <h1 className="text-2xl font-bold">Admin – Einstellungen</h1>
      <p className="mt-1 text-sm text-slate-600">Kosten & Limits live justieren.</p>

      <section className="mt-6 space-y-4">
        <div>
          <label className="block text-sm font-medium">Mitgliedschaft (€/Monat)</label>
          <input className="mt-1 w-full border rounded px-3 py-2" defaultValue={cfg.pricing.membershipMonthlyEUR}
            onChange={(e)=>setCfg({...cfg, pricing:{...cfg.pricing, membershipMonthlyEUR: num(e.target.value)}})} />
        </div>
        <div>
          <label className="block text-sm font-medium">Sofort-Beitrag (€/Post)</label>
          <input className="mt-1 w-full border rounded px-3 py-2" defaultValue={cfg.pricing.postImmediateEUR}
            onChange={(e)=>setCfg({...cfg, pricing:{...cfg.pricing, postImmediateEUR: num(e.target.value)}})} />
        </div>
        <div>
          <label className="block text-sm font-medium">Swipe→Post Schwellen (Kommagetrennt)</label>
          <input className="mt-1 w-full border rounded px-3 py-2" defaultValue={cfg.pricing.swipeToPostThresholds.join(",")}
            onChange={(e)=>setCfg({...cfg, pricing:{...cfg.pricing, swipeToPostThresholds: e.target.value.split(",").map(x=>Number(x.trim())||0)}})} />
        </div>
        <div className="grid grid-cols-2 gap-4">
          <div>
            <label className="block text-sm font-medium">Newsfeed Max/Run</label>
            <input className="mt-1 w-full border rounded px-3 py-2" defaultValue={cfg.limits.newsfeedMaxPerRun}
              onChange={(e)=>setCfg({...cfg, limits:{...cfg.limits, newsfeedMaxPerRun: num(e.target.value)}})} />
          </div>
          <div>
            <label className="block text-sm font-medium">Factcheck Token-Limit</label>
            <input className="mt-1 w-full border rounded px-3 py-2" defaultValue={cfg.limits.factcheckMaxPerItemTokens}
              onChange={(e)=>setCfg({...cfg, limits:{...cfg.limits, factcheckMaxPerItemTokens: num(e.target.value)}})} />
          </div>
        </div>
        <div className="flex items-center gap-2">
          <input id="autopost" type="checkbox" defaultChecked={cfg.limits.enableAutoPost}
            onChange={(e)=>setCfg({...cfg, limits:{...cfg.limits, enableAutoPost: e.target.checked}})} />
          <label htmlFor="autopost" className="text-sm">Auto‑Draft für neue Themen aktiv</label>
        </div>
        <div>
          <label className="block text-sm font-medium">Standard‑Region (Key)</label>
          <input className="mt-1 w-full border rounded px-3 py-2" defaultValue={cfg.region.defaultRegionKey}
            onChange={(e)=>setCfg({...cfg, region:{...cfg.region, defaultRegionKey: e.target.value}})} />
        </div>
      </section>

      <button className="mt-6 btn-accent px-4 py-2 rounded">Speichern (env‑basiert)</button>
      <p className="text-xs text-slate-500 mt-2">Hinweis: Werte werden aus ENV gelesen. Persistenz via Admin‑API ergänzen.</p>
    </div>
  );
}
