import { NextRequest, NextResponse } from "next/server";
import { coreCol } from "@core/db/triMongo";
import demoDossier from "@features/dossier/data/demoDossier";
import chatkontrolleDossier from "@features/dossier/data/chatkontrolleDossier";
import type { MaterialLink, StoredDossier } from "@features/dossier/infra/types";
import { findDossierByAnyId } from "@features/dossier/lookup";
import { buildDossierUpdateReadModel } from "@features/dossier/updateReadModel";
import {
  getDossierPublicationRuntimeHint,
  getPublishedDossierBySlugOrId,
} from "@/features/dossier/publicRuntime";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const DOSSIER_STORE = "dossier_store";

type RouteParams = { params: Promise<{ id: string }> };

export async function GET(_: NextRequest, { params }: RouteParams) {
  const { id: rawId } = await params;
  const id = rawId ?? "demo";
  if (id === "demo" || id === demoDossier.meta.id) {
    return NextResponse.json({ ok: true, dossier: demoDossier, materialLinks: [] }, { status: 200 });
  }
  if (id === "chatkontrolle") {
    return NextResponse.json(
      {
        ok: true,
        dossier: chatkontrolleDossier,
        materialLinks: [],
        updateContext: null,
        sourceStatusLabel: "Redaktioneller Quellenstand · 17.09.2026",
        updateSummary: null,
      },
      { status: 200 },
    );
  }

  try {
    const publishedRuntime = await getPublishedDossierBySlugOrId(id).catch(() => null);
    if (publishedRuntime?.detail) {
      return NextResponse.json(
        {
          ok: true,
          dossier: publishedRuntime.detail.dossier,
          materialLinks: publishedRuntime.detail.materialLinks,
          updateContext: publishedRuntime.detail.updateContext,
          sourceStatusLabel: publishedRuntime.detail.sourceStatusLabel,
          updateSummary: null,
        },
        { status: 200 },
      );
    }

    const col = await coreCol<StoredDossier>(DOSSIER_STORE);
    const doc = await col.findOne({ dossierId: id });
    if (!doc?.dossier) {
      const runtimePublication = await getDossierPublicationRuntimeHint(id).catch(
        () => null,
      );
      if (runtimePublication && runtimePublication.status !== "published") {
        return NextResponse.json(
          {
            ok: false,
            error: "dossier_review_only",
            dossierId: runtimePublication.dossierId,
            status: runtimePublication.status,
          },
          { status: 409 },
        );
      }
      const draftOnly = await findDossierByAnyId(id).catch(() => null);
      if (draftOnly) {
        return NextResponse.json(
          {
            ok: false,
            error: "dossier_review_only",
            dossierId: draftOnly.dossierId,
            status: draftOnly.status,
          },
          { status: 409 },
        );
      }
      return NextResponse.json({ ok: false, error: "dossier_not_found" }, { status: 404 });
    }
    let materialLinks: MaterialLink[] = [];
    try {
      const linksCol = await coreCol<MaterialLink>("dossier_material_links");
      materialLinks = await linksCol
        .find({ dossierId: id })
        .sort({ createdAt: -1, _id: -1 })
        .limit(100)
        .toArray();
    } catch {
      materialLinks = [];
    }
    const updateReadModel = await buildDossierUpdateReadModel({
      dossierId: id,
      materialize: true,
      publicVisible: true,
    }).catch(() => null);
    return NextResponse.json(
      {
        ok: true,
        dossier: doc.dossier,
        materialLinks,
        updateContext: updateReadModel?.publicContext ?? null,
        updateSummary: updateReadModel?.summary ?? null,
      },
      { status: 200 },
    );
  } catch {
    return NextResponse.json({ ok: false, error: "dossier_load_failed" }, { status: 500 });
  }
}
