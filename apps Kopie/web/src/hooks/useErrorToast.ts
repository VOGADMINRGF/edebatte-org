import { useCallback } from "react";
import { toast } from "react-hot-toast";

interface ErrorResponse {
  error: true;
  code: string;
  message: string;
  traceId?: string;
}

export function useErrorToast() {
  return useCallback(
    (error: unknown, fallback = "Ein Fehler ist aufgetreten.") => {
      const err = error as ErrorResponse;

      const msg = err?.message || fallback;
      const trace = err?.traceId ? ` (Fehler-ID: ${err.traceId})` : "";

      toast.error(`${msg}${trace}`);
      console.warn("Client Error:", err);
    },
    [],
  );
}
