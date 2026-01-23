export async function json<T = any>(req: any): Promise<T> {
  try {
    const body = await req?.json?.();
    return (body ?? {}) as T;
  } catch {
    return {} as T;
  }
}
export function assertMethod(req: any, ...allowed: string[]) {
  const m = req?.method ?? "";
  if (!allowed.includes(m)) throw new Error(`Method ${m} not allowed`);
}
