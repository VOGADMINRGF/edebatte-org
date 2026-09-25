import { BRAND } from "@/lib/brand";

export const QR_STUDIO_CALLER_INVENTORY = {
  content_release_workbench: "Review-to-Publish Workspace",
  public_topic_page: "Öffentliche Themenseite",
  organization_dashboard: "Organisations-Dashboard",
  legacy_qrcodegenerator: "Legacy QR Generator",
  legacy_qrcodewizard: "Legacy QR Wizard",
  qr_studio: "QR Studio",
} as const;

export type QrStudioCaller = keyof typeof QR_STUDIO_CALLER_INVENTORY;

export type QrStudioTargetResolution =
  | {
      status: "empty";
      caller: QrStudioCaller;
    }
  | {
      status: "blocked";
      caller: QrStudioCaller;
      reason:
        | "empty"
        | "network_path_not_allowed"
        | "unsafe_scheme"
        | "invalid_url"
        | "credentials_not_allowed"
        | "host_not_allowed";
    }
  | {
      status: "ready";
      caller: QrStudioCaller;
      targetKind: "internal" | "allowed_https";
      normalizedTarget: string;
      absoluteHref: string;
      displayHref: string;
    };

const DEFAULT_CALLER: QrStudioCaller = "qr_studio";

export function parseQrStudioCaller(value: string | null | undefined): QrStudioCaller {
  if (value && value in QR_STUDIO_CALLER_INVENTORY) {
    return value as QrStudioCaller;
  }
  return DEFAULT_CALLER;
}

export function getQrStudioCallerLabel(caller: string | null | undefined): string {
  return QR_STUDIO_CALLER_INVENTORY[parseQrStudioCaller(caller)];
}

export function resolveQrStudioTarget(input: {
  target: string | null | undefined;
  caller?: string | null | undefined;
  publicOrigin?: string | null | undefined;
}): QrStudioTargetResolution {
  const caller = parseQrStudioCaller(input.caller);
  const rawTarget = String(input.target ?? "").trim();
  if (!rawTarget) {
    return { status: "empty", caller };
  }

  if (/[\u0000-\u001f\u007f]/.test(rawTarget)) {
    return { status: "blocked", caller, reason: "invalid_url" };
  }

  if (rawTarget.startsWith("//")) {
    return { status: "blocked", caller, reason: "network_path_not_allowed" };
  }

  const baseOrigin = normalizeBaseOrigin(input.publicOrigin);
  if (rawTarget.startsWith("/")) {
    try {
      const url = new URL(rawTarget, baseOrigin);
      const normalizedTarget = `${url.pathname}${url.search}${url.hash}`;
      return {
        status: "ready",
        caller,
        targetKind: "internal",
        normalizedTarget,
        absoluteHref: url.toString(),
        displayHref: normalizedTarget,
      };
    } catch {
      return { status: "blocked", caller, reason: "invalid_url" };
    }
  }

  let url: URL;
  try {
    url = new URL(rawTarget);
  } catch {
    return { status: "blocked", caller, reason: "invalid_url" };
  }

  if (url.protocol !== "https:") {
    return { status: "blocked", caller, reason: "unsafe_scheme" };
  }

  if (url.username || url.password) {
    return { status: "blocked", caller, reason: "credentials_not_allowed" };
  }

  if (!isAllowedHttpsHostname(url.hostname, baseOrigin)) {
    return { status: "blocked", caller, reason: "host_not_allowed" };
  }

  return {
    status: "ready",
    caller,
    targetKind: "allowed_https",
    normalizedTarget: url.toString(),
    absoluteHref: url.toString(),
    displayHref: url.toString(),
  };
}

export function buildQrStudioHref(input: {
  target?: string | null | undefined;
  caller?: string | null | undefined;
  publicOrigin?: string | null | undefined;
}): string {
  const resolved = resolveQrStudioTarget({
    target: input.target ?? null,
    caller: input.caller,
    publicOrigin: input.publicOrigin,
  });
  const params = new URLSearchParams();

  if (resolved.caller !== DEFAULT_CALLER) {
    params.set("caller", resolved.caller);
  }

  if (resolved.status === "ready") {
    params.set("target", resolved.normalizedTarget);
  } else if (resolved.status === "blocked") {
    params.set("targetState", "blocked");
  }

  const query = params.toString();
  return query ? `/qr-studio?${query}` : "/qr-studio";
}

function normalizeBaseOrigin(publicOrigin: string | null | undefined): string {
  const candidates = [publicOrigin, BRAND.baseUrl];
  for (const candidate of candidates) {
    try {
      const url = new URL(String(candidate ?? "").trim());
      return url.origin;
    } catch {
      // ignore
    }
  }
  return "https://www.edebatte.org";
}

function isAllowedHttpsHostname(hostname: string, publicOrigin: string): boolean {
  const allowedHosts = new Set<string>();

  try {
    allowedHosts.add(new URL(publicOrigin).hostname.toLowerCase());
  } catch {
    // ignore
  }

  allowedHosts.add(BRAND.domain.toLowerCase());

  try {
    allowedHosts.add(new URL(BRAND.baseUrl).hostname.toLowerCase());
  } catch {
    // ignore
  }

  const normalizedHostname = hostname.toLowerCase();
  for (const allowedHost of allowedHosts) {
    if (
      normalizedHostname === allowedHost ||
      normalizedHostname.endsWith(`.${allowedHost}`)
    ) {
      return true;
    }
  }
  return false;
}
