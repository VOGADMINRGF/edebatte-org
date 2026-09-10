import { describe, expect, it } from "vitest";

import { VOXY_PRODUCT_PROMO_PRODUCTIONS } from "../src/features/voxyVideo/productPromoProductions";
import { validateVoxyProductPromoProduction } from "../src/features/voxyVideo/productPromoProduction";
import { VOXY_HOMEPAGE_FILM_LAYOUTS } from "../src/features/voxyVideo/homepageReferenceFilmLayouts";

describe("Voxy product promo production contract", () => {
  it("keeps every production fail-closed and valid", () => {
    for (const production of Object.values(VOXY_PRODUCT_PROMO_PRODUCTIONS)) {
      expect(validateVoxyProductPromoProduction(production)).toEqual([]);
      expect(production.voice).toBe("D1");
      expect(production.productionEligible).toBe(false);
      expect(production.autoPublish).toBe(false);
    }
  });

  it("uses the canonical 9:16 TikTok/Reels safe-area profile", () => {
    const production = VOXY_PRODUCT_PROMO_PRODUCTIONS["edebatte-democracy-update-01"];
    expect(production.format).toBe("vertical_9_16");
    expect(VOXY_HOMEPAGE_FILM_LAYOUTS[production.format].output).toEqual({
      width: 1080,
      height: 1920,
      aspectRatio: "9:16",
    });
    expect(VOXY_HOMEPAGE_FILM_LAYOUTS[production.format].conservativePlatformPreset)
      .toBe("vertical-social-controls-safe");
  });

  it("keeps raw screenshots outside git and names asset slots semantically", () => {
    const production = VOXY_PRODUCT_PROMO_PRODUCTIONS["edebatte-democracy-update-01"];
    expect(production.assetRootPolicy.rawAssetsNeverCommitted).toBe(true);
    expect(production.assetRootPolicy.sha256ManifestRequired).toBe(true);
    expect(production.assets.map((asset) => asset.id)).toEqual([
      "product-home",
      "product-participation-entry",
      "product-demo-ballot",
    ]);
    expect(production.assets.every((asset) => asset.acquisition.kind === "private_local_file"))
      .toBe(true);
  });

  it("never markets future intent as a current product capability", () => {
    const production = VOXY_PRODUCT_PROMO_PRODUCTIONS["edebatte-democracy-update-01"];
    expect(
      production.claims
        .filter((claim) => claim.classification === "future_intent")
        .every((claim) => claim.marketable === false),
    ).toBe(true);
  });
});
