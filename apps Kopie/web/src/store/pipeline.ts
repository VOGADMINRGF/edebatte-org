"use client";
import { useSyncExternalStore } from "react";

export type Step = {
  id: string;
  label: string;
  status: "idle" | "run" | "ok" | "err";
  ms?: number;
  doneAt?: number;
};

/** ----- interner Zustand ----- */
const steps = new Map<string, Step>();
let analyzing = false;
let ready = false;

const subs = new Set<() => void>();
const emit = () => { subs.forEach(fn => { try { fn(); } catch {} }); };

/** ----- Snapshot-Typ & Cache ----- */
type Snapshot = { analyzing: boolean; ready: boolean; steps: Step[] };

/** Client-Snapshot (wird bei Änderungen neu berechnet, sonst wiederverwendet) */
let SNAP: Snapshot = { analyzing: false, ready: false, steps: [] };
function recalc() {
  SNAP = { analyzing, ready, steps: Array.from(steps.values()) };
}

/** Server-Snapshot (konstant, unveränderliche Referenz) */
const SSR_SNAPSHOT: Readonly<Snapshot> = Object.freeze({ analyzing: false, ready: false, steps: [] });

/** ----- Mutators / Accessors ----- */
export function setAnalyzing(v: boolean) { analyzing = v; if (!v) ready = true; recalc(); emit(); }
export function getAnalyzing() { return analyzing; }
export function getReady() { return ready; }

export function reset() {
  analyzing = false;
  ready = false;
  steps.clear();
  recalc();
  emit();
}

export function setStep(s: Step) {
  const prev = steps.get(s.id);
  const finished = s.status === "ok" || s.status === "err";
  steps.set(s.id, { ...prev, ...s, doneAt: finished ? (prev?.doneAt ?? Date.now()) : prev?.doneAt });
  recalc();
  emit();
}

/** ----- EAS-API ----- */
function subscribe(cb: () => void) { subs.add(cb); return () => subs.delete(cb); }
function getSnapshot() { return SNAP; }               // 🟢 stabil pro Render
function getServerSnapshot() { return SSR_SNAPSHOT; } // 🟢 immer gleich auf dem Server

/** ----- Hook ----- */
export function usePipeline() {
  return useSyncExternalStore(subscribe, getSnapshot, getServerSnapshot);
}
