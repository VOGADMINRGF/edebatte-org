"use server";
import { enqueueFactcheck, getFactcheckStatus } from "@lib/worker";

export async function runFactcheck(text: string) {
  const enq = await enqueueFactcheck({ text, language: "de" }, "editor");
  if (!enq.ok) throw new Error(enq.message ?? "enqueue failed");
  return getFactcheckStatus(enq.jobId, "editor");
}
