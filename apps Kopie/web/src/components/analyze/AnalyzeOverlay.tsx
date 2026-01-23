"use client";
import { motion, AnimatePresence } from "framer-motion";
import React from "react";
export type Step = { id:number; title:string; status:"idle"|"running"|"done"|"error" };

export function AnalyzeOverlay({ steps, text, activeSentenceIndex }:{
  steps:Step[]; text:string; activeSentenceIndex:number
}) {
  const sentences = text.split(/(?<=[.!?])\s+/).filter(Boolean);
  return (
    <div className="fixed inset-0 pointer-events-none z-50 p-4 sm:p-8">
      <div className="mx-auto max-w-5xl bg-black/70 text-white rounded-2xl shadow-xl p-4 sm:p-6 backdrop-blur">
        <div className="flex flex-col gap-3 sm:gap-4">
          <div className="text-lg sm:text-xl font-semibold">Aktivität</div>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="space-y-2">
              {steps.map(s => (
                <div key={s.id} className="flex items-center gap-2 text-sm">
                  <div className={
                    s.status === "running" ? "w-2 h-2 rounded-full bg-white animate-pulse" :
                    s.status === "done"    ? "w-2 h-2 rounded-full bg-green-400" :
                    s.status === "error"   ? "w-2 h-2 rounded-full bg-red-400"   :
                                             "w-2 h-2 rounded-full bg-gray-400"
                  }/>
                  <div className={s.status === "running" ? "font-semibold" : ""}>{s.title}</div>
                </div>
              ))}
            </div>
            <div className="bg-white text-black rounded-lg p-3 text-sm overflow-hidden">
              <AnimatePresence initial={false}>
                <motion.div
                  key={activeSentenceIndex}
                  initial={{ opacity: 0, y: 8 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0, y: -8 }}
                  transition={{ duration: 0.25 }}
                  className="min-h-[64px]"
                >
                  <span>
                    {sentences.map((s, i) => (
                      <mark key={i} className={
                        "rounded px-1 " + (i === activeSentenceIndex ? "bg-yellow-200" : "bg-transparent")
                      }>{s + (i < sentences.length-1 ? " " : "")}</mark>
                    ))}
                  </span>
                </motion.div>
              </AnimatePresence>
              <div className="mt-3 text-xs text-gray-600">Live-Analyse – hervorgehoben = aktueller Schritt</div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
