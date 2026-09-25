import { describe, expect, it } from "vitest";
import {
  QR_STUDIO_CALLER_INVENTORY,
  buildQrStudioHref,
  resolveQrStudioTarget,
} from "@features/qr";

describe("qr studio target contract", () => {
  it("keeps internal public paths on the canonical qr-studio route", () => {
    const resolved = resolveQrStudioTarget({
      target: "/dossier/demo-1?view=public",
      caller: "content_release_workbench",
      publicOrigin: "https://www.edebatte.org",
    });

    expect(resolved).toMatchObject({
      status: "ready",
      caller: "content_release_workbench",
      targetKind: "internal",
      normalizedTarget: "/dossier/demo-1?view=public",
      absoluteHref: "https://www.edebatte.org/dossier/demo-1?view=public",
    });
    expect(
      buildQrStudioHref({
        target: "/dossier/demo-1?view=public",
        caller: "content_release_workbench",
      }),
    ).toBe(
      "/qr-studio?caller=content_release_workbench&target=%2Fdossier%2Fdemo-1%3Fview%3Dpublic",
    );
  });

  it("allows explicit https targets on the eDebatte domain", () => {
    const resolved = resolveQrStudioTarget({
      target: "https://www.edebatte.org/topic/schule",
      caller: "public_topic_page",
      publicOrigin: "https://www.edebatte.org",
    });

    expect(resolved).toMatchObject({
      status: "ready",
      caller: "public_topic_page",
      targetKind: "allowed_https",
      normalizedTarget: "https://www.edebatte.org/topic/schule",
      absoluteHref: "https://www.edebatte.org/topic/schule",
    });
  });

  it("blocks unsafe or foreign targets fail-closed", () => {
    expect(
      resolveQrStudioTarget({
        target: "javascript:alert(1)",
        caller: "legacy_qrcodegenerator",
      }),
    ).toMatchObject({
      status: "blocked",
      caller: "legacy_qrcodegenerator",
      reason: "unsafe_scheme",
    });

    expect(
      resolveQrStudioTarget({
        target: "https://example.com/foreign",
        caller: "legacy_qrcodegenerator",
      }),
    ).toMatchObject({
      status: "blocked",
      caller: "legacy_qrcodegenerator",
      reason: "host_not_allowed",
    });

    expect(
      buildQrStudioHref({
        target: "https://example.com/foreign",
        caller: "legacy_qrcodegenerator",
      }),
    ).toBe("/qr-studio?caller=legacy_qrcodegenerator&targetState=blocked");
  });

  it("keeps a small caller inventory for known qr entry sources", () => {
    expect(QR_STUDIO_CALLER_INVENTORY).toMatchObject({
      content_release_workbench: "Review-to-Publish Workspace",
      public_topic_page: "Öffentliche Themenseite",
      organization_dashboard: "Organisations-Dashboard",
      legacy_qrcodegenerator: "Legacy QR Generator",
      legacy_qrcodewizard: "Legacy QR Wizard",
      qr_studio: "QR Studio",
    });
  });
});
