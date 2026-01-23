// apps/web/src/lib/db/modelOn.ts

// Minimales, tolerantes modelOn – keine harten mongoose-Generics nötig
export function modelOn<T = any>(
  conn: any,
  name: string,
  schema: any,
  collection?: string,
): any {
  const existing = conn?.models?.[name];
  if (existing) return existing;
  return conn?.model
    ? conn.model(name, schema, collection)
    : {
        /* noop */
      };
}
