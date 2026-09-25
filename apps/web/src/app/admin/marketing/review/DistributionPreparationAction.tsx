"use client";

import { useState } from "react";

type Props = {
  contentId: string;
  locale: "de" | "en";
};

type DistributionResponse = {
  ok: boolean;
  error?: string;
  blockers?: string[];
  post?: {
    id: string;
    status: string;
    publicBrand: "edebatte" | "voiceopengov" | "vote4gov";
    channels: string[];
    noAutoPublish: true;
    externalPosting: false;
  };
  unsupportedChannels?: string[];
};

const COPY = {
  de: {
    action: "Für Social-Distribution freigeben",
    pending: "Wird in die Social-Queue übernommen …",
    helper:
      "Übergibt diesen geprüften Inhalt in die bestehende review-first Social-Queue. Veröffentlichung und externe Ausspielung bleiben separat freigabepflichtig.",
    success: "In die Social-Queue übernommen",
    unsupported: "Noch nicht angeschlossene Kanäle",
    failed: "Übergabe nicht möglich",
  },
  en: {
    action: "Approve for social distribution",
    pending: "Adding to the social queue …",
    helper:
      "Moves this reviewed content into the existing review-first social queue. Publication and external posting still require separate approval.",
    success: "Added to the social queue",
    unsupported: "Channels not connected yet",
    failed: "Distribution handoff failed",
  },
} as const;

export default function DistributionPreparationAction({ contentId, locale }: Props) {
  const copy = COPY[locale];
  const [loading, setLoading] = useState(false);
  const [result, setResult] = useState<DistributionResponse | null>(null);

  async function prepareDistribution() {
    if (loading) return;
    setLoading(true);
    setResult(null);
    try {
      const response = await fetch(
        `/api/admin/marketing/review/items/${encodeURIComponent(contentId)}/distribution`,
        {
          method: "POST",
          headers: { "content-type": "application/json" },
          body: "{}",
        },
      );
      const payload = (await response.json()) as DistributionResponse;
      setResult(payload);
    } catch {
      setResult({ ok: false, error: "network_error" });
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="mt-5 rounded-2xl border border-sky-200 bg-sky-50/70 p-4 dark:border-sky-400/30 dark:bg-sky-400/10">
      <button
        type="button"
        onClick={prepareDistribution}
        disabled={loading || result?.ok === true}
        className="inline-flex rounded-xl bg-sky-700 px-3 py-2 text-sm font-semibold text-white hover:bg-sky-800 disabled:cursor-not-allowed disabled:opacity-60"
      >
        {loading ? copy.pending : result?.ok ? copy.success : copy.action}
      </button>
      <p className="mt-2 text-xs leading-5 text-[rgb(var(--muted))]">{copy.helper}</p>

      {result?.ok && result.post ? (
        <div className="mt-3 text-xs leading-5 text-emerald-900 dark:text-emerald-100" role="status">
          <strong>{copy.success}.</strong>{" "}
          <span>
            {result.post.publicBrand} · {result.post.status} · {result.post.channels.join(", ")}
          </span>
          {result.unsupportedChannels?.length ? (
            <p className="mt-1">
              {copy.unsupported}: {result.unsupportedChannels.join(", ")}
            </p>
          ) : null}
        </div>
      ) : null}

      {result && !result.ok ? (
        <p className="mt-3 text-xs leading-5 text-rose-800 dark:text-rose-200" role="alert">
          <strong>{copy.failed}.</strong>{" "}
          {[result.error, ...(result.blockers ?? [])].filter(Boolean).join(" · ")}
        </p>
      ) : null}
    </div>
  );
}
