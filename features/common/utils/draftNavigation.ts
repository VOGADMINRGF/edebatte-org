type DraftPayload = {
  kind: string;
  text: string;
  analysis?: Record<string, unknown>;
};

function safeJsonParse(input: string) {
  try {
    return JSON.parse(input);
  } catch {
    return null;
  }
}

function buildUrl(path: string, params: Record<string, string>) {
  const [pathAndQuery, hash = ""] = path.split("#");
  const [base, query = ""] = pathAndQuery.split("?");
  const searchParams = new URLSearchParams(query);
  Object.entries(params).forEach(([key, value]) => {
    searchParams.set(key, value);
  });
  const nextQuery = searchParams.toString();
  const nextPath = nextQuery ? `${base}?${nextQuery}` : base;
  return hash ? `${nextPath}#${hash}` : nextPath;
}

export function buildPrefillUrl(path: string, text: string) {
  return buildUrl(path, { prefill: text });
}

export function buildDraftUrl(path: string, draftId: string) {
  return buildUrl(path, { draftId });
}

const LAST_DRAFT_KEY = "edb_last_draft_v1";

type LastDraft = {
  id: string;
  targetPath: string;
  text: string;
  createdAt: string;
};

function rememberLastDraft(draft: LastDraft) {
  try {
    window.localStorage.setItem(LAST_DRAFT_KEY, JSON.stringify(draft));
  } catch {
    // ignore
  }
}

export function getLastDraft(): LastDraft | null {
  try {
    const raw = window.localStorage.getItem(LAST_DRAFT_KEY);
    if (!raw) return null;
    const parsed = JSON.parse(raw) as LastDraft;
    if (!parsed?.id || !parsed?.targetPath) return null;
    return parsed;
  } catch {
    return null;
  }
}

export async function createDraft(payload: DraftPayload): Promise<string | null> {
  try {
    const res = await fetch("/api/drafts", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(payload),
    });
    if (!res.ok) return null;
    const raw = await res.text();
    const data = safeJsonParse(raw);
    return typeof data?.id === "string" ? data.id : null;
  } catch {
    return null;
  }
}

export async function createDraftAndNavigate({
  kind,
  text,
  targetPath,
  fallbackPath,
  analysis,
}: {
  kind: string;
  text: string;
  targetPath: string;
  fallbackPath: string;
  analysis?: Record<string, unknown>;
}) {
  const trimmed = text.trim();
  const safeFallback = trimmed ? fallbackPath : targetPath;
  const draftId = trimmed ? await createDraft({ kind, text: trimmed, analysis }) : null;
  if (draftId) {
    rememberLastDraft({
      id: draftId,
      targetPath,
      text: trimmed,
      createdAt: new Date().toISOString(),
    });
  }
  const nextHref = draftId ? buildDraftUrl(targetPath, draftId) : safeFallback;
  window.location.assign(nextHref);
}
