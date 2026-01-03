export type EditorialFeedbackAction =
  | { type: "mark_evidence_sufficient"; claim: string; note?: string }
  | { type: "mark_evidence_insufficient"; claim: string; note?: string }
  | { type: "disagree_flag"; flagKind: "agency" | "euphemism" | "power"; payload: any; note?: string }
  | { type: "add_missing_voice"; voice: string; note?: string }
  | { type: "confirm_flag"; flagKind: "agency" | "euphemism" | "power"; key: string; note?: string }
  | { type: "reject_flag"; flagKind: "agency" | "euphemism" | "power"; key: string; note?: string }
  | { type: "attach_context_pack"; packId: string; note?: string };

export type EditorialFeedbackPayload = {
  context?: {
    contributionId?: string;
    statementId?: string;
    url?: string;
  };
  action: EditorialFeedbackAction;
  ts: string;
};

export async function postEditorialFeedback(payload: EditorialFeedbackPayload): Promise<void> {
  try {
    await fetch("/api/editorial/feedback", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(payload),
    });
  } catch {
    // no-op: feedback must never break UX
  }
}

export async function postEditorialFeedbackBulk(
  items: EditorialFeedbackPayload[],
): Promise<string[] | null> {
  if (!Array.isArray(items) || items.length === 0) return null;
  try {
    const res = await fetch("/api/editorial/feedback/bulk", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ items }),
    });
    const data = await res.json().catch(() => ({}));
    return Array.isArray(data?.ids) ? data.ids : null;
  } catch {
    return null;
  }
}

export async function fetchEditorialFeedback(params: {
  contributionId?: string;
  statementId?: string;
  limit?: number;
}): Promise<any[] | null> {
  try {
    const qs = new URLSearchParams();
    if (params.contributionId) qs.set("contributionId", params.contributionId);
    if (params.statementId) qs.set("statementId", params.statementId);
    if (params.limit) qs.set("limit", String(params.limit));
    const res = await fetch(`/api/editorial/feedback?${qs.toString()}`, { method: "GET" });
    const data = await res.json();
    return data?.items ?? null;
  } catch {
    return null;
  }
}
