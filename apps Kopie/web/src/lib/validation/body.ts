// apps/web/src/lib/validation/body.ts
import { z } from "zod";

// Zod-Record: zwei Parameter (Key- und Value-Schema)
export const AnyBody = z.record(z.string(), z.any());

/** Kompatibles API zu deinem bisherigen "BodySchema" */
export const BodySchema = {
  parse: (x: unknown): any => AnyBody.parse(x) as any,
  safeParse: (x: unknown) => {
    const r = AnyBody.safeParse(x);
    return r.success
      ? { success: true, data: r.data as any }
      : { success: false, error: r.error };
  },
};

export type BodyOf<T> = T;
