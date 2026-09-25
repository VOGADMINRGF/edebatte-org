export const ACCOUNT_OPTIONAL_DATA_TIMEOUT_MS = 2_000;

type OptionalAccountDataInput<T> = {
  source: string;
  fallback: T;
  load: () => Promise<T>;
  timeoutMs?: number;
};

export async function loadOptionalAccountData<T>({
  source,
  fallback,
  load,
  timeoutMs = ACCOUNT_OPTIONAL_DATA_TIMEOUT_MS,
}: OptionalAccountDataInput<T>): Promise<T> {
  let timer: ReturnType<typeof setTimeout> | undefined;

  const guardedLoad = Promise.resolve()
    .then(load)
    .catch(() => {
      console.warn(`[account.runtime] optional loader failed: ${source}`);
      return fallback;
    });
  const timeout = new Promise<T>((resolve) => {
    timer = setTimeout(() => {
      console.warn(`[account.runtime] optional loader timed out: ${source}`);
      resolve(fallback);
    }, timeoutMs);
  });

  try {
    return await Promise.race([guardedLoad, timeout]);
  } finally {
    if (timer) clearTimeout(timer);
  }
}
