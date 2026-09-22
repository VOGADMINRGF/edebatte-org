export const runtime = "nodejs";
export const dynamic = "force-dynamic";

import { createReadStream } from "node:fs";
import { realpath, stat } from "node:fs/promises";
import { resolve, sep } from "node:path";
import { Readable } from "node:stream";

import { NextRequest } from "next/server";

import { requireAdminOrResponse } from "@/lib/server/auth/admin";
import { getVoxyLocalCompositionRepository } from "@/features/voxyVideo/localCompositionRuntimeStore";
import { getVoxyStudioDraftRepository } from "@/features/voxyVideo/studioDraftStore";
import { assertVoxyStudioEditorialRenderCandidate } from "@/features/voxyVideo/studioRenderBindingGuard";

function parseRange(value: string | null, size: number): { start: number; end: number } | null {
  if (!value) return null;
  const match = /^bytes=(\d*)-(\d*)$/.exec(value.trim());
  if (!match) throw new Error("invalid_range_header");
  const rawStart = match[1];
  const rawEnd = match[2];
  if (!rawStart && !rawEnd) throw new Error("invalid_range_header");

  if (!rawStart) {
    const suffix = Number(rawEnd);
    if (!Number.isInteger(suffix) || suffix <= 0) throw new Error("invalid_range_header");
    const start = Math.max(0, size - suffix);
    return { start, end: size - 1 };
  }

  const start = Number(rawStart);
  const end = rawEnd ? Number(rawEnd) : size - 1;
  if (
    !Number.isInteger(start) ||
    !Number.isInteger(end) ||
    start < 0 ||
    end < start ||
    start >= size
  ) {
    throw new Error("range_not_satisfiable");
  }
  return { start, end: Math.min(end, size - 1) };
}

async function resolvePrivatePreviewPath(storageKey: string) {
  const configuredRoot = process.env.VOXY_LOCAL_COMPOSITION_OUTPUT_ROOT?.trim();
  if (!configuredRoot) throw new Error("voxy_local_composition_output_root_missing");
  const outputRoot = await realpath(resolve(configuredRoot));
  const candidate = resolve(outputRoot, storageKey);
  if (candidate !== outputRoot && !candidate.startsWith(`${outputRoot}${sep}`)) {
    throw new Error("voxy_studio_preview_path_outside_output_root");
  }
  const previewPath = await realpath(candidate);
  if (previewPath !== outputRoot && !previewPath.startsWith(`${outputRoot}${sep}`)) {
    throw new Error("voxy_studio_preview_realpath_outside_output_root");
  }
  const fileStat = await stat(previewPath);
  if (!fileStat.isFile() || fileStat.size <= 0) {
    throw new Error("voxy_studio_preview_file_invalid");
  }
  return { previewPath, size: fileStat.size };
}

export async function GET(
  req: NextRequest,
  context: { params: Promise<{ draftId: string }> },
) {
  const gate = await requireAdminOrResponse(req);
  if (gate instanceof Response) return gate;

  try {
    const { draftId: rawDraftId } = await context.params;
    const draftId = decodeURIComponent(String(rawDraftId ?? "").trim());
    const studioRepository = getVoxyStudioDraftRepository();
    const draft = await studioRepository.getDraft(draftId);
    if (!draft) return new Response("Not found", { status: 404 });
    if (draft.status !== "rendered" || !draft.renderBinding) {
      return new Response("Preview not bound", { status: 409 });
    }

    const runtimeRepository = getVoxyLocalCompositionRepository();
    const persistence = runtimeRepository.getPersistenceState();
    if (
      persistence.mode !== "persistent_primary" ||
      persistence.productionTruth !== true ||
      persistence.restartReconstructable !== true
    ) {
      return new Response("Preview persistence unavailable", { status: 503 });
    }
    const [job, output] = await Promise.all([
      runtimeRepository.getJob(draft.renderBinding.jobId),
      runtimeRepository.getOutput(draft.renderBinding.outputId),
    ]);
    if (!job || !output) return new Response("Preview output missing", { status: 404 });
    if (
      job.status !== "review_ready" ||
      output.outputId !== draft.renderBinding.outputId ||
      output.masterMp4.sha256 !== draft.renderBinding.outputSha256 ||
      output.publicAsset !== false ||
      output.uploaded !== false ||
      output.published !== false
    ) {
      return new Response("Preview binding invalid", { status: 409 });
    }
    assertVoxyStudioEditorialRenderCandidate({ job, output });

    const { previewPath, size } = await resolvePrivatePreviewPath(output.previewWebm.storageKey);
    let range: { start: number; end: number } | null;
    try {
      range = parseRange(req.headers.get("range"), size);
    } catch (error) {
      const message = error instanceof Error ? error.message : "invalid_range_header";
      return new Response(null, {
        status: message === "range_not_satisfiable" ? 416 : 400,
        headers: {
          "Accept-Ranges": "bytes",
          "Content-Range": `bytes */${size}`,
          "Cache-Control": "private, no-store, max-age=0",
        },
      });
    }

    const start = range?.start ?? 0;
    const end = range?.end ?? size - 1;
    const nodeStream = createReadStream(previewPath, { start, end });
    const body = Readable.toWeb(nodeStream) as ReadableStream<Uint8Array>;
    const headers = new Headers({
      "Content-Type": "video/webm",
      "Content-Length": String(end - start + 1),
      "Accept-Ranges": "bytes",
      "Cache-Control": "private, no-store, max-age=0",
      "Content-Disposition": "inline",
      "X-Content-Type-Options": "nosniff",
    });
    if (range) headers.set("Content-Range", `bytes ${start}-${end}/${size}`);
    return new Response(body, {
      status: range ? 206 : 200,
      headers,
    });
  } catch (error) {
    const message = error instanceof Error ? error.message : "voxy_studio_preview_failed";
    if (message.includes("output_root_missing")) {
      return new Response("Preview storage unavailable", { status: 503 });
    }
    if (message.includes("ENOENT") || message.includes("missing")) {
      return new Response("Preview file missing", { status: 404 });
    }
    return new Response("Preview unavailable", { status: 409 });
  }
}
