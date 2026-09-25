export const CREATE_MUTATION_CSRF_HEADER = "x-edebatte-create-csrf";
export const CREATE_MUTATION_CSRF_VALUE = "create-mutation-v1";
export const CREATE_HONEYPOT_HEADER = "x-edebatte-create-meta";
export const CREATE_CLIENT_SIGNAL_HEADER = "x-edebatte-create-client";
export const CREATE_HONEYPOT_MAX_LENGTH = 160;
export const CREATE_CLIENT_SIGNAL_MAX_LENGTH = 64;
export const CREATE_MAX_TEXT_LENGTH = 10_000;
export const CREATE_MAX_CONTEXT_LENGTH = 2_000;
export const CREATE_MAX_URL_LENGTH = 2_048;

export type CreateMutationRequestHeaderInput = {
  honeypotValue?: string | null;
  clientSignal?: string | null;
};

export function hasValidCreateMutationProvenance(input: {
  expectedOrigin: string;
  origin: string | null | undefined;
  fetchSite: string | null | undefined;
  csrfIntent: string | null | undefined;
}) {
  return (
    String(input.origin ?? "").trim() === input.expectedOrigin &&
    String(input.fetchSite ?? "").trim().toLowerCase() === "same-origin" &&
    String(input.csrfIntent ?? "").trim() === CREATE_MUTATION_CSRF_VALUE
  );
}

export function createMutationRequestHeaders(
  input: CreateMutationRequestHeaderInput = {},
): Record<string, string> {
  const headers: Record<string, string> = {
    "content-type": "application/json",
    [CREATE_MUTATION_CSRF_HEADER]: CREATE_MUTATION_CSRF_VALUE,
  };

  if (String(input.honeypotValue ?? "").trim()) {
    headers[CREATE_HONEYPOT_HEADER] = "1";
  }
  const clientSignal = String(input.clientSignal ?? "").trim();
  if (/^[a-z0-9_-]{8,64}$/i.test(clientSignal)) {
    headers[CREATE_CLIENT_SIGNAL_HEADER] = clientSignal.slice(
      0,
      CREATE_CLIENT_SIGNAL_MAX_LENGTH,
    );
  }

  return headers;
}
