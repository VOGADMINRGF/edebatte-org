"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import { SUPPORTED_LOCALES } from "@/config/locales";
import { VOXY_VIDEO_FORMATS } from "@/features/voxyVideo/modernCharacterContracts";
import { VOXY_STUDIO_SAFE_ZONE_PROFILES } from "@/features/voxyVideo/studioDraft";

type StudioItem = {
  draft: {
    draftId: string;
    revision: number;
    dossierId: string | null;
    briefingId: string;
    title: string;
    status: string;
    selectedFormat: string;
    safeZoneProfile: string;
    storyPlan: {
      storyPlanId: string;
      revision: number;
      locale: string;
      outputLanguage: string;
      durationClass: string;
      archetype: string;
      chapters: Array<{
        chapterId: string;
        role: string;
        headline: string;
        narration: string;
        sourceIds: string[];
        openQuestionIds: string[];
      }>;
    };
  };
  validation: {
    errors: string[];
    approvalBlockers: string[];
    warnings: string[];
    renderEligible: boolean;
  };
  reviewItemId: string;
  decisionGateId: string;
  reviewRecord: {
    operationalStatus: string;
    latestAction: string | null;
    latestActionByUserId: string | null;
    latestActionAt: string | null;
  } | null;
};

type StudioResponse = {
  ok: boolean;
  items: StudioItem[];
  persistence: {
    drafts: { mode: string; productionTruth: boolean };
    editorialReview: { mode: string; productionTruth: boolean };
  };
  runtime: {
    editorialLongformRenderEnabled: boolean;
    reason: string;
    autoRender: false;
    autoPublish: false;
  };
};

const STATUS_LABELS: Record<string, string> = {
  draft: "Entwurf",
  needs_review: "Redaktion prüfen",
  needs_changes: "Änderungen nötig",
  approved_for_render: "Für Render freigegeben",
  rendered: "Gerendert",
  approved_for_publish: "Für Veröffentlichung freigegeben",
};

function compactReason(value: string) {
  return value.replaceAll("_", " ").replaceAll(":", " · ");
}

export default function VoxyStudioOperator() {
  const [data, setData] = useState<StudioResponse | null>(null);
  const [loading, setLoading] = useState(true);
  const [busy, setBusy] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [noteByDraft, setNoteByDraft] = useState<Record<string, string>>({});
  const [createForm, setCreateForm] = useState({
    dossierId: "",
    briefingId: "",
    title: "",
    locale: "de",
    selectedFormat: "16:9",
    safeZoneProfile: "video",
  });

  const load = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const response = await fetch("/api/admin/voxy-studio?limit=50", {
        cache: "no-store",
      });
      const payload = await response.json().catch(() => null);
      if (!response.ok || !payload?.ok) {
        throw new Error(payload?.error || "voxy_studio_not_loaded");
      }
      setData(payload as StudioResponse);
    } catch (caught) {
      setError(caught instanceof Error ? caught.message : "voxy_studio_not_loaded");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    void load();
  }, [load]);

  const persistent = useMemo(
    () =>
      data?.persistence?.drafts?.mode === "persistent_primary" &&
      data?.persistence?.editorialReview?.mode === "persistent_primary",
    [data],
  );

  async function createDraft() {
    if (
      !createForm.dossierId.trim() ||
      !createForm.briefingId.trim() ||
      !createForm.title.trim() ||
      busy
    ) {
      return;
    }
    setBusy("create");
    setError(null);
    try {
      const response = await fetch("/api/admin/voxy-studio", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({
          ...createForm,
          clientRequestId: `admin-${Date.now()}`,
        }),
      });
      const payload = await response.json().catch(() => null);
      if (!response.ok || !payload?.ok) {
        throw new Error(payload?.error || "voxy_studio_draft_not_created");
      }
      setCreateForm((current) => ({ ...current, title: "" }));
      await load();
    } catch (caught) {
      setError(caught instanceof Error ? caught.message : "voxy_studio_draft_not_created");
    } finally {
      setBusy(null);
    }
  }

  async function reviewAction(
    item: StudioItem,
    action: "submit_for_review" | "mark_in_review" | "request_changes" | "mark_ready",
  ) {
    if (busy) return;
    const note = noteByDraft[item.draft.draftId]?.trim() || null;
    if (action === "request_changes" && !note) {
      setError("Für Änderungsbedarf ist ein konkreter Review-Hinweis erforderlich.");
      return;
    }
    setBusy(`${item.draft.draftId}:${action}`);
    setError(null);
    try {
      const response = await fetch(
        `/api/admin/voxy-studio/${encodeURIComponent(item.draft.draftId)}/review`,
        {
          method: "POST",
          headers: { "content-type": "application/json" },
          body: JSON.stringify({
            action,
            expectedRevision: item.draft.revision,
            note,
          }),
        },
      );
      const payload = await response.json().catch(() => null);
      if (!response.ok || !payload?.ok) {
        const blockers = payload?.validation?.approvalBlockers;
        throw new Error(
          Array.isArray(blockers) && blockers.length
            ? `Renderfreigabe blockiert: ${blockers.join(", ")}`
            : payload?.error || "voxy_studio_review_action_failed",
        );
      }
      setNoteByDraft((current) => ({ ...current, [item.draft.draftId]: "" }));
      await load();
    } catch (caught) {
      setError(caught instanceof Error ? caught.message : "voxy_studio_review_action_failed");
    } finally {
      setBusy(null);
    }
  }

  return (
    <div className="space-y-5">
      <section className="rounded-2xl border border-[rgb(var(--border))] bg-[rgb(var(--card))] p-5 shadow-sm">
        <p className="text-xs font-semibold uppercase tracking-[0.14em] text-sky-700 dark:text-sky-300">
          Voxy · Editorial Engine
        </p>
        <h1 className="mt-2 text-2xl font-semibold text-[rgb(var(--fg))]">
          Admin Video Studio
        </h1>
        <p className="mt-2 max-w-4xl text-sm leading-6 text-[rgb(var(--muted))]">
          Hier wird aus bestehender Dossier-Wahrheit ein revisionsgebundener Voxy-Entwurf. Die
          redaktionelle Freigabe läuft über denselben persistenten Review-Operations-Store wie die
          zentrale Review Queue. Render, Upload, Scheduling und Publishing werden nicht automatisch ausgelöst.
        </p>
        <div className="mt-4 grid gap-3 text-sm md:grid-cols-3">
          <div className="rounded-xl border border-[rgb(var(--border))] bg-[rgb(var(--bg))] p-3">
            <p className="font-semibold text-[rgb(var(--fg))]">Draft-Persistenz</p>
            <p className="mt-1 text-[rgb(var(--muted))]">
              {data?.persistence?.drafts?.mode ?? "wird geladen"}
            </p>
          </div>
          <div className="rounded-xl border border-[rgb(var(--border))] bg-[rgb(var(--bg))] p-3">
            <p className="font-semibold text-[rgb(var(--fg))]">Editorial Review</p>
            <p className="mt-1 text-[rgb(var(--muted))]">
              {data?.persistence?.editorialReview?.mode ?? "wird geladen"}
            </p>
          </div>
          <div className="rounded-xl border border-amber-300 bg-amber-50 p-3 text-amber-950 dark:border-amber-500/40 dark:bg-amber-950/25 dark:text-amber-100">
            <p className="font-semibold">Longform-Render</p>
            <p className="mt-1">Noch fail-closed: `editorial_v1` muss zuerst die V3.10.5-Final-Canon-Framechain nutzen.</p>
          </div>
        </div>
      </section>

      <section className="space-y-4 rounded-2xl border border-[rgb(var(--border))] bg-[rgb(var(--card))] p-5 shadow-sm">
        <div>
          <h2 className="text-lg font-semibold text-[rgb(var(--fg))]">Dossier als Video-Entwurf öffnen</h2>
          <p className="mt-1 text-sm text-[rgb(var(--muted))]">
            Die erste Fassung übernimmt nur vorhandene Claims, Findings und offene Fragen. Dossier-Quellen werden nicht automatisch als redaktionell freigegeben hochgestuft.
          </p>
        </div>
        <div className="grid gap-3 md:grid-cols-2 xl:grid-cols-3">
          <input
            value={createForm.dossierId}
            onChange={(event) => setCreateForm((value) => ({ ...value, dossierId: event.target.value }))}
            placeholder="Dossier-ID"
            className="rounded-xl border border-[rgb(var(--border))] bg-[rgb(var(--bg))] px-3 py-2 text-sm text-[rgb(var(--fg))]"
          />
          <input
            value={createForm.briefingId}
            onChange={(event) => setCreateForm((value) => ({ ...value, briefingId: event.target.value }))}
            placeholder="Briefing-ID"
            className="rounded-xl border border-[rgb(var(--border))] bg-[rgb(var(--bg))] px-3 py-2 text-sm text-[rgb(var(--fg))]"
          />
          <input
            value={createForm.title}
            onChange={(event) => setCreateForm((value) => ({ ...value, title: event.target.value }))}
            placeholder="Arbeitstitel"
            className="rounded-xl border border-[rgb(var(--border))] bg-[rgb(var(--bg))] px-3 py-2 text-sm text-[rgb(var(--fg))]"
          />
          <select
            value={createForm.locale}
            onChange={(event) => setCreateForm((value) => ({ ...value, locale: event.target.value }))}
            className="rounded-xl border border-[rgb(var(--border))] bg-[rgb(var(--bg))] px-3 py-2 text-sm text-[rgb(var(--fg))]"
          >
            {SUPPORTED_LOCALES.map((locale) => (
              <option key={locale} value={locale}>{locale}</option>
            ))}
          </select>
          <select
            value={createForm.selectedFormat}
            onChange={(event) => setCreateForm((value) => ({ ...value, selectedFormat: event.target.value }))}
            className="rounded-xl border border-[rgb(var(--border))] bg-[rgb(var(--bg))] px-3 py-2 text-sm text-[rgb(var(--fg))]"
          >
            {VOXY_VIDEO_FORMATS.map((format) => (
              <option key={format} value={format}>{format}</option>
            ))}
          </select>
          <select
            value={createForm.safeZoneProfile}
            onChange={(event) => setCreateForm((value) => ({ ...value, safeZoneProfile: event.target.value }))}
            className="rounded-xl border border-[rgb(var(--border))] bg-[rgb(var(--bg))] px-3 py-2 text-sm text-[rgb(var(--fg))]"
          >
            {VOXY_STUDIO_SAFE_ZONE_PROFILES.map((profile) => (
              <option key={profile} value={profile}>{profile}</option>
            ))}
          </select>
        </div>
        <button
          type="button"
          disabled={busy === "create"}
          onClick={() => void createDraft()}
          className="rounded-full border border-sky-400 bg-sky-50 px-4 py-2 text-sm font-semibold text-sky-950 disabled:opacity-50 dark:bg-sky-950/30 dark:text-sky-100"
        >
          {busy === "create" ? "Entwurf wird angelegt …" : "Voxy-Entwurf anlegen"}
        </button>
      </section>

      {error ? (
        <div className="rounded-xl border border-rose-300 bg-rose-50 px-4 py-3 text-sm text-rose-950 dark:border-rose-500/40 dark:bg-rose-950/25 dark:text-rose-100">
          {error}
        </div>
      ) : null}

      {loading ? (
        <div className="rounded-2xl border border-[rgb(var(--border))] bg-[rgb(var(--card))] p-5 text-sm text-[rgb(var(--muted))]">
          Studio-Drafts werden geladen …
        </div>
      ) : null}

      {!loading && data?.items.length === 0 ? (
        <div className="rounded-2xl border border-[rgb(var(--border))] bg-[rgb(var(--card))] p-5 text-sm text-[rgb(var(--muted))]">
          Noch keine Voxy-Studio-Drafts vorhanden.
        </div>
      ) : null}

      <div className="space-y-4">
        {data?.items.map((item) => {
          const draft = item.draft;
          const canSubmit = ["draft", "needs_changes", "needs_review"].includes(draft.status);
          const canReview = draft.status === "needs_review";
          const canReady = canReview && item.validation.renderEligible && persistent;
          const itemBusy = busy?.startsWith(`${draft.draftId}:`) ?? false;
          return (
            <article
              key={draft.draftId}
              className="space-y-4 rounded-2xl border border-[rgb(var(--border))] bg-[rgb(var(--card))] p-5 shadow-sm"
            >
              <div className="flex flex-wrap items-start justify-between gap-3">
                <div>
                  <p className="text-xs font-semibold uppercase tracking-[0.12em] text-sky-700 dark:text-sky-300">
                    {STATUS_LABELS[draft.status] ?? draft.status} · Draft r{draft.revision} · Story r{draft.storyPlan.revision}
                  </p>
                  <h2 className="mt-1 text-xl font-semibold text-[rgb(var(--fg))]">{draft.title}</h2>
                  <p className="mt-1 text-sm text-[rgb(var(--muted))]">
                    {draft.dossierId ?? "ohne Dossier"} · {draft.selectedFormat} · {draft.storyPlan.outputLanguage} · {draft.storyPlan.durationClass}
                  </p>
                </div>
                <div className="rounded-xl border border-[rgb(var(--border))] bg-[rgb(var(--bg))] px-3 py-2 text-xs text-[rgb(var(--muted))]">
                  Review: {item.reviewRecord?.operationalStatus ?? "noch nicht eröffnet"}
                </div>
              </div>

              <div className="grid gap-3 lg:grid-cols-2">
                <div className="rounded-xl border border-[rgb(var(--border))] bg-[rgb(var(--bg))] p-3">
                  <p className="text-xs font-semibold uppercase tracking-[0.1em] text-[rgb(var(--muted))]">Editorial Chapters</p>
                  <div className="mt-2 space-y-2">
                    {draft.storyPlan.chapters.map((chapter) => (
                      <div key={chapter.chapterId} className="rounded-lg border border-[rgb(var(--border))] p-3">
                        <p className="text-xs font-semibold text-sky-700 dark:text-sky-300">{compactReason(chapter.role)}</p>
                        <p className="mt-1 font-semibold text-[rgb(var(--fg))]">{chapter.headline}</p>
                        <p className="mt-1 line-clamp-3 text-sm leading-5 text-[rgb(var(--muted))]">{chapter.narration}</p>
                        <p className="mt-2 text-xs text-[rgb(var(--muted))]">
                          Quellen {chapter.sourceIds.length} · offene Fragen {chapter.openQuestionIds.length}
                        </p>
                      </div>
                    ))}
                  </div>
                </div>

                <div className="space-y-3">
                  <div className={`rounded-xl border p-3 ${item.validation.renderEligible ? "border-emerald-300 bg-emerald-50 dark:border-emerald-500/40 dark:bg-emerald-950/20" : "border-amber-300 bg-amber-50 dark:border-amber-500/40 dark:bg-amber-950/20"}`}>
                    <p className="font-semibold text-[rgb(var(--fg))]">
                      {item.validation.renderEligible ? "Editorial freigabefähig" : "Renderfreigabe blockiert"}
                    </p>
                    {!item.validation.renderEligible ? (
                      <ul className="mt-2 space-y-1 text-sm text-[rgb(var(--muted))]">
                        {[...item.validation.errors, ...item.validation.approvalBlockers].map((reason) => (
                          <li key={reason}>• {compactReason(reason)}</li>
                        ))}
                      </ul>
                    ) : null}
                    {item.validation.warnings.length ? (
                      <p className="mt-2 text-xs text-[rgb(var(--muted))]">
                        Hinweise: {item.validation.warnings.map(compactReason).join(" · ")}
                      </p>
                    ) : null}
                  </div>

                  <div className="rounded-xl border border-[rgb(var(--border))] bg-[rgb(var(--bg))] p-3 text-xs text-[rgb(var(--muted))]">
                    <p className="font-semibold text-[rgb(var(--fg))]">Revisionsbindung</p>
                    <p className="mt-1 break-all">{item.reviewItemId}</p>
                    <p className="mt-1 break-all">{item.decisionGateId}</p>
                  </div>

                  <textarea
                    value={noteByDraft[draft.draftId] ?? ""}
                    onChange={(event) => setNoteByDraft((current) => ({ ...current, [draft.draftId]: event.target.value }))}
                    rows={3}
                    maxLength={3000}
                    placeholder="Review-Hinweis / konkreter Änderungsbedarf"
                    className="w-full rounded-xl border border-[rgb(var(--border))] bg-[rgb(var(--bg))] px-3 py-2 text-sm text-[rgb(var(--fg))]"
                  />

                  <div className="flex flex-wrap gap-2">
                    <button
                      type="button"
                      disabled={!canSubmit || itemBusy}
                      onClick={() => void reviewAction(item, "submit_for_review")}
                      className="rounded-full border border-[rgb(var(--border))] px-4 py-2 text-sm font-semibold text-[rgb(var(--fg))] disabled:opacity-40"
                    >
                      In Review geben
                    </button>
                    <button
                      type="button"
                      disabled={!canReview || itemBusy}
                      onClick={() => void reviewAction(item, "request_changes")}
                      className="rounded-full border border-amber-400 px-4 py-2 text-sm font-semibold text-amber-900 disabled:opacity-40 dark:text-amber-100"
                    >
                      Änderungen anfordern
                    </button>
                    <button
                      type="button"
                      disabled={!canReady || itemBusy}
                      onClick={() => void reviewAction(item, "mark_ready")}
                      title={canReady ? "Redaktionell für den späteren Render freigeben" : "Nur bei vollständig freigegebener Evidenz und persistenter Review-Wahrheit möglich"}
                      className="rounded-full border border-emerald-400 px-4 py-2 text-sm font-semibold text-emerald-900 disabled:cursor-not-allowed disabled:opacity-40 dark:text-emerald-100"
                    >
                      Redaktionell freigeben
                    </button>
                  </div>

                  <p className="text-xs leading-5 text-[rgb(var(--muted))]">
                    Auch eine redaktionelle Freigabe startet keinen Render. Der finale Longform-Render bleibt deaktiviert, bis derselbe #568-Worker `editorial_v1` über die V3.10.5-Final-Canon-Framechain ausführt.
                  </p>
                </div>
              </div>
            </article>
          );
        })}
      </div>
    </div>
  );
}
