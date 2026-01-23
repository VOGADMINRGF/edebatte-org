"use client";

import * as React from "react";
import type { Lang } from "@features/landing/landingCopy";
import { PRELAUNCH_GATE_COPY } from "./prelaunchGateCopy";

type PrelaunchGateModalProps = {
  lang: Lang;
  open: boolean;
  onClose: () => void;
  onRefine: () => void;
  onSubmit: () => void;
  preorderHref?: string;
};

export function PrelaunchGateModal({
  lang,
  open,
  onClose,
  onRefine,
  onSubmit,
  preorderHref = "/mitglied-werden",
}: PrelaunchGateModalProps) {
  if (!open) return null;
  const c = PRELAUNCH_GATE_COPY[lang];

  return (
    <div className="fixed inset-0 z-[80]">
      <div className="absolute inset-0 bg-black/30 backdrop-blur-sm" onClick={onClose} aria-hidden="true" />
      <div className="absolute inset-0 flex items-center justify-center p-4">
        <div className="w-full max-w-3xl overflow-hidden rounded-3xl border border-black/10 bg-white/92 shadow-2xl backdrop-blur-md">
          <div className="p-6 sm:p-8">
            <div className="flex items-start justify-between gap-4">
              <div>
                <div className="text-[11px] font-semibold tracking-[0.18em] text-slate-500">{c.brand}</div>
                <h2 className="mt-2 text-2xl font-extrabold text-slate-900">{c.title}</h2>
                <p className="mt-2 text-sm text-slate-600">{c.lead}</p>
                <ul className="mt-3 space-y-1 text-sm text-slate-600">
                  {c.bullets.map((b) => (
                    <li key={b}>• {b}</li>
                  ))}
                </ul>
              </div>
              <button
                type="button"
                className="rounded-full px-3 py-2 text-sm font-semibold text-slate-500 hover:bg-slate-100"
                onClick={onClose}
                aria-label="Close"
              >
                ✕
              </button>
            </div>

            <div className="mt-6 grid gap-4 md:grid-cols-2">
              <div className="rounded-2xl border border-slate-200 bg-white/80 p-5 shadow-sm">
                <p className="text-xs font-semibold uppercase tracking-[0.14em] text-slate-500">{c.refineTitle}</p>
                <p className="mt-2 text-sm font-semibold text-slate-700">{c.refineText}</p>
                <button
                  type="button"
                  className="mt-4 inline-flex w-full items-center justify-center rounded-full bg-slate-900 px-4 py-2.5 text-sm font-extrabold text-white shadow-sm hover:opacity-95"
                  onClick={() => {
                    onClose();
                    onRefine();
                  }}
                >
                  {c.refineCta} →
                </button>
              </div>

              <div className="rounded-2xl border border-slate-200 bg-white/80 p-5 shadow-sm">
                <p className="text-xs font-semibold uppercase tracking-[0.14em] text-slate-500">{c.submitTitle}</p>
                <p className="mt-2 text-sm font-semibold text-slate-700">{c.submitText}</p>
                <button
                  type="button"
                  className="mt-4 inline-flex w-full items-center justify-center rounded-full bg-[linear-gradient(135deg,rgba(26,140,255,1),rgba(24,207,200,1))] px-4 py-2.5 text-sm font-extrabold text-white shadow-[0_10px_24px_rgba(24,165,255,0.25)] hover:opacity-95"
                  onClick={() => {
                    onClose();
                    onSubmit();
                  }}
                >
                  {c.submitCta} →
                </button>
              </div>
            </div>

            <div className="mt-5">
              <div className="mb-3 flex items-center justify-between px-1">
                <p className="text-xs font-semibold uppercase tracking-[0.14em] text-slate-500">
                  {c.productsTitle}
                </p>
                <p className="text-[11px] text-slate-400">{c.productsHint}</p>
              </div>
              <div className="flex gap-4 overflow-x-auto pb-2 [-webkit-overflow-scrolling:touch] snap-x snap-mandatory">
                {c.products.map((product) => {
                  const isFree = product.id === "free";
                  const isPro = product.id === "pro";
                  const cardClassName = isFree
                    ? "rounded-2xl border border-sky-200 bg-white/95 p-5 shadow-sm ring-1 ring-sky-100"
                    : "rounded-2xl border border-slate-200 bg-white/80 p-5 shadow-sm";
                  const ctaClassName = isPro
                    ? "inline-flex w-full items-center justify-center rounded-full bg-[linear-gradient(135deg,rgba(26,140,255,1),rgba(24,207,200,1))] px-4 py-2.5 text-sm font-extrabold text-white shadow-[0_10px_24px_rgba(24,165,255,0.25)] hover:opacity-95"
                    : isFree
                      ? "inline-flex w-full items-center justify-center rounded-full bg-slate-900 px-4 py-2.5 text-sm font-extrabold text-white shadow-sm hover:opacity-95"
                      : "inline-flex w-full items-center justify-center rounded-full border border-slate-200 bg-white px-4 py-2.5 text-sm font-semibold text-slate-700 hover:bg-slate-100";
                  return (
                    <div
                      key={product.id}
                      className={`min-w-[240px] max-w-[280px] flex-1 snap-start ${cardClassName}`}
                    >
                      <p className="text-xs font-semibold uppercase tracking-[0.14em] text-slate-500">
                        {product.eyebrow}
                      </p>
                      <p className="mt-2 text-sm font-semibold text-slate-800">{product.title}</p>
                      <p className="mt-2 text-sm text-slate-600">{product.text}</p>
                      {product.note ? (
                        <p className="mt-2 text-xs font-semibold text-slate-600">{product.note}</p>
                      ) : null}
                      {product.id === "free" ? (
                        <button
                          type="button"
                          className={`${ctaClassName} mt-4`}
                          onClick={onClose}
                        >
                          {product.cta} →
                        </button>
                      ) : (
                        <a href={preorderHref} className={`${ctaClassName} mt-4`}>
                          {product.cta} →
                        </a>
                      )}
                    </div>
                  );
                })}
              </div>
            </div>

            <div className="mt-5 flex flex-wrap items-center justify-between gap-3">
              <a
                className="rounded-full border border-slate-200 bg-white px-4 py-2 text-sm font-semibold text-slate-600 hover:bg-slate-100"
                href="/kontakt"
              >
                {c.contactCta}
              </a>

              <button
                type="button"
                className="rounded-full border border-slate-200 bg-white px-4 py-2 text-sm font-semibold text-slate-700 hover:bg-slate-100"
                onClick={onClose}
              >
                {c.later}
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
