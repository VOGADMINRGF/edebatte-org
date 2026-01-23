import * as React from "react";
import type { RunReceipt } from "@features/analyze/schemas";

function short(h?: string, n = 10): string {
  if (!h) return "";
  return h.length > n ? `${h.slice(0, n)}...` : h;
}

export default function RunReceiptPanel({ receipt }: { receipt: RunReceipt }) {
  return (
    <div className="rounded-xl border border-slate-200/70 bg-white/70 p-3 shadow-sm">
      <div className="flex items-start justify-between gap-2">
        <div>
          <div className="text-[11px] font-semibold uppercase tracking-wide text-slate-500">RunReceipt</div>
          <div className="text-sm font-medium text-slate-900">{receipt.id}</div>
          <div className="text-xs text-slate-600">
            {receipt.pipelineVersion} / {receipt.createdAt}
          </div>
        </div>
        <div className="text-right text-xs text-slate-500">
          {receipt.provider ? <div>{receipt.provider}</div> : null}
          {receipt.model ? <div>{receipt.model}</div> : null}
          {receipt.promptVersion ? <div>prompt {receipt.promptVersion}</div> : null}
        </div>
      </div>

      <div className="mt-3 grid gap-2 text-[11px] text-slate-700 sm:grid-cols-2">
        <div className="rounded-lg border border-slate-200 bg-white p-2">
          <div className="text-slate-500">receiptHash</div>
          <div className="font-mono">{short(receipt.receiptHash, 22)}</div>
        </div>
        <div className="rounded-lg border border-slate-200 bg-white p-2">
          <div className="text-slate-500">snapshotId</div>
          <div className="font-mono">{short(receipt.snapshotId, 22)}</div>
        </div>
        <div className="rounded-lg border border-slate-200 bg-white p-2">
          <div className="text-slate-500">inputHash</div>
          <div className="font-mono">{short(receipt.inputHash, 22)}</div>
        </div>
        <div className="rounded-lg border border-slate-200 bg-white p-2">
          <div className="text-slate-500">sourcesHash</div>
          <div className="font-mono">{short(receipt.sourcesHash, 22)}</div>
        </div>
      </div>

      <div className="mt-3 text-xs text-slate-600">
        Quellen (metadata): {receipt.sourceSet?.length ?? 0} / Policy: no full text, no snippets
      </div>
    </div>
  );
}
