import type { HomepageFilmLayoutProfile } from "./homepageReferenceFilmLayouts";

export const VOXY_PRODUCT_PROMO_SCHEMA_VERSION = "voxy-product-promo-v1" as const;

export type VoxyProductPromoBrand = "edebatte" | "voiceopengov";
export type VoxyProductPromoMotionProfile = "social" | "homepage";
export type VoxyProductPromoClaimClass =
  | "current_capability"
  | "editorial_principle"
  | "future_intent";

export type VoxyProductPromoAssetAcquisition =
  | Readonly<{
      kind: "live_route_capture";
      route: string;
      viewport?: Readonly<{ width: number; height: number }>;
      selector?: string;
    }>
  | Readonly<{
      kind: "repo_asset";
      repositoryPath: string;
    }>
  | Readonly<{
      kind: "private_local_file";
      /** Path relative to VOXY_PRODUCTION_ASSET_ROOT/<productionId>/assets. */
      relativePath: string;
    }>;

export type VoxyProductPromoAsset = Readonly<{
  id: string;
  role: "product_surface" | "brand" | "illustration" | "evidence";
  product: VoxyProductPromoBrand;
  acquisition: VoxyProductPromoAssetAcquisition;
  alt: string;
  required: boolean;
  /** Human-readable reason the asset is shown. */
  purpose: string;
}>;

export type VoxyProductPromoClaim = Readonly<{
  id: string;
  classification: VoxyProductPromoClaimClass;
  text: string;
  product: VoxyProductPromoBrand | "shared";
  sourceIds: readonly string[];
  marketable: boolean;
}>;

export type VoxyProductPromoSource = Readonly<{
  id: string;
  publisher: string;
  title: string;
  url?: string;
  route?: string;
  sourceClass: "first_party_product_surface" | "first_party_product_contract" | "editorial_principle";
}>;

export type VoxyProductPromoBeat = Readonly<{
  id: string;
  stage: "HOOK" | "PRODUCT_SURFACE" | "INTERACTION" | "VALUE" | "SYNTHESIS" | "CTA";
  narration: string;
  onScreenText?: readonly string[];
  assetIds?: readonly string[];
  claimIds?: readonly string[];
  minimumReadableSeconds?: number;
}>;

export type VoxyProductPromoProduction = Readonly<{
  schemaVersion: typeof VOXY_PRODUCT_PROMO_SCHEMA_VERSION;
  productionId: string;
  title: string;
  brand: VoxyProductPromoBrand;
  format: HomepageFilmLayoutProfile;
  motionProfile: VoxyProductPromoMotionProfile;
  voice: "D1";
  visualGrammar: "PRODUCT_SURFACE → INTERACTION → VALUE → SYNTHESIS → CTA";
  assetRootPolicy: Readonly<{
    environmentVariable: "VOXY_PRODUCTION_ASSET_ROOT";
    productionSubdirectory: string;
    assetsSubdirectory: "assets";
    rawAssetsNeverCommitted: true;
    sha256ManifestRequired: true;
  }>;
  sources: readonly VoxyProductPromoSource[];
  claims: readonly VoxyProductPromoClaim[];
  assets: readonly VoxyProductPromoAsset[];
  beats: readonly VoxyProductPromoBeat[];
  output: Readonly<{
    basename: string;
    captions: true;
    manifest: true;
    sourceManifest: true;
    assetManifest: true;
  }>;
  productionEligible: false;
  autoPublish: false;
}>;

export function validateVoxyProductPromoProduction(
  production: VoxyProductPromoProduction,
): string[] {
  const errors: string[] = [];
  const sourceIds = new Set(production.sources.map((source) => source.id));
  const claimIds = new Set(production.claims.map((claim) => claim.id));
  const assetIds = new Set(production.assets.map((asset) => asset.id));

  if (production.schemaVersion !== VOXY_PRODUCT_PROMO_SCHEMA_VERSION) {
    errors.push("schema_version_invalid");
  }
  if (production.voice !== "D1") errors.push("canonical_voice_must_be_d1");
  if (production.productionEligible) errors.push("production_eligible_must_remain_false");
  if (production.autoPublish) errors.push("auto_publish_must_remain_false");

  for (const claim of production.claims) {
    if (claim.classification === "future_intent" && claim.marketable) {
      errors.push(`future_intent_not_marketable:${claim.id}`);
    }
    for (const sourceId of claim.sourceIds) {
      if (!sourceIds.has(sourceId)) errors.push(`claim_source_missing:${claim.id}:${sourceId}`);
    }
  }

  for (const beat of production.beats) {
    for (const claimId of beat.claimIds ?? []) {
      if (!claimIds.has(claimId)) errors.push(`beat_claim_missing:${beat.id}:${claimId}`);
    }
    for (const assetId of beat.assetIds ?? []) {
      if (!assetIds.has(assetId)) errors.push(`beat_asset_missing:${beat.id}:${assetId}`);
    }
  }

  return errors;
}
