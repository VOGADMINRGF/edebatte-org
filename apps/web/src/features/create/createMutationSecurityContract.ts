export const CREATE_MUTATION_CSRF_HEADER = "x-edebatte-create-csrf";
export const CREATE_MUTATION_CSRF_VALUE = "create-mutation-v1";
export const CREATE_HONEYPOT_HEADER = "x-edebatte-create-meta";
export const CREATE_CLIENT_SESSION_HEADER = "x-edebatte-create-client";
export const CREATE_MAX_TEXT_LENGTH = 10_000;
export const CREATE_MAX_CONTEXT_LENGTH = 2_000;
export const CREATE_MAX_URL_LENGTH = 2_048;

export type CreateAnonymousStorageContext = {
  namespace: string;
  expiresAt: string;
};

const CREATE_HONEYPOT_ID = "edebatte-create-request-note";
const CREATE_CLIENT_SESSION_STORAGE_KEY = "edebatte:create:client-session:v1";
let createSecuritySessionPrimed = false;
let createSecuritySessionPromise: Promise<CreateAnonymousStorageContext | null> | null = null;
let createAnonymousStorageContext: CreateAnonymousStorageContext | null = null;

function parseAnonymousStorageContext(value: unknown): CreateAnonymousStorageContext | null {
  if (!value || typeof value !== "object" || Array.isArray(value)) return null;
  const record = value as Record<string, unknown>;
  const namespace = typeof record.namespace === "string" ? record.namespace.trim() : "";
  const expiresAt = typeof record.expiresAt === "string" ? record.expiresAt.trim() : "";
  const expiresAtMs = Date.parse(expiresAt);
  if (!/^g1_[A-Za-z0-9_-]{32,96}$/.test(namespace)) return null;
  if (!Number.isFinite(expiresAtMs) || expiresAtMs <= Date.now()) return null;
  return { namespace, expiresAt: new Date(expiresAtMs).toISOString() };
}

export function readCreateAnonymousStorageContext(): CreateAnonymousStorageContext | null {
  const parsed = parseAnonymousStorageContext(createAnonymousStorageContext);
  if (!parsed) createAnonymousStorageContext = null;
  return parsed;
}

function createClientSessionId() {
  if (typeof globalThis.crypto?.randomUUID === "function") {
    return globalThis.crypto.randomUUID();
  }
  return `c-${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 14)}`;
}

function readOrCreateClientSessionId() {
  if (typeof window === "undefined") return "";
  try {
    const existing = window.sessionStorage.getItem(CREATE_CLIENT_SESSION_STORAGE_KEY)?.trim();
    if (existing) return existing.slice(0, 120);
    const created = createClientSessionId();
    window.sessionStorage.setItem(CREATE_CLIENT_SESSION_STORAGE_KEY, created);
    return created;
  } catch {
    return "";
  }
}

export function ensureCreateHoneypotElement() {
  if (typeof document === "undefined") return null;
  const existing = document.getElementById(CREATE_HONEYPOT_ID);
  const InputCtor = globalThis.HTMLInputElement;
  if (typeof InputCtor !== "undefined" && existing instanceof InputCtor) return existing;

  const trap = document.createElement("input");
  trap.id = CREATE_HONEYPOT_ID;
  trap.type = "text";
  trap.name = "request_note_2f7";
  trap.autocomplete = "off";
  trap.tabIndex = -1;
  trap.setAttribute("aria-hidden", "true");
  trap.setAttribute("role", "presentation");
  trap.setAttribute("data-create-meta-field", "v1");
  trap.spellcheck = false;
  trap.style.position = "fixed";
  trap.style.left = "-10000px";
  trap.style.top = "-10000px";
  trap.style.width = "1px";
  trap.style.height = "1px";
  trap.style.opacity = "0";
  trap.style.pointerEvents = "none";
  trap.style.overflow = "hidden";
  document.body.appendChild(trap);
  return trap;
}

function readCreateHoneypotValue() {
  const trap = ensureCreateHoneypotElement();
  return trap?.value?.trim().slice(0, 160) ?? "";
}

export function primeCreateSecuritySession(): Promise<boolean> {
  if (typeof window === "undefined") return Promise.resolve(false);
  if (createSecuritySessionPromise) {
    return createSecuritySessionPromise.then(Boolean);
  }
  if (createSecuritySessionPrimed && readCreateAnonymousStorageContext()) {
    return Promise.resolve(true);
  }
  createSecuritySessionPrimed = true;
  createSecuritySessionPromise = window
    .fetch("/api/create/session", {
      method: "POST",
      credentials: "same-origin",
      cache: "no-store",
      headers: {
        "content-type": "application/json",
        [CREATE_MUTATION_CSRF_HEADER]: CREATE_MUTATION_CSRF_VALUE,
      },
      body: "{}",
    })
    .then(async (response) => {
      if (!response.ok) {
        createSecuritySessionPrimed = false;
        createAnonymousStorageContext = null;
        return null;
      }
      const body = await response.json().catch(() => null);
      const context = parseAnonymousStorageContext(body?.storageContext);
      if (!context) {
        createSecuritySessionPrimed = false;
        createAnonymousStorageContext = null;
        return null;
      }
      createAnonymousStorageContext = context;
      return context;
    })
    .catch(() => {
      createSecuritySessionPrimed = false;
      createAnonymousStorageContext = null;
      return null;
    })
    .finally(() => {
      createSecuritySessionPromise = null;
    });
  return createSecuritySessionPromise.then(Boolean);
}

export function setCreateAnonymousStorageContextForTests(
  context: CreateAnonymousStorageContext | null,
) {
  createAnonymousStorageContext = context;
  createSecuritySessionPrimed = Boolean(context);
  createSecuritySessionPromise = null;
}

if (typeof window !== "undefined" && process.env.NODE_ENV !== "test") {
  const initialize = () => {
    ensureCreateHoneypotElement();
    readOrCreateClientSessionId();
    primeCreateSecuritySession();
  };
  if (document.readyState === "loading") {
    document.addEventListener("DOMContentLoaded", initialize, { once: true });
  } else {
    globalThis.queueMicrotask(initialize);
  }
}

export function createMutationRequestHeaders(): Record<string, string> {
  const headers: Record<string, string> = {
    "content-type": "application/json",
    [CREATE_MUTATION_CSRF_HEADER]: CREATE_MUTATION_CSRF_VALUE,
  };

  if (typeof window !== "undefined") {
    const honeypotValue = readCreateHoneypotValue();
    const clientSession = readOrCreateClientSessionId();
    if (honeypotValue) headers[CREATE_HONEYPOT_HEADER] = honeypotValue;
    if (clientSession) headers[CREATE_CLIENT_SESSION_HEADER] = clientSession;
    primeCreateSecuritySession();
  }

  return headers;
}
