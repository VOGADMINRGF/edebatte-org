export function useFactcheckJob() {
  return {
    jobId: null as string | null,
    status: "idle" as string,
    claims: [] as any[],
    loading: false,
    error: null as any,
    enqueue: (_req?: any) => {},
    done: false,
  };
}
