"use client";

import { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { useParams } from "next/navigation";
import QRCode from "qrcode";

type AgendaItem = {
  _id: string;
  kind: string;
  status: string;
  customQuestion?: string | null;
  description?: string | null;
  pollOptions?: string[];
  qrTarget?: string | null;
  allowAnonymousVoting: boolean;
  publicAttribution: string;
};

type DeliberationState = {
  enabled: boolean;
  phase: string;
  round: number;
  roundEndsAt?: string | null;
  fairnessMode?: "off" | "rotation";
  rotationIntervalMinutes?: number | null;
  updatedAt?: string | null;
};

type ModerationQueueItem = {
  _id: string;
  kind: "claim" | "source" | "question" | "option" | "impact";
  text: string;
  sourceUrl?: string | null;
  notes?: string | null;
  status: "queued" | "approved" | "rejected";
  createdAt?: string | null;
};

type LiveBoardOption = {
  id: string;
  title: string;
  pros: string[];
  cons: string[];
  sources: string[];
  openQuestions: string[];
};

type LiveBoardState = {
  title: string;
  summary?: string | null;
  options: LiveBoardOption[];
  updatedAt?: string | null;
};

type FollowUpUpdate = {
  id: string;
  status: "submitted" | "in_review" | "accepted" | "partial" | "rejected";
  note: string;
  link?: string | null;
  createdAt?: string | null;
};

type FollowUpState = {
  updates: FollowUpUpdate[];
  nextReminderAt?: string | null;
  updatedAt?: string | null;
};

type CallInItem = {
  _id: string;
  name: string;
  handle?: string | null;
  channel?: string | null;
  notes?: string | null;
  status: "invited" | "ready" | "live" | "removed";
};

type StreamSettings = {
  supportEnabled: boolean;
  supportBlind: boolean;
  recordingAllowed: boolean;
  requireVerifiedParticipants: boolean;
  hideViewerCount: boolean;
};

type IdentityDocMeta = {
  documentType: "id_card" | "passport";
  updatedAt?: string | null;
};

type EmailPhase = "idle" | "sending" | "sent" | "verifying" | "success" | "error";

const DELIBERATION_PHASES = [
  { key: "mandate", label: "Mandat" },
  { key: "input", label: "Input" },
  { key: "round_a", label: "Runde A" },
  { key: "round_b", label: "Runde B" },
  { key: "round_c", label: "Runde C" },
  { key: "plenum", label: "Plenum" },
  { key: "vote", label: "Abstimmung" },
  { key: "follow_up", label: "Follow-up" },
] as const;

const QUEUE_KIND_LABELS: Record<ModerationQueueItem["kind"], string> = {
  claim: "Behauptung",
  source: "Quelle",
  question: "Frage",
  option: "Option",
  impact: "Auswirkung",
};

export default function StreamCockpitPage() {
  const params = useParams<{ id: string }>();
  const [session, setSession] = useState<{
    _id: string;
    title: string;
    slug?: string | null;
    description?: string | null;
  } | null>(null);
  const [items, setItems] = useState<AgendaItem[]>([]);
  const [qrDraftByItem, setQrDraftByItem] = useState<Record<string, string>>({});
  const [deliberation, setDeliberation] = useState<DeliberationState | null>(null);
  const [delibNotice, setDelibNotice] = useState<string | null>(null);
  const [delibError, setDelibError] = useState<string | null>(null);
  const [queueItems, setQueueItems] = useState<ModerationQueueItem[]>([]);
  const [queueLoading, setQueueLoading] = useState(true);
  const [queueError, setQueueError] = useState<string | null>(null);
  const [queueNotice, setQueueNotice] = useState<string | null>(null);
  const [queueFilter, setQueueFilter] = useState<"all" | "queued" | "approved" | "rejected">("all");
  const [queueDraftKind, setQueueDraftKind] = useState<ModerationQueueItem["kind"]>("claim");
  const [queueDraftText, setQueueDraftText] = useState("");
  const [queueDraftSource, setQueueDraftSource] = useState("");
  const [queueDraftNotes, setQueueDraftNotes] = useState("");
  const [liveBoard, setLiveBoard] = useState<LiveBoardState>({
    title: "Live-Dossier",
    summary: "",
    options: [],
  });
  const [boardLoading, setBoardLoading] = useState(true);
  const [boardError, setBoardError] = useState<string | null>(null);
  const [boardNotice, setBoardNotice] = useState<string | null>(null);
  const [followUp, setFollowUp] = useState<FollowUpState>({ updates: [], nextReminderAt: null });
  const [followUpLoading, setFollowUpLoading] = useState(true);
  const [followUpError, setFollowUpError] = useState<string | null>(null);
  const [followUpNotice, setFollowUpNotice] = useState<string | null>(null);
  const [followUpStatus, setFollowUpStatus] = useState<FollowUpUpdate["status"]>("submitted");
  const [followUpNote, setFollowUpNote] = useState("");
  const [followUpLink, setFollowUpLink] = useState("");
  const [callIns, setCallIns] = useState<CallInItem[]>([]);
  const [callInsLoading, setCallInsLoading] = useState(true);
  const [callInsError, setCallInsError] = useState<string | null>(null);
  const [callInsNotice, setCallInsNotice] = useState<string | null>(null);
  const [callInName, setCallInName] = useState("");
  const [callInHandle, setCallInHandle] = useState("");
  const [callInChannel, setCallInChannel] = useState("");
  const [callInNotes, setCallInNotes] = useState("");
  const [streamSettings, setStreamSettings] = useState<StreamSettings>({
    supportEnabled: false,
    supportBlind: false,
    recordingAllowed: false,
    requireVerifiedParticipants: true,
    hideViewerCount: true,
  });
  const [settingsLoading, setSettingsLoading] = useState(true);
  const [settingsError, setSettingsError] = useState<string | null>(null);
  const [settingsNotice, setSettingsNotice] = useState<string | null>(null);
  const [roundMinutes, setRoundMinutes] = useState("5");
  const [rotationMinutes, setRotationMinutes] = useState("7");
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [notice, setNotice] = useState<string | null>(null);
  const [origin, setOrigin] = useState("");
  const [question, setQuestion] = useState("");
  const [pollOptions, setPollOptions] = useState("Ja\nNein");
  const [autofilling, setAutofilling] = useState(false);
  const [autofillError, setAutofillError] = useState<string | null>(null);
  const [qrQuestions, setQrQuestions] = useState<
    Array<{ title: string; description: string; options: string; publicAttribution: "public" | "hidden" }>
  >([{ title: "", description: "", options: "Ja\nNein", publicAttribution: "hidden" }]);
  const [qrError, setQrError] = useState<string | null>(null);
  const [qrNotice, setQrNotice] = useState<string | null>(null);
  const [qrCode, setQrCode] = useState<string | null>(null);
  const [qrImage, setQrImage] = useState<string | null>(null);
  const [qrImageError, setQrImageError] = useState<string | null>(null);
  const [qrCreating, setQrCreating] = useState(false);
  const [identityDoc, setIdentityDoc] = useState<IdentityDocMeta | null>(null);
  const [identityDocLoading, setIdentityDocLoading] = useState(true);
  const [identityDocError, setIdentityDocError] = useState<string | null>(null);
  const [verificationMethods, setVerificationMethods] = useState<string[]>([]);
  const [verificationLoading, setVerificationLoading] = useState(true);
  const [emailPhase, setEmailPhase] = useState<EmailPhase>("idle");
  const [emailCode, setEmailCode] = useState("");
  const [emailMessage, setEmailMessage] = useState<string | null>(null);
  const [tutorialActive, setTutorialActive] = useState(false);
  const [tutorialSeconds, setTutorialSeconds] = useState(180);

  useEffect(() => {
    setOrigin(window.location.origin);
  }, []);

  useEffect(() => {
    if (typeof deliberation?.rotationIntervalMinutes === "number") {
      setRotationMinutes(String(deliberation.rotationIntervalMinutes));
    }
  }, [deliberation?.rotationIntervalMinutes]);

  useEffect(() => {
    let active = true;
    async function loadPreStreamStatus() {
      setIdentityDocLoading(true);
      setVerificationLoading(true);
      setIdentityDocError(null);
      setEmailMessage(null);
      try {
        const [docRes, overviewRes] = await Promise.all([
          fetch("/api/account/identity-document?meta=1", { cache: "no-store" }),
          fetch("/api/account/overview", { cache: "no-store" }),
        ]);
        const docBody = await docRes.json().catch(() => ({}));
        const overviewBody = await overviewRes.json().catch(() => ({}));
        if (active) {
          if (docRes.ok && docBody?.ok) {
            setIdentityDoc(docBody?.doc ?? null);
          } else {
            setIdentityDocError(docBody?.error || "Identitätsstatus konnte nicht geladen werden.");
          }
          if (overviewRes.ok && overviewBody?.overview) {
            setVerificationMethods(
              Array.isArray(overviewBody.overview?.verificationMethods)
                ? overviewBody.overview.verificationMethods
                : [],
            );
          }
        }
      } catch (err: any) {
        if (active) {
          setIdentityDocError(err?.message ?? "Identitätsstatus konnte nicht geladen werden.");
        }
      } finally {
        if (active) {
          setIdentityDocLoading(false);
          setVerificationLoading(false);
        }
      }
    }
    loadPreStreamStatus();
    return () => {
      active = false;
    };
  }, []);

  useEffect(() => {
    if (!tutorialActive) return;
    if (tutorialSeconds <= 0) {
      setTutorialActive(false);
      return;
    }
    const timer = window.setInterval(() => {
      setTutorialSeconds((prev) => (prev > 0 ? prev - 1 : 0));
    }, 1000);
    return () => window.clearInterval(timer);
  }, [tutorialActive, tutorialSeconds]);

  async function fetchQueue(sessionId: string) {
    setQueueError(null);
    try {
      const res = await fetch(`/api/streams/sessions/${sessionId}/moderation-queue`, {
        cache: "no-store",
      });
      const body = await res.json().catch(() => ({}));
      if (!res.ok) throw new Error(body?.error || res.statusText);
      setQueueItems(body?.items ?? []);
    } catch (err: any) {
      setQueueError(err?.message ?? "Moderations-Queue konnte nicht geladen werden.");
    } finally {
      setQueueLoading(false);
    }
  }

  async function fetchLiveBoard(sessionId: string) {
    setBoardError(null);
    try {
      const res = await fetch(`/api/streams/sessions/${sessionId}/live-board`, {
        cache: "no-store",
      });
      const body = await res.json().catch(() => ({}));
      if (!res.ok) throw new Error(body?.error || res.statusText);
      if (body?.state) {
        setLiveBoard({
          title: body.state.title ?? "Live-Dossier",
          summary: body.state.summary ?? "",
          options: Array.isArray(body.state.options) ? body.state.options : [],
          updatedAt: body.state.updatedAt ?? null,
        });
      } else {
        setLiveBoard((prev) => ({ ...prev }));
      }
    } catch (err: any) {
      setBoardError(err?.message ?? "Live-Dossier-Board konnte nicht geladen werden.");
    } finally {
      setBoardLoading(false);
    }
  }

  async function fetchFollowUp(sessionId: string) {
    setFollowUpError(null);
    try {
      const res = await fetch(`/api/streams/sessions/${sessionId}/follow-up`, {
        cache: "no-store",
      });
      const body = await res.json().catch(() => ({}));
      if (!res.ok) throw new Error(body?.error || res.statusText);
      if (body?.state) {
        setFollowUp({
          updates: Array.isArray(body.state.updates) ? body.state.updates : [],
          nextReminderAt: body.state.nextReminderAt ?? null,
          updatedAt: body.state.updatedAt ?? null,
        });
      } else {
        setFollowUp((prev) => ({ ...prev }));
      }
    } catch (err: any) {
      setFollowUpError(err?.message ?? "Follow-up konnte nicht geladen werden.");
    } finally {
      setFollowUpLoading(false);
    }
  }

  async function fetchCallIns(sessionId: string) {
    setCallInsError(null);
    try {
      const res = await fetch(`/api/streams/sessions/${sessionId}/call-ins`, {
        cache: "no-store",
      });
      const body = await res.json().catch(() => ({}));
      if (!res.ok) throw new Error(body?.error || res.statusText);
      setCallIns(Array.isArray(body?.items) ? body.items : []);
    } catch (err: any) {
      setCallInsError(err?.message ?? "Call-ins konnten nicht geladen werden.");
    } finally {
      setCallInsLoading(false);
    }
  }

  async function fetchSettings(sessionId: string) {
    setSettingsError(null);
    try {
      const res = await fetch(`/api/streams/sessions/${sessionId}/settings`, { cache: "no-store" });
      const body = await res.json().catch(() => ({}));
      if (!res.ok) throw new Error(body?.error || res.statusText);
      if (body?.settings) {
        setStreamSettings({
          supportEnabled: Boolean(body.settings.supportEnabled),
          supportBlind: Boolean(body.settings.supportBlind),
          recordingAllowed: Boolean(body.settings.recordingAllowed),
          requireVerifiedParticipants: body.settings.requireVerifiedParticipants !== false,
          hideViewerCount: body.settings.hideViewerCount !== false,
        });
      }
    } catch (err: any) {
      setSettingsError(err?.message ?? "Stream-Einstellungen konnten nicht geladen werden.");
    } finally {
      setSettingsLoading(false);
    }
  }

  useEffect(() => {
    let ignore = false;
    async function load() {
      setLoading(true);
      setQueueLoading(true);
      setBoardLoading(true);
      setFollowUpLoading(true);
      setCallInsLoading(true);
      setSettingsLoading(true);
      try {
        const res = await fetch(`/api/streams/sessions/${params.id}/agenda`, { cache: "no-store" });
        const body = await res.json().catch(() => ({}));
        if (!res.ok) throw new Error(body?.error || res.statusText);
        if (!ignore) {
          setSession(body.session);
          const nextItems: AgendaItem[] = body.items ?? [];
          setItems(nextItems);
          setQrDraftByItem((prev) => {
            const next = { ...prev };
            nextItems.forEach((item) => {
              if (!(item._id in next)) {
                next[item._id] = item.qrTarget ?? "";
              }
            });
            return next;
          });
        }
        const delibRes = await fetch(`/api/streams/sessions/${params.id}/deliberation`, {
          cache: "no-store",
        });
        const delibBody = await delibRes.json().catch(() => ({}));
        if (!ignore) {
          if (delibRes.ok && delibBody?.state) {
            setDeliberation(delibBody.state);
          }
        }
        if (!ignore) {
          await fetchQueue(params.id);
          await fetchLiveBoard(params.id);
          await fetchFollowUp(params.id);
          await fetchCallIns(params.id);
          await fetchSettings(params.id);
        }
      } catch (err: any) {
        if (!ignore) setError(err?.message ?? "Fehler beim Laden der Agenda");
      } finally {
        if (!ignore) setLoading(false);
      }
    }
    load();
    const timer = setInterval(load, 5000);
    return () => {
      ignore = true;
      clearInterval(timer);
    };
  }, [params.id]);

  const liveItem = useMemo(() => items.find((item) => item.status === "live"), [items]);
  const publicStreamPath = useMemo(() => {
    const slug = session?.slug?.trim();
    if (slug) return `/stream/${slug}`;
    return `/stream/${params.id}`;
  }, [params.id, session?.slug]);
  const queueCounts = useMemo(() => {
    return {
      all: queueItems.length,
      queued: queueItems.filter((item) => item.status === "queued").length,
      approved: queueItems.filter((item) => item.status === "approved").length,
      rejected: queueItems.filter((item) => item.status === "rejected").length,
    };
  }, [queueItems]);
  const visibleQueueItems = useMemo(() => {
    if (queueFilter === "all") return queueItems;
    return queueItems.filter((item) => item.status === queueFilter);
  }, [queueItems, queueFilter]);
  const overlayPath = useMemo(() => `/overlay/stream/${params.id}`, [params.id]);
  const activeQrTarget =
    liveItem?.qrTarget?.trim() ||
    (liveItem?._id ? `${publicStreamPath}?agendaItemId=${liveItem._id}` : publicStreamPath);
  const phaseLabel =
    DELIBERATION_PHASES.find((p) => p.key === deliberation?.phase)?.label ?? "Mandat";
  const roundEndsLabel = deliberation?.roundEndsAt
    ? new Date(deliberation.roundEndsAt).toLocaleTimeString("de-DE")
    : "—";

  useEffect(() => {
    if (!activeQrTarget) return;
    const fullTarget = origin ? `${origin}${activeQrTarget}` : activeQrTarget;
    setQrImageError(null);
    QRCode.toDataURL(fullTarget, { width: 200, margin: 1 })
      .then((dataUrl) => setQrImage(dataUrl))
      .catch(() => {
        setQrImage(null);
        setQrImageError("QR konnte nicht erzeugt werden.");
      });
  }, [activeQrTarget, origin]);

  async function addQueueItem() {
    setQueueError(null);
    setQueueNotice(null);
    const payload = {
      kind: queueDraftKind,
      text: queueDraftText.trim(),
      sourceUrl: queueDraftSource.trim() || null,
      notes: queueDraftNotes.trim() || null,
    };
    if (!payload.text) {
      setQueueError("Bitte einen Inhalt für die Queue angeben.");
      return;
    }
    try {
      const res = await fetch(`/api/streams/sessions/${params.id}/moderation-queue`, {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify(payload),
      });
      const body = await res.json().catch(() => ({}));
      if (!res.ok) throw new Error(body?.error || "Queue-Item konnte nicht erstellt werden.");
      setQueueDraftText("");
      setQueueDraftSource("");
      setQueueDraftNotes("");
      setQueueNotice("Queue-Item erstellt.");
      await fetchQueue(params.id);
    } catch (err: any) {
      setQueueError(err?.message ?? "Queue-Item konnte nicht erstellt werden.");
    }
  }

  async function updateQueueStatus(itemId: string, status: "queued" | "approved" | "rejected") {
    setQueueError(null);
    setQueueNotice(null);
    try {
      const res = await fetch(`/api/streams/sessions/${params.id}/moderation-queue`, {
        method: "PATCH",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ itemId, status }),
      });
      const body = await res.json().catch(() => ({}));
      if (!res.ok) throw new Error(body?.error || "Status konnte nicht gesetzt werden.");
      setQueueNotice("Queue-Status aktualisiert.");
      await fetchQueue(params.id);
    } catch (err: any) {
      setQueueError(err?.message ?? "Queue-Status konnte nicht gesetzt werden.");
    }
  }

  function updateBoardOption(id: string, patch: Partial<LiveBoardOption>) {
    setLiveBoard((prev) => ({
      ...prev,
      options: prev.options.map((opt) => (opt.id === id ? { ...opt, ...patch } : opt)),
    }));
  }

  function updateBoardList(id: string, key: "pros" | "cons" | "sources" | "openQuestions", value: string) {
    const nextList = value
      .split("\n")
      .map((line) => line.trim())
      .filter(Boolean)
      .slice(0, 12);
    updateBoardOption(id, { [key]: nextList } as Partial<LiveBoardOption>);
  }

  function addBoardOption() {
    setLiveBoard((prev) => {
      const nextId = typeof crypto !== "undefined" && "randomUUID" in crypto ? crypto.randomUUID() : `opt_${Date.now()}`;
      return {
        ...prev,
        options: [
          ...prev.options,
          { id: nextId, title: "Neue Option", pros: [], cons: [], sources: [], openQuestions: [] },
        ].slice(0, 7),
      };
    });
  }

  function removeBoardOption(id: string) {
    setLiveBoard((prev) => ({
      ...prev,
      options: prev.options.filter((opt) => opt.id !== id),
    }));
  }

  async function saveLiveBoard() {
    setBoardError(null);
    setBoardNotice(null);
    try {
      const payload = {
        title: liveBoard.title?.trim() || "Live-Dossier",
        summary: liveBoard.summary?.trim() || "",
        options: liveBoard.options,
      };
      const res = await fetch(`/api/streams/sessions/${params.id}/live-board`, {
        method: "PATCH",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ state: payload }),
      });
      const body = await res.json().catch(() => ({}));
      if (!res.ok) throw new Error(body?.error || "Live-Dossier konnte nicht gespeichert werden.");
      if (body?.state) {
        setLiveBoard({
          title: body.state.title ?? payload.title,
          summary: body.state.summary ?? payload.summary,
          options: Array.isArray(body.state.options) ? body.state.options : payload.options,
          updatedAt: body.state.updatedAt ?? null,
        });
      }
      setBoardNotice("Live-Dossier gespeichert.");
    } catch (err: any) {
      setBoardError(err?.message ?? "Live-Dossier konnte nicht gespeichert werden.");
    }
  }

  async function saveFollowUpState(next: FollowUpState) {
    setFollowUpError(null);
    setFollowUpNotice(null);
    try {
      const res = await fetch(`/api/streams/sessions/${params.id}/follow-up`, {
        method: "PATCH",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ state: next }),
      });
      const body = await res.json().catch(() => ({}));
      if (!res.ok) throw new Error(body?.error || "Follow-up konnte nicht gespeichert werden.");
      if (body?.state) {
        setFollowUp({
          updates: Array.isArray(body.state.updates) ? body.state.updates : next.updates,
          nextReminderAt: body.state.nextReminderAt ?? next.nextReminderAt ?? null,
          updatedAt: body.state.updatedAt ?? null,
        });
      } else {
        setFollowUp(next);
      }
      setFollowUpNotice("Follow-up aktualisiert.");
    } catch (err: any) {
      setFollowUpError(err?.message ?? "Follow-up konnte nicht gespeichert werden.");
    }
  }

  async function addFollowUpUpdate() {
    const note = followUpNote.trim();
    if (!note) {
      setFollowUpError("Bitte einen Status-Text angeben.");
      return;
    }
    const nowIso = new Date().toISOString();
    const next: FollowUpState = {
      ...followUp,
      updates: [
        {
          id: typeof crypto !== "undefined" && "randomUUID" in crypto ? crypto.randomUUID() : `fu_${Date.now()}`,
          status: followUpStatus,
          note,
          link: followUpLink.trim() || null,
          createdAt: nowIso,
        },
        ...followUp.updates,
      ].slice(0, 50),
    };
    await saveFollowUpState(next);
    setFollowUpNote("");
    setFollowUpLink("");
  }

  async function setFollowUpReminder(days: number) {
    const nextDate = new Date(Date.now() + days * 24 * 60 * 60 * 1000).toISOString();
    await saveFollowUpState({ ...followUp, nextReminderAt: nextDate });
  }

  async function addCallIn() {
    setCallInsError(null);
    setCallInsNotice(null);
    const payload = {
      name: callInName.trim(),
      handle: callInHandle.trim() || null,
      channel: callInChannel.trim() || null,
      notes: callInNotes.trim() || null,
    };
    if (!payload.name) {
      setCallInsError("Bitte einen Namen für den Call-in angeben.");
      return;
    }
    try {
      const res = await fetch(`/api/streams/sessions/${params.id}/call-ins`, {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify(payload),
      });
      const body = await res.json().catch(() => ({}));
      if (!res.ok) throw new Error(body?.error || "Call-in konnte nicht erstellt werden.");
      setCallInName("");
      setCallInHandle("");
      setCallInChannel("");
      setCallInNotes("");
      setCallInsNotice("Call-in hinzugefügt.");
      await fetchCallIns(params.id);
    } catch (err: any) {
      setCallInsError(err?.message ?? "Call-in konnte nicht erstellt werden.");
    }
  }

  async function updateCallInStatus(itemId: string, status: CallInItem["status"]) {
    setCallInsError(null);
    setCallInsNotice(null);
    try {
      const res = await fetch(`/api/streams/sessions/${params.id}/call-ins`, {
        method: "PATCH",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ itemId, status }),
      });
      const body = await res.json().catch(() => ({}));
      if (!res.ok) throw new Error(body?.error || "Status konnte nicht gesetzt werden.");
      setCallInsNotice("Call-in Status aktualisiert.");
      await fetchCallIns(params.id);
    } catch (err: any) {
      setCallInsError(err?.message ?? "Call-in Status konnte nicht gesetzt werden.");
    }
  }

  async function updateStreamSettings(patch: Partial<StreamSettings>) {
    setSettingsError(null);
    setSettingsNotice(null);
    try {
      const res = await fetch(`/api/streams/sessions/${params.id}/settings`, {
        method: "PATCH",
        headers: { "content-type": "application/json" },
        body: JSON.stringify(patch),
      });
      const body = await res.json().catch(() => ({}));
      if (!res.ok) throw new Error(body?.error || "Einstellungen konnten nicht gespeichert werden.");
      setStreamSettings((prev) => ({ ...prev, ...patch }));
      setSettingsNotice("Stream-Einstellungen gespeichert.");
    } catch (err: any) {
      setSettingsError(err?.message ?? "Einstellungen konnten nicht gespeichert werden.");
    }
  }

  async function addQuestion(kind: "question" | "poll") {
    const payload: any = {
      kind,
      customQuestion: question.trim() || "Neue Frage",
      allowAnonymousVoting: true,
      publicAttribution: "hidden",
    };
    if (kind === "poll") {
      payload.pollOptions = pollOptions
        .split("\n")
        .map((line) => line.trim())
        .filter(Boolean);
    }
    try {
      await fetch(`/api/streams/sessions/${params.id}/agenda`, {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify(payload),
      });
      setQuestion("");
    } catch {
      setError("Agenda-Item konnte nicht erstellt werden.");
    }
  }

  async function updateItem(itemId: string, action: string, qrTarget?: string) {
    setError(null);
    setNotice(null);
    const res = await fetch(`/api/streams/sessions/${params.id}/agenda`, {
      method: "PATCH",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({ itemId, action, qrTarget }),
    });
    if (!res.ok) {
      const body = await res.json().catch(() => ({}));
      if (body?.error === "STREAM_IDENTITY_REQUIRED") {
        throw new Error("Stream-Start blockiert: Bitte Ausweis/Pass und E-Mail-Code bestätigen.");
      }
      throw new Error(body?.error || "Aktion fehlgeschlagen.");
    }
  }

  async function updateDeliberation(patch: {
    enabled?: boolean;
    phase?: string;
    round?: number;
    roundMinutes?: number | null;
    fairnessMode?: "off" | "rotation";
    rotationMinutes?: number | null;
  }) {
    setDelibNotice(null);
    setDelibError(null);
    try {
      const res = await fetch(`/api/streams/sessions/${params.id}/deliberation`, {
        method: "PATCH",
        headers: { "content-type": "application/json" },
        body: JSON.stringify(patch),
      });
      const body = await res.json().catch(() => ({}));
      if (!res.ok) {
        throw new Error(body?.error || "Aktion fehlgeschlagen.");
      }
      if (body?.state) setDeliberation(body.state);
      setDelibNotice("Deliberation aktualisiert.");
    } catch (err: any) {
      setDelibError(err?.message ?? "Deliberation konnte nicht aktualisiert werden.");
    }
  }

  async function saveQrTarget(itemId: string) {
    try {
      await updateItem(itemId, "set_qr_target", qrDraftByItem[itemId] ?? "");
      setNotice("QR-Ziel gespeichert.");
    } catch (err: any) {
      setError(err?.message ?? "QR-Ziel konnte nicht gespeichert werden.");
    }
  }

  async function copyText(value: string, label: string) {
    try {
      await navigator.clipboard.writeText(value);
      setNotice(`${label} kopiert.`);
    } catch {
      setError(`${label} konnte nicht kopiert werden.`);
    }
  }

  function updateQrQuestion(index: number, patch: Partial<{ title: string; description: string; options: string }>) {
    setQrQuestions((prev) => prev.map((q, i) => (i === index ? { ...q, ...patch } : q)));
  }

  function toggleQrVisibility(index: number) {
    setQrError(null);
    setQrQuestions((prev) => {
      const currentPublic = prev.filter((q) => q.publicAttribution === "public").length;
      const next = [...prev];
      const target = next[index];
      if (!target) return prev;
      const nextValue = target.publicAttribution === "public" ? "hidden" : "public";
      if (nextValue === "public" && currentPublic >= 3) {
        setQrError("Maximal 3 Fragen dürfen nicht anonym sein.");
        return prev;
      }
      next[index] = { ...target, publicAttribution: nextValue };
      return next;
    });
  }

  const sessionTemplates = [
    { id: "townhall", label: "Townhall (60 Min)", roundMinutes: 7, rotationMinutes: 5 },
    { id: "kompakt", label: "Kurzformat (20 Min)", roundMinutes: 4, rotationMinutes: 3 },
    { id: "dossier", label: "Dossier-Update (15 Min)", roundMinutes: 3, rotationMinutes: 0 },
  ] as const;

  function applyTemplate(template: { roundMinutes: number; rotationMinutes: number }) {
    setRoundMinutes(String(template.roundMinutes));
    setRotationMinutes(String(template.rotationMinutes));
    updateDeliberation({
      enabled: true,
      phase: "mandate",
      roundMinutes: template.roundMinutes,
      fairnessMode: template.rotationMinutes > 0 ? "rotation" : "off",
      rotationMinutes: template.rotationMinutes,
    });
  }

  function addQrQuestion() {
    setQrError(null);
    setQrQuestions((prev) => {
      if (prev.length >= 5) return prev;
      return [...prev, { title: "", description: "", options: "Ja\nNein", publicAttribution: "hidden" }];
    });
  }

  async function createQrSet() {
    setQrCreating(true);
    setQrError(null);
    setQrNotice(null);
    try {
      const publicCount = qrQuestions.filter((q) => q.publicAttribution === "public").length;
      if (publicCount > 3) {
        setQrError("Maximal 3 Fragen dürfen nicht anonym sein.");
        return;
      }
      const hiddenCount = qrQuestions.length - publicCount;
      if (qrQuestions.length >= 5 && hiddenCount < 2) {
        setQrError("Bei 5 Fragen müssen mindestens 2 anonym sein.");
        return;
      }
      const payload = {
        streamSessionId: params.id,
        title: `Stream ${session?.title ?? "Session"}`,
        questions: qrQuestions.map((q) => ({
          title: q.title.trim() || "Neue Frage",
          description: q.description.trim() || undefined,
          options: q.options
            .split("\n")
            .map((opt) => opt.trim())
            .filter(Boolean),
          publicAttribution: q.publicAttribution,
        })),
      };
      const res = await fetch("/api/qr/sets", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify(payload),
      });
      const body = await res.json().catch(() => ({}));
      if (!res.ok) {
        if (body?.error === "public_limit_exceeded") {
          throw new Error("Maximal 3 Fragen dürfen nicht anonym sein.");
        }
        if (body?.error === "anonymous_minimum") {
          throw new Error("Bei 5 Fragen müssen mindestens 2 anonym sein.");
        }
        if (body?.error === "options_required") {
          throw new Error("Bitte mindestens zwei Eventualitäten pro Frage angeben.");
        }
        throw new Error(body?.error || res.statusText);
      }
      if (body.status === "review_required") {
        setQrCode(null);
        setQrNotice(
          `QR-Set ${body.code ?? ""} ist reviewpflichtig gespeichert. Der öffentliche Link bleibt bis zur unabhängigen Prüfung und separaten Aktivierung gesperrt.`,
        );
      } else {
        setQrCode(body.code ?? null);
        setQrNotice("QR-Set erstellt.");
      }
    } catch (err: any) {
      setQrError(err?.message ?? "QR-Set konnte nicht erstellt werden.");
    } finally {
      setQrCreating(false);
    }
  }

  async function autofillAgenda() {
    setAutofilling(true);
    setAutofillError(null);
    try {
      const res = await fetch(`/api/streams/sessions/${params.id}/agenda/autofill`, {
        method: "POST",
        headers: { "content-type": "application/json" },
      });
      const body = await res.json().catch(() => ({}));
      if (!res.ok || !body?.ok) {
        const msg = body?.error || res.statusText;
        if (msg === "topic_required") {
          throw new Error("Bitte zuerst ein Thema an der Session setzen.");
        }
        if (msg === "topic_not_ready") {
          throw new Error("Zum Thema fehlen noch Statements. Bitte erst den Workflow durchlaufen.");
        }
        throw new Error(msg);
      }
      setItems(body.agenda ?? []);
    } catch (err: any) {
      setAutofillError(err?.message ?? "Autofill nicht möglich. Bitte später erneut versuchen.");
    } finally {
      setAutofilling(false);
    }
  }

  const verificationOk = verificationMethods.includes("email_code");
  const preStreamReady = Boolean(identityDoc) && verificationOk;
  const emailBusy = emailPhase === "sending" || emailPhase === "verifying";
  const emailCodeReady = emailCode.trim().length === 6;
  const tutorialMinutes = Math.floor(tutorialSeconds / 60);
  const tutorialSecondsRest = tutorialSeconds % 60;
  const tutorialProgress = Math.min(1, Math.max(0, 1 - tutorialSeconds / 180));

  async function sendEmailCode() {
    setEmailPhase("sending");
    setEmailMessage(null);
    try {
      const res = await fetch("/api/auth/identity/email/start", { method: "POST" });
      const body = await res.json().catch(() => ({}));
      if (!res.ok || !body?.ok) {
        const message =
          body?.error === "email_not_verified"
            ? "Bitte zuerst deine E-Mail verifizieren."
            : body?.error || "Versand fehlgeschlagen.";
        throw new Error(message);
      }
      setEmailPhase("sent");
      setEmailMessage("Code gesendet. Bitte Postfach prüfen.");
    } catch (err: any) {
      setEmailPhase("error");
      setEmailMessage(err?.message ?? "Versand fehlgeschlagen.");
    }
  }

  async function verifyEmailCode() {
    if (!emailCode.trim()) {
      setEmailPhase("error");
      setEmailMessage("Bitte den 6-stelligen Code eingeben.");
      return;
    }
    setEmailPhase("verifying");
    setEmailMessage(null);
    try {
      const res = await fetch("/api/auth/identity/email/verify", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ code: emailCode.replace(/\s+/g, ""), next: `/dashboard/streams/${params.id}` }),
      });
      const body = await res.json().catch(() => ({}));
      if (!res.ok || !body?.ok) {
        const fallback =
          body?.error === "CODE_EXPIRED"
            ? "Code abgelaufen. Bitte neuen Code senden."
            : "Code ungültig.";
        throw new Error(body?.message || fallback);
      }
      setVerificationMethods((prev) => Array.from(new Set([...prev, "email_code"])));
      setEmailPhase("success");
      setEmailMessage("E-Mail-Code bestätigt.");
    } catch (err: any) {
      setEmailPhase("error");
      setEmailMessage(err?.message ?? "Verifizierung fehlgeschlagen.");
    }
  }

  function startTutorial() {
    setTutorialSeconds(180);
    setTutorialActive(true);
  }

  function stopTutorial() {
    setTutorialActive(false);
  }

  return (
    <main className="flex flex-col gap-6 px-4 py-8">
      <header>
        <p className="text-xs font-semibold uppercase tracking-wide text-[rgb(var(--muted))]">Stream Cockpit</p>
        <h1 className="text-2xl font-bold text-[rgb(var(--fg))]">{session?.title ?? "Session"}</h1>
        <p className="text-sm text-[rgb(var(--muted))]">
          Steuere hier Fragen, Statements und Polls. Das OBS-Overlay aktualisiert sich automatisch.
        </p>
      </header>

      {error && <div className="rounded-xl border border-rose-200 bg-rose-50 px-4 py-2 text-sm text-rose-700">{error}</div>}
      {notice && (
        <div className="rounded-xl border border-emerald-200 bg-emerald-50 px-4 py-2 text-sm text-emerald-700">
          {notice}
        </div>
      )}

      <section className="rounded-2xl border border-amber-200 bg-amber-50/60 p-4 shadow-sm space-y-4">
        <div className="flex flex-wrap items-start justify-between gap-3">
          <div className="space-y-1">
            <h2 className="text-sm font-semibold text-amber-900">Pre-Stream: Identity Check</h2>
            <p className="text-xs text-amber-800">
              Ausweis/Pass, E-Mail-Code und ein kurzes Tutorial – damit Streams sicher und gut geführt starten.
            </p>
          </div>
          <span
            className={
              preStreamReady
                ? "inline-flex items-center rounded-full bg-emerald-50 px-2.5 py-1 text-[10px] font-semibold uppercase tracking-[0.16em] text-emerald-700 ring-1 ring-emerald-200"
                : "inline-flex items-center rounded-full bg-amber-50 px-2.5 py-1 text-[10px] font-semibold uppercase tracking-[0.16em] text-amber-700 ring-1 ring-amber-200"
            }
          >
            {preStreamReady ? "bereit" : "offen"}
          </span>
        </div>

        <div className="grid gap-3 lg:grid-cols-[1fr_1fr_1.2fr]">
          <div className="rounded-xl border border-amber-100 bg-[rgb(var(--card))] p-4 text-xs space-y-2">
            <div className="flex items-center justify-between">
              <p className="font-semibold text-[rgb(var(--fg))]">1) Ausweis / Pass</p>
              <span
                className={
                  identityDoc
                    ? "rounded-full bg-emerald-50 px-2 py-0.5 text-[10px] font-semibold uppercase tracking-[0.12em] text-emerald-700"
                    : "rounded-full bg-amber-50 px-2 py-0.5 text-[10px] font-semibold uppercase tracking-[0.12em] text-amber-700"
                }
              >
                {identityDoc ? "ok" : "fehlt"}
              </span>
            </div>
            {identityDocLoading ? (
              <p className="text-[rgb(var(--muted))]">Status wird geladen …</p>
            ) : identityDocError ? (
              <p className="text-rose-600">{identityDocError}</p>
            ) : identityDoc ? (
              <p className="text-[rgb(var(--muted))]">
                Hinterlegt: {identityDoc.documentType === "passport" ? "Reisepass" : "Personalausweis"}
                {identityDoc.updatedAt ? ` · aktualisiert ${new Date(identityDoc.updatedAt).toLocaleDateString("de-DE")}` : ""}
              </p>
            ) : (
              <p className="text-[rgb(var(--muted))]">Bitte im Profil hochladen.</p>
            )}
            <Link
              href="/account"
              className="inline-flex w-fit rounded-full border border-amber-200 px-3 py-1 text-[11px] font-semibold text-amber-800"
            >
              Upload im Profil
            </Link>
          </div>

          <div className="rounded-xl border border-amber-100 bg-[rgb(var(--card))] p-4 text-xs space-y-2">
            <div className="flex items-center justify-between">
              <p className="font-semibold text-[rgb(var(--fg))]">2) E-Mail-Code</p>
              <span
                className={
                  verificationOk
                    ? "rounded-full bg-emerald-50 px-2 py-0.5 text-[10px] font-semibold uppercase tracking-[0.12em] text-emerald-700"
                    : "rounded-full bg-amber-50 px-2 py-0.5 text-[10px] font-semibold uppercase tracking-[0.12em] text-amber-700"
                }
              >
                {verificationOk ? "ok" : "offen"}
              </span>
            </div>
            {verificationLoading ? (
              <p className="text-[rgb(var(--muted))]">Status wird geladen …</p>
            ) : verificationOk ? (
              <p className="text-emerald-700">Bestätigt – du bist für Streams verifiziert.</p>
            ) : (
              <>
                <p className="text-[rgb(var(--muted))]">Bitte vor dem Stream einmal bestätigen (Code gültig für 10 Minuten).</p>
                <div className="flex flex-wrap items-center gap-2">
                  <button
                    type="button"
                    onClick={sendEmailCode}
                    className="rounded-full border border-amber-200 px-3 py-1 text-[11px] font-semibold text-amber-800"
                    disabled={emailBusy}
                  >
                    {emailPhase === "sending" ? "Sende …" : "Code senden"}
                  </button>
                  <input
                    type="text"
                    inputMode="numeric"
                    maxLength={6}
                    value={emailCode}
                    onChange={(event) => setEmailCode(event.target.value.replace(/\D/g, ""))}
                    placeholder="123456"
                    className="w-24 rounded-full border border-amber-200 bg-[rgb(var(--card))] px-3 py-1 text-[11px] text-[rgb(var(--muted))]"
                    disabled={emailBusy}
                  />
                  <button
                    type="button"
                    onClick={verifyEmailCode}
                    className="rounded-full bg-amber-600 px-3 py-1 text-[11px] font-semibold text-white"
                    disabled={emailBusy || !emailCodeReady}
                  >
                    {emailPhase === "verifying" ? "Prüfe …" : "Bestätigen"}
                  </button>
                </div>
                {emailMessage && <p className="text-[11px] text-[rgb(var(--muted))]">{emailMessage}</p>}
              </>
            )}
          </div>

          <div className="rounded-xl border border-amber-100 bg-[rgb(var(--card))] p-4 text-xs space-y-3">
            <div className="flex flex-wrap items-center justify-between gap-2">
              <div>
                <p className="font-semibold text-[rgb(var(--fg))]">3) 3-Minuten-Tutorial</p>
                <p className="mt-1 text-[rgb(var(--muted))]">
                  Kurzer Onboarding-Block für die ersten 3 Minuten, damit das Publikum direkt weiß, wie es mitmacht.
                </p>
              </div>
              <span
                className={
                  tutorialActive
                    ? "rounded-full bg-sky-50 px-2 py-0.5 text-[10px] font-semibold uppercase tracking-[0.12em] text-sky-700"
                    : "rounded-full bg-[rgb(var(--bg))] px-2 py-0.5 text-[10px] font-semibold uppercase tracking-[0.12em] text-[rgb(var(--muted))]"
                }
              >
                {tutorialActive ? "läuft" : "bereit"}
              </span>
            </div>

            <div className="flex flex-wrap gap-2">
              <button
                type="button"
                onClick={startTutorial}
                className="rounded-full border border-amber-200 px-3 py-1 text-[11px] font-semibold text-amber-800"
                disabled={tutorialActive}
              >
                Tutorial starten
              </button>
              <button
                type="button"
                onClick={stopTutorial}
                className="rounded-full border border-[rgb(var(--border))] px-3 py-1 text-[11px] font-semibold text-[rgb(var(--muted))]"
                disabled={!tutorialActive}
              >
                Stoppen
              </button>
            </div>

            <div className="space-y-2">
              <div className="flex items-center justify-between text-[11px] text-[rgb(var(--muted))]">
                <span>Countdown</span>
                <span>
                  {tutorialMinutes}:{String(tutorialSecondsRest).padStart(2, "0")}
                </span>
              </div>
              <div className="h-2 w-full overflow-hidden rounded-full bg-amber-100">
                <div
                  className="h-full rounded-full bg-amber-500 transition-all"
                  style={{ width: `${tutorialProgress * 100}%` }}
                />
              </div>
              <div className="grid gap-1 text-[11px] text-[rgb(var(--muted))]">
                <span>1) Begrüßung + Thema in 20 Sekunden.</span>
                <span>2) Beteiligung erklären: Fragen, Abstimmungen, Quellen.</span>
                <span>3) Erste Mini-Frage starten, damit alle reinkommen.</span>
              </div>
            </div>
          </div>
        </div>
      </section>

      <section className="rounded-2xl border border-[rgb(var(--border))] bg-[rgb(var(--card))] p-4 shadow-sm space-y-3">
        <h2 className="text-sm font-semibold text-[rgb(var(--fg))]">Stream-Kit</h2>
        <div className="grid gap-3 md:grid-cols-3">
          <div className="rounded-xl border border-[rgb(var(--border))] p-3 text-xs">
            <p className="font-semibold text-[rgb(var(--fg))]">Overlay URL</p>
            <p className="mt-1 break-all text-[rgb(var(--muted))]">{origin ? `${origin}${overlayPath}` : overlayPath}</p>
            <div className="mt-2 flex gap-2">
              <a className="rounded-full border border-[rgb(var(--border))] px-3 py-1" href={overlayPath} target="_blank" rel="noreferrer">
                Öffnen
              </a>
              <button
                className="rounded-full border border-[rgb(var(--border))] px-3 py-1"
                onClick={() => copyText(origin ? `${origin}${overlayPath}` : overlayPath, "Overlay URL")}
              >
                Kopieren
              </button>
            </div>
          </div>
          <div className="rounded-xl border border-[rgb(var(--border))] p-3 text-xs">
            <p className="font-semibold text-[rgb(var(--fg))]">Viewer URL</p>
            <p className="mt-1 break-all text-[rgb(var(--muted))]">
              {origin ? `${origin}${publicStreamPath}` : publicStreamPath}
            </p>
            <div className="mt-2 flex gap-2">
              <a className="rounded-full border border-[rgb(var(--border))] px-3 py-1" href={publicStreamPath} target="_blank" rel="noreferrer">
                Öffnen
              </a>
              <button
                className="rounded-full border border-[rgb(var(--border))] px-3 py-1"
                onClick={() => copyText(origin ? `${origin}${publicStreamPath}` : publicStreamPath, "Viewer URL")}
              >
                Kopieren
              </button>
            </div>
          </div>
          <div className="rounded-xl border border-[rgb(var(--border))] p-3 text-xs">
            <p className="font-semibold text-[rgb(var(--fg))]">Aktives QR-Ziel</p>
            <p className="mt-1 break-all text-[rgb(var(--muted))]">{activeQrTarget}</p>
            <button
              className="mt-2 rounded-full border border-[rgb(var(--border))] px-3 py-1"
              onClick={() => copyText(origin ? `${origin}${activeQrTarget}` : activeQrTarget, "QR-Ziel")}
            >
              Kopieren
            </button>
            {qrImageError && <p className="mt-2 text-[11px] text-rose-600">{qrImageError}</p>}
            {qrImage && (
              <div className="mt-3 inline-flex items-center justify-center rounded-xl border border-[rgb(var(--border))] bg-[rgb(var(--card))] p-2">
                <img src={qrImage} alt="QR Code" className="h-24 w-24" />
              </div>
            )}
          </div>
        </div>
      </section>

      <section className="rounded-2xl border border-[rgb(var(--border))] bg-[rgb(var(--card))] p-4 shadow-sm space-y-3">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div>
            <h2 className="text-sm font-semibold text-[rgb(var(--fg))]">Stream-Einstellungen</h2>
            <p className="text-xs text-[rgb(var(--muted))]">
              Support, Verifizierung, Mitschnitt und Sichtbarkeit steuern.
            </p>
          </div>
          {settingsLoading && <span className="text-xs text-[rgb(var(--muted))]">lädt…</span>}
        </div>
        {settingsError && <p className="text-xs text-rose-600">{settingsError}</p>}
        {settingsNotice && <p className="text-xs text-emerald-600">{settingsNotice}</p>}

        <div className="grid gap-3 md:grid-cols-2">
          <button
            className={`rounded-xl border px-3 py-3 text-left text-sm ${
              streamSettings.supportEnabled
                ? "border-emerald-300 bg-emerald-50 text-emerald-800"
                : "border-[rgb(var(--border))] bg-[rgb(var(--card))] text-[rgb(var(--muted))]"
            }`}
            onClick={() => updateStreamSettings({ supportEnabled: !streamSettings.supportEnabled })}
          >
            <p className="font-semibold">Support aktivieren</p>
            <p className="text-xs text-[rgb(var(--muted))]">
              Unterstützen-CTA kann zugeschaltet werden (optional blind).
            </p>
          </button>
          <button
            className={`rounded-xl border px-3 py-3 text-left text-sm ${
              streamSettings.supportBlind
                ? "border-amber-300 bg-amber-50 text-amber-800"
                : "border-[rgb(var(--border))] bg-[rgb(var(--card))] text-[rgb(var(--muted))]"
            }`}
            onClick={() => updateStreamSettings({ supportBlind: !streamSettings.supportBlind })}
            disabled={!streamSettings.supportEnabled}
          >
            <p className="font-semibold">Support blind schalten</p>
            <p className="text-xs text-[rgb(var(--muted))]">
              Support läuft im Hintergrund, ohne öffentliche Anzeige.
            </p>
          </button>
          <button
            className={`rounded-xl border px-3 py-3 text-left text-sm ${
              streamSettings.recordingAllowed
                ? "border-[rgb(var(--border))] bg-slate-900 text-white"
                : "border-[rgb(var(--border))] bg-[rgb(var(--card))] text-[rgb(var(--muted))]"
            }`}
            onClick={() => updateStreamSettings({ recordingAllowed: !streamSettings.recordingAllowed })}
          >
            <p className="font-semibold">Mitschnitt erlaubt</p>
            <p className="text-xs text-[rgb(var(--muted))]">
              Erlaubt Aufzeichnung und Nachbereitung (rechtliche Hinweise beachten).
            </p>
          </button>
          <button
            className={`rounded-xl border px-3 py-3 text-left text-sm ${
              streamSettings.requireVerifiedParticipants
                ? "border-rose-300 bg-rose-50 text-rose-800"
                : "border-[rgb(var(--border))] bg-[rgb(var(--card))] text-[rgb(var(--muted))]"
            }`}
            onClick={() =>
              updateStreamSettings({
                requireVerifiedParticipants: !streamSettings.requireVerifiedParticipants,
              })
            }
          >
            <p className="font-semibold">Teilnahme nur verifiziert</p>
            <p className="text-xs text-[rgb(var(--muted))]">
              Abstimmungen/Interaktion nur nach Verifizierung.
            </p>
          </button>
          <button
            className={`rounded-xl border px-3 py-3 text-left text-sm ${
              streamSettings.hideViewerCount
                ? "border-[rgb(var(--border))] bg-[rgb(var(--bg))] text-[rgb(var(--fg))]"
                : "border-[rgb(var(--border))] bg-[rgb(var(--card))] text-[rgb(var(--muted))]"
            }`}
            onClick={() => updateStreamSettings({ hideViewerCount: !streamSettings.hideViewerCount })}
          >
            <p className="font-semibold">Zuschauerzahl verstecken</p>
            <p className="text-xs text-[rgb(var(--muted))]">
              Sichtbar nur für Creator/Admin/Mods.
            </p>
          </button>
        </div>
      </section>

      <section className="rounded-2xl border border-[rgb(var(--border))] bg-[rgb(var(--card))] p-4 shadow-sm space-y-3">
        <div className="flex items-center justify-between gap-3">
          <div>
            <h2 className="text-sm font-semibold text-[rgb(var(--fg))]">Deliberation Mode</h2>
            <p className="text-xs text-[rgb(var(--muted))]">
              Phasen, Runden und Timer für strukturierte Live-Debatten.
            </p>
          </div>
          <button
            className={`rounded-full px-3 py-1 text-xs font-semibold ${
              deliberation?.enabled
                ? "border border-emerald-300 bg-emerald-50 text-emerald-700"
                : "border border-[rgb(var(--border))] bg-[rgb(var(--card))] text-[rgb(var(--muted))]"
            }`}
            onClick={() => updateDeliberation({ enabled: !deliberation?.enabled })}
          >
            {deliberation?.enabled ? "Aktiv" : "Inaktiv"}
          </button>
        </div>

        {delibError && <p className="text-xs text-rose-600">{delibError}</p>}
        {delibNotice && <p className="text-xs text-emerald-600">{delibNotice}</p>}

        <div className="grid gap-3 lg:grid-cols-3">
          <div className="rounded-xl border border-[rgb(var(--border))] p-3 text-xs">
            <p className="font-semibold text-[rgb(var(--fg))]">Aktuelle Phase</p>
            <p className="mt-1 text-[rgb(var(--muted))]">{phaseLabel}</p>
            <div className="mt-3 flex flex-wrap gap-2">
              {DELIBERATION_PHASES.map((phase) => (
                <button
                  key={phase.key}
                  className={`rounded-full border px-2.5 py-1 text-[11px] font-semibold ${
                    deliberation?.phase === phase.key
                      ? "border-[rgb(var(--border))] bg-slate-900 text-white"
                      : "border-[rgb(var(--border))] text-[rgb(var(--muted))]"
                  }`}
                  onClick={() => updateDeliberation({ phase: phase.key, enabled: true })}
                >
                  {phase.label}
                </button>
              ))}
            </div>
          </div>

          <div className="rounded-xl border border-[rgb(var(--border))] p-3 text-xs">
            <p className="font-semibold text-[rgb(var(--fg))]">Runde</p>
            <p className="mt-1 text-[rgb(var(--muted))]">Runde {deliberation?.round ?? 1}</p>
            <div className="mt-3 flex items-center gap-2">
              <button
                className="rounded-full border border-[rgb(var(--border))] px-3 py-1"
                onClick={() =>
                  updateDeliberation({ round: Math.max(1, (deliberation?.round ?? 1) - 1) })
                }
              >
                −
              </button>
              <button
                className="rounded-full border border-[rgb(var(--border))] bg-slate-900 px-3 py-1 text-white"
                onClick={() => updateDeliberation({ round: (deliberation?.round ?? 1) + 1 })}
              >
                +
              </button>
            </div>
          </div>

          <div className="rounded-xl border border-[rgb(var(--border))] p-3 text-xs">
            <p className="font-semibold text-[rgb(var(--fg))]">Timer</p>
            <p className="mt-1 text-[rgb(var(--muted))]">Ende: {roundEndsLabel}</p>
            <div className="mt-3 flex items-center gap-2">
              <input
                className="w-16 rounded-full border border-[rgb(var(--border))] px-2 py-1 text-xs text-[rgb(var(--muted))]"
                value={roundMinutes}
                onChange={(e) => setRoundMinutes(e.target.value)}
                inputMode="numeric"
              />
              <span className="text-[11px] text-[rgb(var(--muted))]">Min</span>
              <button
                className="rounded-full border border-[rgb(var(--border))] bg-slate-900 px-3 py-1 text-white"
                onClick={() => updateDeliberation({ roundMinutes: Number(roundMinutes) || 0 })}
              >
                Start
              </button>
              <button
                className="rounded-full border border-[rgb(var(--border))] px-3 py-1"
                onClick={() => updateDeliberation({ roundMinutes: 0 })}
              >
                Stop
              </button>
            </div>
          </div>

          <div className="rounded-xl border border-[rgb(var(--border))] p-3 text-xs">
            <p className="font-semibold text-[rgb(var(--fg))]">Fairness/Rotation</p>
            <p className="mt-1 text-[rgb(var(--muted))]">
              {deliberation?.fairnessMode === "rotation" ? "Rotation aktiv" : "Rotation inaktiv"}
            </p>
            <div className="mt-3 flex flex-wrap items-center gap-2">
              <button
                className={`rounded-full px-3 py-1 text-xs font-semibold ${
                  deliberation?.fairnessMode === "rotation"
                    ? "border border-emerald-300 bg-emerald-50 text-emerald-700"
                    : "border border-[rgb(var(--border))] bg-[rgb(var(--card))] text-[rgb(var(--muted))]"
                }`}
                onClick={() =>
                  updateDeliberation({
                    fairnessMode: deliberation?.fairnessMode === "rotation" ? "off" : "rotation",
                  })
                }
              >
                {deliberation?.fairnessMode === "rotation" ? "Rotation an" : "Rotation aus"}
              </button>
              <div className="flex items-center gap-2">
                <input
                  className="w-16 rounded-full border border-[rgb(var(--border))] px-2 py-1 text-xs text-[rgb(var(--muted))]"
                  value={rotationMinutes}
                  onChange={(e) => setRotationMinutes(e.target.value)}
                  inputMode="numeric"
                />
                <span className="text-[11px] text-[rgb(var(--muted))]">Min</span>
                <button
                  className="rounded-full border border-[rgb(var(--border))] bg-slate-900 px-3 py-1 text-white"
                  onClick={() =>
                    updateDeliberation({
                      rotationMinutes: Number(rotationMinutes) || 0,
                      fairnessMode: "rotation",
                    })
                  }
                >
                  Setzen
                </button>
              </div>
            </div>
            <p className="mt-2 text-[11px] text-[rgb(var(--muted))]">
              Rotation verteilt Redezeit gleichmäßiger (manuell moderiert).
            </p>
          </div>
        </div>
      </section>

      <section className="rounded-2xl border border-[rgb(var(--border))] bg-[rgb(var(--card))] p-4 shadow-sm space-y-3">
        <div>
          <h2 className="text-sm font-semibold text-[rgb(var(--fg))]">Session-Vorlagen</h2>
          <p className="text-xs text-[rgb(var(--muted))]">
            Schnellstart für typische Formate (passt du spaeter an).
          </p>
        </div>
        <div className="flex flex-wrap gap-2">
          {sessionTemplates.map((tpl) => (
            <button
              key={tpl.id}
              className="rounded-full border border-[rgb(var(--border))] px-3 py-1 text-xs font-semibold text-[rgb(var(--muted))] hover:border-sky-300"
              onClick={() => applyTemplate(tpl)}
            >
              {tpl.label}
            </button>
          ))}
        </div>
      </section>

      <section className="rounded-2xl border border-[rgb(var(--border))] bg-[rgb(var(--card))] p-4 shadow-sm space-y-4">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div>
            <h2 className="text-sm font-semibold text-[rgb(var(--fg))]">Moderations-Queue</h2>
            <p className="text-xs text-[rgb(var(--muted))]">
              Eingehende Bausteine sammeln, taggen und freigeben.
            </p>
          </div>
          <div className="flex flex-wrap gap-2 text-xs">
            {(["all", "queued", "approved", "rejected"] as const).map((key) => (
              <button
                key={key}
                className={`rounded-full border px-3 py-1 font-semibold ${
                  queueFilter === key ? "border-[rgb(var(--border))] bg-slate-900 text-white" : "border-[rgb(var(--border))] text-[rgb(var(--muted))]"
                }`}
                onClick={() => setQueueFilter(key)}
              >
                {key === "all" ? "Alle" : key === "queued" ? "Offen" : key === "approved" ? "Freigegeben" : "Abgelehnt"}{" "}
                ({queueCounts[key]})
              </button>
            ))}
          </div>
        </div>

        {queueError && <p className="text-xs text-rose-600">{queueError}</p>}
        {queueNotice && <p className="text-xs text-emerald-600">{queueNotice}</p>}

        <div className="grid gap-4 lg:grid-cols-3">
          <div className="lg:col-span-2 space-y-3">
            {queueLoading ? (
              <p className="text-sm text-[rgb(var(--muted))]">Queue wird geladen…</p>
            ) : visibleQueueItems.length === 0 ? (
              <p className="text-sm text-[rgb(var(--muted))]">Keine Einträge in dieser Ansicht.</p>
            ) : (
              <ul className="space-y-2">
                {visibleQueueItems.map((item) => (
                  <li key={item._id} className="rounded-xl border border-[rgb(var(--border))] p-3">
                    <div className="flex flex-wrap items-center justify-between gap-2">
                      <div className="flex flex-wrap items-center gap-2 text-xs">
                        <span className="rounded-full bg-[rgb(var(--bg))] px-2 py-0.5 font-semibold text-[rgb(var(--muted))]">
                          {QUEUE_KIND_LABELS[item.kind]}
                        </span>
                        <span
                          className={`rounded-full px-2 py-0.5 font-semibold ${
                            item.status === "approved"
                              ? "bg-emerald-100 text-emerald-700"
                              : item.status === "rejected"
                                ? "bg-rose-100 text-rose-700"
                                : "bg-amber-100 text-amber-700"
                          }`}
                        >
                          {item.status === "approved" ? "Freigegeben" : item.status === "rejected" ? "Abgelehnt" : "Offen"}
                        </span>
                      </div>
                      <div className="flex flex-wrap gap-2 text-xs">
                        {item.status !== "approved" && (
                          <button
                            className="rounded-full border border-emerald-300 px-3 py-1 text-emerald-700"
                            onClick={() => updateQueueStatus(item._id, "approved")}
                          >
                            Freigeben
                          </button>
                        )}
                        {item.status !== "rejected" && (
                          <button
                            className="rounded-full border border-rose-300 px-3 py-1 text-rose-700"
                            onClick={() => updateQueueStatus(item._id, "rejected")}
                          >
                            Ablehnen
                          </button>
                        )}
                        {item.status !== "queued" && (
                          <button
                            className="rounded-full border border-[rgb(var(--border))] px-3 py-1 text-[rgb(var(--muted))]"
                            onClick={() => updateQueueStatus(item._id, "queued")}
                          >
                            Zurücksetzen
                          </button>
                        )}
                      </div>
                    </div>
                    <p className="mt-2 text-sm text-[rgb(var(--fg))]">{item.text}</p>
                    {item.sourceUrl && (
                      <a className="mt-2 block text-xs text-sky-700 underline" href={item.sourceUrl} target="_blank" rel="noreferrer">
                        Quelle öffnen
                      </a>
                    )}
                    {item.notes && <p className="mt-2 text-xs text-[rgb(var(--muted))]">{item.notes}</p>}
                  </li>
                ))}
              </ul>
            )}
          </div>

          <div className="space-y-3 rounded-xl border border-[rgb(var(--border))] p-3">
            <h3 className="text-xs font-semibold text-[rgb(var(--fg))]">Neuer Queue-Eintrag</h3>
            <label className="text-[11px] font-semibold uppercase tracking-wide text-[rgb(var(--muted))]">Baustein</label>
            <select
              className="w-full rounded-xl border border-[rgb(var(--border))] px-3 py-2 text-xs"
              value={queueDraftKind}
              onChange={(e) => setQueueDraftKind(e.target.value as ModerationQueueItem["kind"])}
            >
              {Object.entries(QUEUE_KIND_LABELS).map(([key, label]) => (
                <option key={key} value={key}>
                  {label}
                </option>
              ))}
            </select>
            <label className="text-[11px] font-semibold uppercase tracking-wide text-[rgb(var(--muted))]">Inhalt</label>
            <textarea
              className="w-full rounded-xl border border-[rgb(var(--border))] px-3 py-2 text-xs"
              rows={4}
              placeholder="Kurzer, klarer Bausteintext"
              value={queueDraftText}
              onChange={(e) => setQueueDraftText(e.target.value)}
            />
            <label className="text-[11px] font-semibold uppercase tracking-wide text-[rgb(var(--muted))]">Quelle (optional)</label>
            <input
              className="w-full rounded-xl border border-[rgb(var(--border))] px-3 py-2 text-xs"
              placeholder="https://..."
              value={queueDraftSource}
              onChange={(e) => setQueueDraftSource(e.target.value)}
            />
            <label className="text-[11px] font-semibold uppercase tracking-wide text-[rgb(var(--muted))]">Notiz (optional)</label>
            <textarea
              className="w-full rounded-xl border border-[rgb(var(--border))] px-3 py-2 text-xs"
              rows={2}
              placeholder="Moderationsnotiz"
              value={queueDraftNotes}
              onChange={(e) => setQueueDraftNotes(e.target.value)}
            />
            <button
              className="w-full rounded-full border border-[rgb(var(--border))] bg-slate-900 px-3 py-2 text-xs font-semibold text-white"
              onClick={addQueueItem}
            >
              In Queue aufnehmen
            </button>
          </div>
        </div>
      </section>

      <section className="rounded-2xl border border-[rgb(var(--border))] bg-[rgb(var(--card))] p-4 shadow-sm space-y-4">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div>
            <h2 className="text-sm font-semibold text-[rgb(var(--fg))]">Live-Dossier-Board</h2>
            <p className="text-xs text-[rgb(var(--muted))]">
              Kurze Optionslage inkl. Pro/Contra, Quellen und offenen Fragen – öffentlich sichtbar.
            </p>
          </div>
          <div className="flex flex-wrap items-center gap-2 text-xs">
            {boardLoading && <span className="text-[rgb(var(--muted))]">lädt…</span>}
            {liveBoard.updatedAt && (
              <span className="text-[rgb(var(--muted))]">
                Stand:{" "}
                {new Date(liveBoard.updatedAt).toLocaleString("de-DE", { dateStyle: "short", timeStyle: "short" })}
              </span>
            )}
            <button
              className="rounded-full border border-[rgb(var(--border))] px-3 py-1 text-[rgb(var(--muted))]"
              onClick={addBoardOption}
            >
              Option hinzufügen
            </button>
            <button
              className="rounded-full border border-[rgb(var(--border))] bg-slate-900 px-3 py-1 text-white"
              onClick={saveLiveBoard}
            >
              Speichern
            </button>
          </div>
        </div>

        {boardError && <p className="text-xs text-rose-600">{boardError}</p>}
        {boardNotice && <p className="text-xs text-emerald-600">{boardNotice}</p>}

        <div className="grid gap-4 lg:grid-cols-3">
          <div className="lg:col-span-1 space-y-3">
            <label className="text-[11px] font-semibold uppercase tracking-wide text-[rgb(var(--muted))]">Titel</label>
            <input
              className="w-full rounded-xl border border-[rgb(var(--border))] px-3 py-2 text-xs"
              value={liveBoard.title}
              onChange={(e) => setLiveBoard((prev) => ({ ...prev, title: e.target.value }))}
            />
            <label className="text-[11px] font-semibold uppercase tracking-wide text-[rgb(var(--muted))]">Kurzfassung</label>
            <textarea
              className="w-full rounded-xl border border-[rgb(var(--border))] px-3 py-2 text-xs"
              rows={5}
              value={liveBoard.summary ?? ""}
              onChange={(e) => setLiveBoard((prev) => ({ ...prev, summary: e.target.value }))}
              placeholder="1–2 Sätze, was die Lage ist und worüber abgestimmt wird."
            />
          </div>

          <div className="lg:col-span-2 space-y-3">
            {liveBoard.options.length === 0 ? (
              <p className="text-sm text-[rgb(var(--muted))]">
                Noch keine Optionen. Erstelle 3–5 Optionen, um das Live‑Dossier zu füllen.
              </p>
            ) : (
              liveBoard.options.map((opt, index) => (
                <div key={opt.id} className="rounded-xl border border-[rgb(var(--border))] p-3 space-y-3">
                  <div className="flex flex-wrap items-center justify-between gap-2">
                    <p className="text-xs font-semibold text-[rgb(var(--muted))]">Option {index + 1}</p>
                    <button
                      className="rounded-full border border-[rgb(var(--border))] px-3 py-1 text-xs text-[rgb(var(--muted))]"
                      onClick={() => removeBoardOption(opt.id)}
                    >
                      Entfernen
                    </button>
                  </div>
                  <input
                    className="w-full rounded-xl border border-[rgb(var(--border))] px-3 py-2 text-sm font-semibold"
                    value={opt.title}
                    onChange={(e) => updateBoardOption(opt.id, { title: e.target.value })}
                    placeholder="Optionstitel"
                  />
                  <div className="grid gap-3 md:grid-cols-2">
                    <div className="space-y-1">
                      <label className="text-[11px] font-semibold uppercase tracking-wide text-[rgb(var(--muted))]">Pro</label>
                      <textarea
                        className="w-full rounded-xl border border-[rgb(var(--border))] px-3 py-2 text-xs"
                        rows={3}
                        value={opt.pros.join("\n")}
                        onChange={(e) => updateBoardList(opt.id, "pros", e.target.value)}
                        placeholder="je Zeile ein Argument"
                      />
                    </div>
                    <div className="space-y-1">
                      <label className="text-[11px] font-semibold uppercase tracking-wide text-[rgb(var(--muted))]">Contra</label>
                      <textarea
                        className="w-full rounded-xl border border-[rgb(var(--border))] px-3 py-2 text-xs"
                        rows={3}
                        value={opt.cons.join("\n")}
                        onChange={(e) => updateBoardList(opt.id, "cons", e.target.value)}
                        placeholder="je Zeile ein Risiko"
                      />
                    </div>
                    <div className="space-y-1">
                      <label className="text-[11px] font-semibold uppercase tracking-wide text-[rgb(var(--muted))]">Quellen</label>
                      <textarea
                        className="w-full rounded-xl border border-[rgb(var(--border))] px-3 py-2 text-xs"
                        rows={3}
                        value={opt.sources.join("\n")}
                        onChange={(e) => updateBoardList(opt.id, "sources", e.target.value)}
                        placeholder="URL pro Zeile"
                      />
                    </div>
                    <div className="space-y-1">
                      <label className="text-[11px] font-semibold uppercase tracking-wide text-[rgb(var(--muted))]">
                        Offene Fragen
                      </label>
                      <textarea
                        className="w-full rounded-xl border border-[rgb(var(--border))] px-3 py-2 text-xs"
                        rows={3}
                        value={opt.openQuestions.join("\n")}
                        onChange={(e) => updateBoardList(opt.id, "openQuestions", e.target.value)}
                        placeholder="je Zeile eine offene Frage"
                      />
                    </div>
                  </div>
                </div>
              ))
            )}
          </div>
        </div>
      </section>

      <section className="rounded-2xl border border-[rgb(var(--border))] bg-[rgb(var(--card))] p-4 shadow-sm space-y-4">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div>
            <h2 className="text-sm font-semibold text-[rgb(var(--fg))]">Follow-up Tracker</h2>
            <p className="text-xs text-[rgb(var(--muted))]">
              Status-Updates nach der Abstimmung (eingereicht → Prüfung → angenommen/teilweise/abgelehnt).
            </p>
          </div>
          <div className="flex flex-wrap items-center gap-2 text-xs">
            {followUpLoading && <span className="text-[rgb(var(--muted))]">lädt…</span>}
            {followUp.updatedAt && (
              <span className="text-[rgb(var(--muted))]">
                Stand:{" "}
                {new Date(followUp.updatedAt).toLocaleString("de-DE", {
                  dateStyle: "short",
                  timeStyle: "short",
                })}
              </span>
            )}
          </div>
        </div>

        {followUpError && <p className="text-xs text-rose-600">{followUpError}</p>}
        {followUpNotice && <p className="text-xs text-emerald-600">{followUpNotice}</p>}

        <div className="grid gap-4 lg:grid-cols-3">
          <div className="space-y-3 rounded-xl border border-[rgb(var(--border))] p-3">
            <label className="text-[11px] font-semibold uppercase tracking-wide text-[rgb(var(--muted))]">Status</label>
            <select
              className="w-full rounded-xl border border-[rgb(var(--border))] px-3 py-2 text-xs"
              value={followUpStatus}
              onChange={(e) => setFollowUpStatus(e.target.value as FollowUpUpdate["status"])}
            >
              <option value="submitted">Eingereicht</option>
              <option value="in_review">In Prüfung</option>
              <option value="accepted">Angenommen</option>
              <option value="partial">Teilweise</option>
              <option value="rejected">Abgelehnt</option>
            </select>
            <label className="text-[11px] font-semibold uppercase tracking-wide text-[rgb(var(--muted))]">Update-Text</label>
            <textarea
              className="w-full rounded-xl border border-[rgb(var(--border))] px-3 py-2 text-xs"
              rows={4}
              value={followUpNote}
              onChange={(e) => setFollowUpNote(e.target.value)}
              placeholder="Was ist seit dem letzten Stand passiert?"
            />
            <label className="text-[11px] font-semibold uppercase tracking-wide text-[rgb(var(--muted))]">Link (optional)</label>
            <input
              className="w-full rounded-xl border border-[rgb(var(--border))] px-3 py-2 text-xs"
              placeholder="https://..."
              value={followUpLink}
              onChange={(e) => setFollowUpLink(e.target.value)}
            />
            <button
              className="w-full rounded-full border border-[rgb(var(--border))] bg-slate-900 px-3 py-2 text-xs font-semibold text-white"
              onClick={addFollowUpUpdate}
            >
              Update hinzufügen
            </button>
            <div className="pt-2 text-xs text-[rgb(var(--muted))]">
              Erinnerung:
              <div className="mt-2 flex flex-wrap gap-2">
                {[7, 30, 90].map((days) => (
                  <button
                    key={days}
                    className="rounded-full border border-[rgb(var(--border))] px-3 py-1"
                    onClick={() => setFollowUpReminder(days)}
                  >
                    +{days} Tage
                  </button>
                ))}
              </div>
              {followUp.nextReminderAt && (
                <p className="mt-2 text-[rgb(var(--muted))]">
                  Nächste Erinnerung:{" "}
                  {new Date(followUp.nextReminderAt).toLocaleDateString("de-DE", {
                    dateStyle: "medium",
                  })}
                </p>
              )}
            </div>
          </div>

          <div className="lg:col-span-2 space-y-3">
            {followUp.updates.length === 0 ? (
              <p className="text-sm text-[rgb(var(--muted))]">Noch keine Follow-up Updates.</p>
            ) : (
              <ul className="space-y-2">
                {followUp.updates.map((update) => (
                  <li key={update.id} className="rounded-xl border border-[rgb(var(--border))] p-3">
                    <div className="flex flex-wrap items-center justify-between gap-2 text-xs">
                      <span className="rounded-full bg-[rgb(var(--bg))] px-2 py-0.5 font-semibold text-[rgb(var(--muted))]">
                        {update.status === "submitted"
                          ? "Eingereicht"
                          : update.status === "in_review"
                            ? "In Prüfung"
                            : update.status === "accepted"
                              ? "Angenommen"
                              : update.status === "partial"
                                ? "Teilweise"
                                : "Abgelehnt"}
                      </span>
                      {update.createdAt && (
                        <span className="text-[rgb(var(--muted))]">
                          {new Date(update.createdAt).toLocaleString("de-DE", {
                            dateStyle: "short",
                            timeStyle: "short",
                          })}
                        </span>
                      )}
                    </div>
                    <p className="mt-2 text-sm text-[rgb(var(--fg))]">{update.note}</p>
                    {update.link && (
                      <a className="mt-2 block text-xs text-sky-700 underline" href={update.link} target="_blank" rel="noreferrer">
                        {update.link}
                      </a>
                    )}
                  </li>
                ))}
              </ul>
            )}
          </div>
        </div>
      </section>

      <section className="rounded-2xl border border-[rgb(var(--border))] bg-[rgb(var(--card))] p-4 shadow-sm space-y-4">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div>
            <h2 className="text-sm font-semibold text-[rgb(var(--fg))]">Call-ins & Kleingruppen</h2>
            <p className="text-xs text-[rgb(var(--muted))]">
              Einladungen verwalten und Live-Status steuern (rotierend, fair, nachvollziehbar).
            </p>
          </div>
          {callInsLoading && <span className="text-xs text-[rgb(var(--muted))]">lädt…</span>}
        </div>

        {callInsError && <p className="text-xs text-rose-600">{callInsError}</p>}
        {callInsNotice && <p className="text-xs text-emerald-600">{callInsNotice}</p>}

        <div className="grid gap-4 lg:grid-cols-3">
          <div className="space-y-3 rounded-xl border border-[rgb(var(--border))] p-3">
            <label className="text-[11px] font-semibold uppercase tracking-wide text-[rgb(var(--muted))]">Name</label>
            <input
              className="w-full rounded-xl border border-[rgb(var(--border))] px-3 py-2 text-xs"
              value={callInName}
              onChange={(e) => setCallInName(e.target.value)}
              placeholder="Teilnehmer:in"
            />
            <label className="text-[11px] font-semibold uppercase tracking-wide text-[rgb(var(--muted))]">Handle (optional)</label>
            <input
              className="w-full rounded-xl border border-[rgb(var(--border))] px-3 py-2 text-xs"
              value={callInHandle}
              onChange={(e) => setCallInHandle(e.target.value)}
              placeholder="@name"
            />
            <label className="text-[11px] font-semibold uppercase tracking-wide text-[rgb(var(--muted))]">Kanal/Call (optional)</label>
            <input
              className="w-full rounded-xl border border-[rgb(var(--border))] px-3 py-2 text-xs"
              value={callInChannel}
              onChange={(e) => setCallInChannel(e.target.value)}
              placeholder="Discord Stage / Zoom / etc."
            />
            <label className="text-[11px] font-semibold uppercase tracking-wide text-[rgb(var(--muted))]">Notiz</label>
            <textarea
              className="w-full rounded-xl border border-[rgb(var(--border))] px-3 py-2 text-xs"
              rows={3}
              value={callInNotes}
              onChange={(e) => setCallInNotes(e.target.value)}
              placeholder="Rolle, Gruppe, Hintergrund"
            />
            <button
              className="w-full rounded-full border border-[rgb(var(--border))] bg-slate-900 px-3 py-2 text-xs font-semibold text-white"
              onClick={addCallIn}
            >
              Call-in hinzufügen
            </button>
          </div>

          <div className="lg:col-span-2 space-y-3">
            {callIns.length === 0 ? (
              <p className="text-sm text-[rgb(var(--muted))]">Noch keine Call-ins.</p>
            ) : (
              <ul className="space-y-2">
                {callIns.map((item) => (
                  <li key={item._id} className="rounded-xl border border-[rgb(var(--border))] p-3 space-y-2">
                    <div className="flex flex-wrap items-center justify-between gap-2">
                      <div>
                        <p className="text-sm font-semibold text-[rgb(var(--fg))]">{item.name}</p>
                        <p className="text-xs text-[rgb(var(--muted))]">
                          {item.handle ? `@${item.handle.replace(/^@/, "")}` : "ohne Handle"}{" "}
                          {item.channel ? `• ${item.channel}` : ""}
                        </p>
                      </div>
                      <span
                        className={`rounded-full px-2 py-0.5 text-xs font-semibold ${
                          item.status === "live"
                            ? "bg-emerald-100 text-emerald-700"
                            : item.status === "ready"
                              ? "bg-amber-100 text-amber-700"
                              : item.status === "removed"
                                ? "bg-rose-100 text-rose-700"
                                : "bg-[rgb(var(--bg))] text-[rgb(var(--muted))]"
                        }`}
                      >
                        {item.status === "live"
                          ? "Live"
                          : item.status === "ready"
                            ? "Bereit"
                            : item.status === "removed"
                              ? "Entfernt"
                              : "Eingeladen"}
                      </span>
                    </div>
                    {item.notes && <p className="text-xs text-[rgb(var(--muted))]">{item.notes}</p>}
                    <div className="flex flex-wrap gap-2 text-xs">
                      <button
                        className="rounded-full border border-[rgb(var(--border))] px-3 py-1"
                        onClick={() => updateCallInStatus(item._id, "invited")}
                      >
                        Eingeladen
                      </button>
                      <button
                        className="rounded-full border border-amber-300 px-3 py-1 text-amber-700"
                        onClick={() => updateCallInStatus(item._id, "ready")}
                      >
                        Bereit
                      </button>
                      <button
                        className="rounded-full border border-emerald-300 px-3 py-1 text-emerald-700"
                        onClick={() => updateCallInStatus(item._id, "live")}
                      >
                        Live
                      </button>
                      <button
                        className="rounded-full border border-rose-300 px-3 py-1 text-rose-700"
                        onClick={() => updateCallInStatus(item._id, "removed")}
                      >
                        Entfernen
                      </button>
                    </div>
                  </li>
                ))}
              </ul>
            )}
          </div>
        </div>
      </section>

      <div className="grid gap-4 lg:grid-cols-3">
        <section className="rounded-2xl border border-[rgb(var(--border))] bg-[rgb(var(--card))] p-4 shadow-sm space-y-3">
          <div className="flex items-center justify-between gap-3">
            <h2 className="text-sm font-semibold text-[rgb(var(--fg))]">Agenda</h2>
            <button
              className="rounded-full border border-[rgb(var(--border))] px-3 py-1 text-xs font-semibold"
              onClick={autofillAgenda}
              disabled={autofilling}
            >
              {autofilling ? "Agenda wird gefüllt…" : "Agenda aus Thema füllen"}
            </button>
          </div>
          {autofillError && (
            <p className="text-xs text-rose-600">{autofillError}</p>
          )}
          {loading ? (
            <p className="text-sm text-[rgb(var(--muted))]">Lädt …</p>
          ) : (
            <ul className="space-y-2 text-sm text-[rgb(var(--muted))]">
              {items.map((item) => (
                <li key={item._id} className="rounded-xl border border-[rgb(var(--border))] p-3">
                  <p className="font-semibold text-[rgb(var(--fg))]">{item.customQuestion || item.description || item.kind}</p>
                  <p className="text-xs text-[rgb(var(--muted))] mb-2">Status: {item.status}</p>
                  <div className="flex flex-wrap gap-2 text-xs">
                    <button
                      className="rounded-full border border-[rgb(var(--border))] bg-slate-900 px-3 py-1 text-white disabled:cursor-not-allowed disabled:opacity-50"
                      onClick={async () => {
                        try {
                          await updateItem(item._id, "go_live");
                          setNotice("Aktiver Tagespunkt aktualisiert.");
                        } catch (err: any) {
                          setError(err?.message ?? "Aktivieren fehlgeschlagen.");
                        }
                      }}
                      disabled={!preStreamReady}
                    >
                      {preStreamReady ? "Aktiv setzen" : "Identity Check offen"}
                    </button>
                    <button
                      className="rounded-full border border-[rgb(var(--border))] px-3 py-1"
                      onClick={async () => {
                        try {
                          await updateItem(item._id, "skip");
                          setNotice("Item wurde übersprungen.");
                        } catch (err: any) {
                          setError(err?.message ?? "Aktion fehlgeschlagen.");
                        }
                      }}
                    >
                      Skip
                    </button>
                    <button
                      className="rounded-full border border-[rgb(var(--border))] px-3 py-1"
                      onClick={async () => {
                        try {
                          await updateItem(item._id, "archive");
                          setNotice("Item wurde archiviert.");
                        } catch (err: any) {
                          setError(err?.message ?? "Aktion fehlgeschlagen.");
                        }
                      }}
                    >
                      Archiv
                    </button>
                  </div>
                  <div className="mt-3 flex flex-wrap items-center gap-2">
                    <input
                      className="min-w-[240px] flex-1 rounded-xl border border-[rgb(var(--border))] px-3 py-2 text-xs"
                      placeholder={`/qr/${qrCode ?? "deinCode"} oder ${publicStreamPath}?agendaItemId=${item._id}`}
                      value={qrDraftByItem[item._id] ?? ""}
                      onChange={(e) =>
                        setQrDraftByItem((prev) => ({ ...prev, [item._id]: e.target.value }))
                      }
                    />
                    <button
                      className="rounded-full border border-[rgb(var(--border))] px-3 py-1 text-xs"
                      onClick={() => saveQrTarget(item._id)}
                    >
                      QR-Ziel speichern
                    </button>
                  </div>
                </li>
              ))}
            </ul>
          )}
        </section>

        <section className="rounded-2xl border border-[rgb(var(--border))] bg-[rgb(var(--card))] p-4 shadow-sm space-y-3">
          <h2 className="text-sm font-semibold text-[rgb(var(--fg))]">Live</h2>
          {liveItem ? (
            <div>
              <p className="text-xl font-semibold text-[rgb(var(--fg))]">{liveItem.customQuestion || liveItem.description}</p>
              {liveItem.kind === "poll" && (
                <ul className="mt-3 space-y-2">
                  {(liveItem.pollOptions ?? []).map((opt) => (
                    <li key={opt} className="rounded-lg bg-[rgb(var(--bg))] px-3 py-2 text-sm">
                      {opt}
                    </li>
                  ))}
                </ul>
              )}
              <p className="mt-3 text-xs text-amber-600">
                {liveItem.publicAttribution === "public"
                  ? "Achtung: Öffentliche Abstimmung – Teilnehmer:innen werden sichtbar angezeigt."
                  : "Anonyme Abstimmung aktiv."}
              </p>
            </div>
          ) : (
            <p className="text-sm text-[rgb(var(--muted))]">Noch kein Item live.</p>
          )}
        </section>

        <section className="rounded-2xl border border-[rgb(var(--border))] bg-[rgb(var(--card))] p-4 shadow-sm space-y-3">
          <h2 className="text-sm font-semibold text-[rgb(var(--fg))]">Neues Item</h2>
          <textarea
            className="w-full rounded-xl border border-[rgb(var(--border))] px-3 py-2 text-sm"
            placeholder="Frage oder Statement"
            rows={4}
            value={question}
            onChange={(e) => setQuestion(e.target.value)}
          />
          <label className="text-xs font-semibold text-[rgb(var(--muted))]">Poll-Optionen (eine pro Zeile)</label>
          <textarea
            className="w-full rounded-xl border border-[rgb(var(--border))] px-3 py-2 text-sm"
            rows={3}
            value={pollOptions}
            onChange={(e) => setPollOptions(e.target.value)}
          />
          <div className="flex flex-wrap gap-2">
            <button
              className="rounded-full border border-[rgb(var(--border))] px-3 py-1 text-sm"
              onClick={() => addQuestion("question")}
            >
              Frage anlegen
            </button>
            <button
              className="rounded-full border border-[rgb(var(--border))] bg-slate-900 px-3 py-1 text-sm text-white"
              onClick={() => addQuestion("poll")}
            >
              Poll anlegen
            </button>
          </div>
        </section>

        <section className="rounded-2xl border border-[rgb(var(--border))] bg-[rgb(var(--card))] p-4 shadow-sm space-y-3">
          <div className="flex items-center justify-between">
            <h2 className="text-sm font-semibold text-[rgb(var(--fg))]">QR Fragen-Set</h2>
            <button
              className="rounded-full border border-[rgb(var(--border))] px-3 py-1 text-xs font-semibold"
              onClick={addQrQuestion}
              disabled={qrQuestions.length >= 5}
            >
              Frage hinzufügen
            </button>
          </div>
          {qrError && <p className="text-xs text-rose-600">{qrError}</p>}
          {qrNotice && <p className="text-xs text-emerald-600">{qrNotice}</p>}
          {qrCode && (
            <p className="text-xs text-[rgb(var(--muted))]">
              QR-Link: <a className="underline" href={`/qr/${qrCode}`}>{`/qr/${qrCode}`}</a>
            </p>
          )}
          <div className="space-y-3">
            {qrQuestions.map((q, idx) => (
              <div key={idx} className="rounded-xl border border-[rgb(var(--border))] p-3 space-y-2">
                <div className="flex items-center justify-between">
                  <p className="text-xs font-semibold text-[rgb(var(--muted))]">Frage {idx + 1}</p>
                  <button
                    className="text-xs underline text-[rgb(var(--muted))]"
                    onClick={() => toggleQrVisibility(idx)}
                  >
                    {q.publicAttribution === "public" ? "Nicht anonym" : "Anonym"}
                  </button>
                </div>
                <input
                  className="w-full rounded-xl border border-[rgb(var(--border))] px-3 py-2 text-sm"
                  placeholder="Frage"
                  value={q.title}
                  onChange={(e) => updateQrQuestion(idx, { title: e.target.value })}
                />
                <textarea
                  className="w-full rounded-xl border border-[rgb(var(--border))] px-3 py-2 text-sm"
                  placeholder="Eventualitäten / Optionen (eine pro Zeile)"
                  rows={3}
                  value={q.options}
                  onChange={(e) => updateQrQuestion(idx, { options: e.target.value })}
                />
              </div>
            ))}
          </div>
          <button
            className="rounded-full border border-[rgb(var(--border))] bg-slate-900 px-4 py-2 text-sm text-white"
            onClick={createQrSet}
            disabled={qrCreating}
          >
            {qrCreating ? "QR-Set wird erstellt…" : "QR-Set erstellen"}
          </button>
        </section>
      </div>
    </main>
  );
}
