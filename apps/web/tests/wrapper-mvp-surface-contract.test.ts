import { describe, expect, it } from "vitest";
import {
  classifyWrapperHref,
  classifyWrapperMvpPath,
  isWrapperMvpAllowedPath,
} from "@/features/wrapper/mvpSurfaceContract";

describe("wrapper MVP surface contract", () => {
  it("classifies MVP paths and alias canonical targets", () => {
    const swipes = classifyWrapperMvpPath("/swipes?fromDraft=abc");
    expect(swipes.bucket).toBe("mvp");
    expect(swipes.path).toBe("/swipes?fromDraft=abc");
    expect(swipes.canonicalPath).toBeNull();

    const alias = classifyWrapperMvpPath("/anlassraum");
    expect(alias.bucket).toBe("mvp");
    expect(alias.canonicalPath).toBe("/runden");

    const pricingNested = classifyWrapperMvpPath("/pricing/institutionen");
    expect(pricingNested.bucket).toBe("mvp");

    const order = classifyWrapperMvpPath("/order?segment=organisationen");
    expect(order.bucket).toBe("mvp");
    expect(order.canonicalPath).toBeNull();

    const quoteFlow = classifyWrapperMvpPath("/vormerken?segment=kommunen&quote=1");
    expect(quoteFlow.bucket).toBe("mvp");
    expect(quoteFlow.canonicalPath).toBe("/order");
  });

  it("marks later and excluded surfaces explicitly", () => {
    expect(classifyWrapperMvpPath("/atlas").bucket).toBe("later");
    expect(classifyWrapperMvpPath("/atlas/weekly").bucket).toBe("later");
    expect(classifyWrapperMvpPath("/admin/feeds").bucket).toBe("excluded");
    expect(classifyWrapperMvpPath("/atlas/social-review").bucket).toBe("excluded");
  });

  it("keeps unknown and invalid paths separate", () => {
    expect(classifyWrapperMvpPath("/topic/mobilitaet").bucket).toBe("unknown");
    expect(classifyWrapperMvpPath("swipes").bucket).toBe("invalid");
  });

  it("exposes MVP-allow checks for wrapper gating", () => {
    expect(isWrapperMvpAllowedPath("/create")).toBe(true);
    expect(isWrapperMvpAllowedPath("/atlas")).toBe(false);
    expect(isWrapperMvpAllowedPath("/admin")).toBe(false);
  });
});

describe("wrapper href classification", () => {
  it("treats internal and same-origin absolute URLs as internal", () => {
    const internal = classifyWrapperHref("/runden?view=active");
    expect(internal.kind).toBe("internal");
    if (internal.kind === "internal") {
      expect(internal.path).toBe("/runden?view=active");
      expect(internal.surface.bucket).toBe("mvp");
    }

    const sameOrigin = classifyWrapperHref("https://edebatte.org/swipes");
    expect(sameOrigin.kind).toBe("internal");
    if (sameOrigin.kind === "internal") {
      expect(sameOrigin.path).toBe("/swipes");
    }
  });

  it("separates external targets and blocks unsafe protocols", () => {
    const external = classifyWrapperHref("https://example.org/info");
    expect(external.kind).toBe("external");
    if (external.kind === "external") {
      expect(external.protocol).toBe("https:");
    }

    const mail = classifyWrapperHref("mailto:kontakt@edebatte.org");
    expect(mail.kind).toBe("external");

    const js = classifyWrapperHref("javascript:alert(1)");
    expect(js.kind).toBe("invalid");
    if (js.kind === "invalid") {
      expect(js.reason).toBe("unsupported_protocol");
    }
  });
});
