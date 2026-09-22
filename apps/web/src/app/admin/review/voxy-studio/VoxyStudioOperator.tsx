"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
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
        evidenceWindow: {
          visible?: boolean;
        };
      }>;
    };
  };
  validation: {
    errors: string[];
    approvalBlockers: string[];
    warnings: string[];
    renderEligible: boolean;
  };
  evidenceSourcePackId: string;
  reviewItemId: string;
  decisionGateId: string;
  approvalEvidenceStale: boolean;
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
  const busyRef = useRef<string | null>(null);
  const autosaveTimers = useRef<Record<string, ReturnType<typeof setTimeout>>>({});
  const [dirtyDrafts, setDirtyDrafts] = useState<Record<string, boolean>>({});
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

  function setBusyState(value: string | null) {
    busyRef.current = value;
    setBusy(value);
  }

  function clearAutosave(draftId: string) {
    const timer = autosaveTimers.current[draftId];
    if (timer) clearTimeout(timer);
    delete autosaveTimers.current[draftId];
  }

  const load = useCallback(async (options?: { quiet?: boolean }) => {
    if (!options?.quiet) setLoading(true);
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
      if (!options?.quiet) setLoading(false);
    }
  }, []);

  useEffect(() => {
    void load();
  }, [load]);

  useEffect(
    () => () => {
      for (const timer of Object.values(autosaveTimers.current)) {
        clearTimeout(timer);
      }
    },
    [],
  );

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
      busyRef.current
    ) {
      return;
    }
    setBusyState("create");
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
      setBusyState(null);
    }
  }

  async function saveDraft(
    item: StudioItem,
    form: HTMLFormElement,
    mode: "manual" | "auto" = "manual",
  ) {
    const draftId = item.draft.draftId;
    clearAutosave(draftId);
    if (busyRef.current) return;

    const formData = new FormData(form);
    const title = String(formData.get("title") ?? "").trim();
    const selectedFormat = String(formData.get("selectedFormat") ?? "").trim();
    const safeZoneProfile = String(formData.get("safeZoneProfile") ?? "").trim();
    const body: Record<string, unknown> = { expectedRevision: item.draft.revision };

    if (title !== item.draft.title) body.title = title;
    if (selectedFormat !== item.draft.selectedFormat) body.selectedFormat = selectedFormat;
    if (safeZoneProfile !== item.draft.safeZoneProfile) body.safeZoneProfile = safeZoneProfile;

    const chapterUpdates = item.draft.storyPlan.chapters.flatMap((chapter) => {
      const headline = String(formData.get(`headline:${chapter.chapterId}`) ?? "").trim();
      const narration = String(formData.get(`narration:${chapter.chapterId}`) ?? "").trim();
      const evidenceWindowVisible =
        formData.get(`evidence-window-visible:${chapter.chapterId}`) === "on";
      const update: {
        chapterId: string;
        headline?: string;
        narration?: string;
        evidenceWindowVisible?: boolean;
      } = {
        chapterId: chapter.chapterId,
      };
      if (headline !== chapter.headline) update.headline = headline;
      if (narration !== chapter.narration) update.narration = narration;
      if (evidenceWindowVisible !== (chapter.evidenceWindow.visible !== false)) {
        update.evidenceWindowVisible = evidenceWindowVisible;
      }
      return update.headline !== undefined ||
        update.narration !== undefined ||
        update.evidenceWindowVisible !== undefined
        ? [update]
        : [];
    });
    if (chapterUpdates.length) body.chapterUpdates = chapterUpdates;

    const ordering = item.draft.storyPlan.chapters.map((chapter, index) => ({
      chapterId: chapter.chapterId,
      order: Number(formData.get(`order:${chapter.chapterId}`) ?? index + 1),
    }));
    if (
      ordering.some((entry) => !Number.isInteger(entry.order) || entry.order < 1) ||
      new Set(ordering.map((entry) => entry.order)).size !== ordering.length
    ) {
      setError("Die Kapitelreihenfolge muss aus eindeutigen positiven Positionsnummern bestehen.");
      return;
    }
    const chapterOrder = [...ordering]
      .sort((left, right) => left.order - right.order)
      .map((entry) => entry.chapterId);
    const currentOrder = item.draft.storyPlan.chapters.map((chapter) => chapter.chapterId);
    if (chapterOrder.some((chapterId, index) => chapterId !== currentOrder[index])) {
      body.chapterOrder = chapterOrder;
    }

    if (Object.keys(body).length === 1) {
      setDirtyDrafts((current) => ({ ...current, [draftId]: false }));
      if (mode === "manual") setError("Keine Änderungen zum Speichern vorhanden.");
      return;
    }

    setBusyState(`${draftId}:${mode === "auto" ? "autosave" : "save"}`);
    setError(null);
    try {
      const response = await fetch(
        `/api/admin/voxy-studio/${encodeURIComponent(draftId)}`,
        {
          method: "PATCH",
          headers: { "content-type": "application/json" },
          body: JSON.stringify(body),
        },
      );
      const payload = await response.json().catch(() => null);
      if (!response.ok || !payload?.ok) {
        throw new Error(payload?.error || "voxy_studio_edit_failed");
      }
      setDirtyDrafts((current) => ({ ...current, [draftId]: false }));
      await load({ quiet: mode === "auto" });
    } catch (caught) {
      setDirtyDrafts((current) => ({ ...current, [draftId]: true }));
      setError(caught instanceof Error ? caught.message : "voxy_studio_edit_failed");
    } finally {
      setBusyState(null);
    }
  }

  function scheduleAutosave(item: StudioItem, form: HTMLFormElement) {
    const draftId = item.draft.draftId;
    clearAutosave(draftId);
    setDirtyDrafts((current) => ({ ...current, [draftId]: true }));
    autosaveTimers.current[draftId] = setTimeout(() => {
      delete autosaveTimers.current[draftId];
      if (busyRef.current) {
        scheduleAutosave(item, form);
        return;
      }
      void saveDraft(item, form, "auto");
    }, 1_200);
  }

  async function reviewAction(
    item: StudioItem,
    action: "submit_for_review" | "mark_in_review" | "request_changes" | "mark_ready",
  ) {
    if (busyRef.current) return;
    if (dirtyDrafts[item.draft.draftId]) {
      setError(
        "Ungespeicherte Studio-Änderungen werden zuerst autosaved. Review-Aktionen bleiben bis dahin blockiert.",
      );
      return;
    }
    const note = noteByDraft[item.draft.draftId]?.trim() || null;
    if (action === "request_changes" && !note) {
      setError("Für Änderungsbedarf ist ein konkreter Review-Hinweis erforderlich.");
      return;
    }
    setBusyState(`${item.draft.draftId}:${action}`);
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
      setBusyState(null);
    }
  }

  return (
    <div className="space-y-5">
      <section className="rounded-2xl border border-[rgb(var(--border))] bg-[rgb(var(--card))] p-5 shadow-sm">
        <p className="text-xs font-semibold uppercase tracking-[0.14em] text-sky-700 dark:text-sky-300">
          Voxy · Editorial Engine
        </p>
        <h2 className="mt-2 text-2xl font-semibold text-[rgb(var(--fg))]">
          Admin Video Studio
        </h2>
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
          <div
            className={`rounded-xl border p-3 ${
              data?.runtime?.editorialLongformRenderEnabled
                ? "border-emerald-300 bg-emerald-50 text-emerald-950 dark:border-emerald-500/40 dark:bg-emerald-950/25 dark:text-emerald-100"
                : "border-amber-300 bg-amber-50 text-amber-950 dark:border-amber-500/40 dark:bg-amber-950/25 dark:text-amber-100"
            }`}
          >
            <p className="font-semibold">Longform-Render</p>
            <p className="mt-1">
              {data?.runtime?.editorialLongformRenderEnabled
                ? "V3.10.5-Final-Canon-Worker und manuelle persistente editorial_v1-Queue sind verfügbar. Der Render startet nur mit revisionsgebundenem, registriertem Audio."
                : `Renderpfad blockiert: ${compactReason(data?.runtime?.reason ?? "Status wird geladen")}`}
            </p>
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
          const itemDirty = dirtyDrafts[draft.draftId] === true;
          const canSubmit =
            (["draft", "needs_changes", "needs_review"].includes(draft.status) ||
              (draft.status === "approved_for_render" && item.approvalEvidenceStale)) &&
            !itemDirty;
          const canReview = draft.status === "needs_review" && !itemDirty;
          const canReady =
            canReview && item.validation.renderEligible && persistent && !itemDirty;
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

              {item.approvalEvidenceStale ? (
                <div className="rounded-xl border border-amber-300 bg-amber-50 p-3 text-sm text-amber-950 dark:border-amber-500/40 dark:bg-amber-950/25 dark:text-amber-100">
                  <p className="font-semibold">Evidence-Revision hat sich geändert</p>
                  <p className="mt-1 leading-5">
                    Die bisherige Renderfreigabe gehört zu einer älteren Evidence-Wahrheit. Die Render Queue bleibt fail-closed, bis dieser Draft erneut in die redaktionelle Prüfung gegeben und für die aktuelle Evidence-Revision freigegeben wurde.
                  </p>
                </div>
              ) : null}

              <form
                key={`${draft.draftId}:r${draft.revision}`}
                className="space-y-3 rounded-xl border border-[rgb(var(--border))] bg-[rgb(var(--bg))] p-4"
                onChange={(event) => scheduleAutosave(item, event.currentTarget)}
                onSubmit={(event) => {
                  event.preventDefault();
                  void saveDraft(item, event.currentTarget, "manual");
                }}
              >
                <div className="flex flex-wrap items-start justify-between gap-3">
                  <div>
                    <p className="font-semibold text-[rgb(var(--fg))]">Begrenzte Korrekturen</p>
                    <p className="mt-1 text-xs leading-5 text-[rgb(var(--muted))]">
                      Jede echte Änderung erzeugt eine neue Draft-Revision. Autosave nutzt denselben revisionsgebundenen Audit-Pfad und kann niemals eine Freigabe setzen. Bereits vorhandene Render-/Publish-Freigaben und Renderbindungen werden bei Änderungen ungültig.
                    </p>
                    <p className="mt-1 text-xs font-medium text-[rgb(var(--muted))]" aria-live="polite">
                      {busy === `${draft.draftId}:autosave`
                        ? "Autosave speichert …"
                        : itemDirty
                          ? "Ungespeicherte Änderung · Autosave vorgemerkt"
                          : "Autosave aktuell"}
                    </p>
                  </div>
                  <button
                    type="submit"
                    disabled={itemBusy}
                    className="rounded-full border border-sky-400 px-4 py-2 text-sm font-semibold text-sky-900 disabled:opacity-40 dark:text-sky-100"
                  >
                    {busy === `${draft.draftId}:save` ? "Speichert …" : "Jetzt speichern"}
                  </button>
                </div>

                <div className="grid gap-3 md:grid-cols-3">
                  <label className="space-y-1 text-xs text-[rgb(var(--muted))] md:col-span-1">
                    <span>Arbeitstitel</span>
                    <input
                      name="title"
                      defaultValue={draft.title}
                      maxLength={240}
                      required
                      className="w-full rounded-lg border border-[rgb(var(--border))] bg-[rgb(var(--card))] px-3 py-2 text-sm text-[rgb(var(--fg))]"
                    />
                  </label>
                  <label className="space-y-1 text-xs text-[rgb(var(--muted))]">
                    <span>Zielformat</span>
                    <select
                      name="selectedFormat"
                      defaultValue={draft.selectedFormat}
                      className="w-full rounded-lg border border-[rgb(var(--border))] bg-[rgb(var(--card))] px-3 py-2 text-sm text-[rgb(var(--fg))]"
                    >
                      {VOXY_VIDEO_FORMATS.map((format) => (
                        <option key={format} value={format}>{format}</option>
                      ))}
                    </select>
                  </label>
                  <label className="space-y-1 text-xs text-[rgb(var(--muted))]">
                    <span>Safe-Zone</span>
                    <select
                      name="safeZoneProfile"
                      defaultValue={draft.safeZoneProfile}
                      className="w-full rounded-lg border border-[rgb(var(--border))] bg-[rgb(var(--card))] px-3 py-2 text-sm text-[rgb(var(--fg))]"
                    >
                      {VOXY_STUDIO_SAFE_ZONE_PROFILES.map((profile) => (
                        <option key={profile} value={profile}>{profile}</option>
                      ))}
                    </select>
                  </label>
                </div>

                <div className="space-y-2">
                  {draft.storyPlan.chapters.map((chapter, index) => (
                    <fieldset key={chapter.chapterId} className="grid gap-2 rounded-lg border border-[rgb(var(--border))] p-3 md:grid-cols-[72px_1fr]">
                      <label className="space-y-1 text-xs text-[rgb(var(--muted))]">
                        <span>Position</span>
                        <input
                          name={`order:${chapter.chapterId}`}
                          type="number"
                          min={1}
                          max={draft.storyPlan.chapters.length}
                          step={1}
                          defaultValue={index + 1}
                          className="w-full rounded-lg border border-[rgb(var(--border))] bg-[rgb(var(--card))] px-2 py-2 text-sm text-[rgb(var(--fg))]"
                        />
                      </label>
                      <div className="space-y-2">
                        <p className="text-xs font-semibold text-sky-700 dark:text-sky-300">{compactReason(chapter.role)}</p>
                        <input
                          name={`headline:${chapter.chapterId}`}
                          defaultValue={chapter.headline}
                          maxLength={180}
                          required
                          className="w-full rounded-lg border border-[rgb(var(--border))] bg-[rgb(var(--card))] px-3 py-2 text-sm font-semibold text-[rgb(var(--fg))]"
                        />
                        <textarea
                          name={`narration:${chapter.chapterId}`}
                          defaultValue={chapter.narration}
                          rows={3}
                          maxLength={2400}
                          required
                          className="w-full rounded-lg border border-[rgb(var(--border))] bg-[rgb(var(--card))] px-3 py-2 text-sm leading-5 text-[rgb(var(--fg))]"
                        />
                        <label className="flex items-center gap-2 text-xs font-medium text-[rgb(var(--muted))]">
                          <input
                            name={`evidence-window-visible:${chapter.chapterId}`}
                            type="checkbox"
                            defaultChecked={chapter.evidenceWindow.visible !== false}
                            className="h-4 w-4 rounded border-[rgb(var(--border))]"
                          />
                          Evidence-/Quellenkarte im Video anzeigen
                        </label>
                        <p className="text-xs text-[rgb(var(--muted))]">
                          Quellen {chapter.sourceIds.length} · offene Fragen {chapter.openQuestionIds.length}
                        </p>
                      </div>
                    </fieldset>
                  ))}
                </div>
              </form>

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
                          Quellen {chapter.sourceIds.length} · offene Fragen {chapter.openQuestionIds.length} · Quellenkarte {chapter.evidenceWindow.visible === false ? "aus" : "an"}
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
                    <p className="mt-1 break-all">Evidence: {item.evidenceSourcePackId}</p>
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
                      disabled={!canSubmit || itemBusy || itemDirty}
                      onClick={() => void reviewAction(item, "submit_for_review")}
                      className="rounded-full border border-[rgb(var(--border))] px-4 py-2 text-sm font-semibold text-[rgb(var(--fg))] disabled:opacity-40"
                    >
                      {item.approvalEvidenceStale ? "Evidence neu prüfen" : "In Review geben"}
                    </button>
                    <button
                      type="button"
                      disabled={!canReview || itemBusy || itemDirty}
                      onClick={() => void reviewAction(item, "request_changes")}
                      className="rounded-full border border-amber-400 px-4 py-2 text-sm font-semibold text-amber-900 disabled:opacity-40 dark:text-amber-100"
                    >
                      Änderungen anfordern
                    </button>
                    <button
                      type="button"
                      disabled={!canReady || itemBusy || itemDirty}
                      onClick={() => void reviewAction(item, "mark_ready")}
                      title={
                        itemDirty
                          ? "Autosave muss zuerst abgeschlossen sein"
                          : canReady
                            ? "Redaktionell für den späteren Render freigeben"
                            : "Nur bei vollständig freigegebener Evidenz und persistenter Review-Wahrheit möglich"
                      }
                      className="rounded-full border border-emerald-400 px-4 py-2 text-sm font-semibold text-emerald-900 disabled:cursor-not-allowed disabled:opacity-40 dark:text-emerald-100"
                    >
                      Redaktionell freigeben
                    </button>
                  </div>

                  <p className="text-xs leading-5 text-[rgb(var(--muted))]">
                    Auch eine redaktionelle Freigabe startet keinen Render. Der #568-Worker rendert `editorial_v1` über die V3.10.5-Final-Canon-Framechain. Ein Job wird ausschließlich manuell in der Render Queue angelegt und benötigt ein exakt revisionsgebundenes, registriertes Audio-Asset sowie persistente Runtime-Wahrheit.
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
