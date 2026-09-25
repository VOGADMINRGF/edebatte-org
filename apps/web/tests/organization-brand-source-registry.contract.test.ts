import { describe, expect, it } from "vitest";
import {
  BRAND_ASSET_RIGHTS_BASES,
  CANONICAL_ORGANIZATION_TYPES,
  CanonicalOrganizationSchema,
  OrganizationRelationSchema,
  BrandAssetSchema,
  brandAssetPresentationMode,
  canUseBrandAssetPublicly,
  canonicalizeBcp47Locale,
  resolveOrganizationType,
} from "@features/organization/registryContract";
import { ENTITY_TYPES } from "@features/entities/types";
import {
  OrganizationSourceConnectionUpsertSchema,
  RegionSourceConnectionUpsertSchema,
} from "@features/region/sourceConnections";

const DE = {
  id: "jurisdiction:de",
  level: "country" as const,
  label: "Deutschland",
  countryCode: "DE",
  officialCode: "DE",
  provenanceRef: "iso-3166-1:DE",
};

const EU = {
  id: "jurisdiction:eu",
  level: "supranational" as const,
  label: "Europäische Union",
  officialCode: "EU",
  provenanceRef: "eu:official",
};

describe("ORGANIZATION-BRAND-SOURCE-REGISTRY-01", () => {
  it("contains the required canonical organization identities while retaining explicit legacy resolution", () => {
    expect(CANONICAL_ORGANIZATION_TYPES).toEqual(
      expect.arrayContaining([
        "political_party",
        "parliamentary_group",
        "civic_initiative",
        "association",
        "ngo",
        "trade_union",
        "professional_association",
        "foundation",
        "public_administration",
        "ministry",
        "agency",
        "municipality",
        "public_body",
        "research_institution",
        "company",
        "media_publisher",
        "media_outlet",
        "public_broadcaster",
        "other",
      ]),
    );

    expect(resolveOrganizationType("party")).toMatchObject({
      status: "mapped_legacy",
      canonicalType: "political_party",
      reviewRequired: false,
    });
    expect(resolveOrganizationType("media")).toMatchObject({
      status: "review_required",
      canonicalType: null,
      reviewRequired: true,
    });
    expect(resolveOrganizationType("organization")).toMatchObject({
      status: "review_required",
      canonicalType: null,
      reviewRequired: true,
    });
  });

  it("represents a German federal party and its parliamentary group as separate related entities", () => {
    const party = CanonicalOrganizationSchema.parse({
      id: "org:de:party:example",
      name: "Beispielpartei",
      type: "political_party",
      jurisdictions: [DE],
      localeTags: ["de-DE"],
      primaryLocale: "de-DE",
      reviewStatus: "approved",
    });
    const group = CanonicalOrganizationSchema.parse({
      id: "org:de:parliamentary-group:example",
      name: "Beispielfraktion",
      type: "parliamentary_group",
      jurisdictions: [DE],
      localeTags: ["de-DE"],
      primaryLocale: "de-DE",
      reviewStatus: "approved",
    });
    const relation = OrganizationRelationSchema.parse({
      id: "relation:group-party:example",
      fromOrganizationId: group.id,
      toOrganizationId: party.id,
      relationType: "parliamentary_group_of",
      provenanceRef: "source:bundestag:example",
      reviewStatus: "approved",
    });

    expect(party.id).not.toBe(group.id);
    expect(party.type).toBe("political_party");
    expect(group.type).toBe("parliamentary_group");
    expect(relation.toOrganizationId).toBe(party.id);
  });

  it("supports EU-wide organizations without a fabricated German region", () => {
    const organization = CanonicalOrganizationSchema.parse({
      id: "org:eu:association:example",
      name: "European Example Association",
      type: "association",
      jurisdictions: [EU],
      localeTags: ["en", "de-DE"],
      primaryLocale: "en",
      reviewStatus: "approved",
    });

    const source = OrganizationSourceConnectionUpsertSchema.parse({
      organizationId: organization.id,
      regionId: null,
      jurisdiction: EU,
      locale: "en",
      label: "Official EU feed",
      sourceType: "rss_feed",
      url: "https://example.eu/feed.xml",
      enabled: false,
    });

    expect(source.regionId).toBeNull();
    expect(source.jurisdiction?.level).toBe("supranational");
    expect(source.jurisdiction?.id).toBe("jurisdiction:eu");
  });

  it("keeps the existing regional runtime contract fail-closed on missing regionId", () => {
    expect(
      RegionSourceConnectionUpsertSchema.safeParse({
        label: "Regional feed",
        sourceType: "rss_feed",
        url: "https://example.org/feed.xml",
      }).success,
    ).toBe(false);

    expect(
      OrganizationSourceConnectionUpsertSchema.safeParse({
        organizationId: "org:global:example",
        label: "Global feed without jurisdiction",
        sourceType: "rss_feed",
        url: "https://example.org/feed.xml",
      }).success,
    ).toBe(false);
  });

  it("separates a global media publisher from its outlet", () => {
    const publisher = CanonicalOrganizationSchema.parse({
      id: "org:global:publisher:example",
      name: "Example Media Group",
      type: "media_publisher",
      jurisdictions: [{ id: "jurisdiction:global", level: "global", label: "Global" }],
      localeTags: ["en"],
      reviewStatus: "approved",
    });
    const outlet = CanonicalOrganizationSchema.parse({
      id: "org:global:outlet:example",
      name: "Example News",
      type: "media_outlet",
      jurisdictions: [{ id: "jurisdiction:global", level: "global", label: "Global" }],
      localeTags: ["en"],
      reviewStatus: "approved",
    });
    const relation = OrganizationRelationSchema.parse({
      id: "relation:publisher-outlet:example",
      fromOrganizationId: outlet.id,
      toOrganizationId: publisher.id,
      relationType: "published_by",
      provenanceRef: "source:publisher-imprint:example",
      reviewStatus: "approved",
    });

    expect(publisher.type).toBe("media_publisher");
    expect(outlet.type).toBe("media_outlet");
    expect(relation.fromOrganizationId).not.toBe(relation.toOrganizationId);
  });

  it("allows public brand assets only with reviewed rights and provenance", () => {
    expect(BRAND_ASSET_RIGHTS_BASES).toContain("unknown");
    const approved = BrandAssetSchema.parse({
      id: "brand:org:example:logo:v1",
      organizationId: "org:de:party:example",
      assetType: "logo",
      sourceUrl: "https://example.org/official-logo.svg",
      officialSource: true,
      retrievedAt: "2026-09-03T06:30:00.000Z",
      contentHash: "sha256:0123456789abcdef",
      mimeType: "image/svg+xml",
      dimensions: { width: 640, height: 320 },
      rightsBasis: "official_site_reference",
      rightsNote: "Official source reviewed for this registry fixture.",
      rightsJurisdiction: "DE",
      reviewStatus: "approved",
    });
    const unknownRights = BrandAssetSchema.parse({
      ...approved,
      id: "brand:org:example:logo:unknown",
      rightsBasis: "unknown",
      reviewStatus: "pending_review",
    });

    expect(canUseBrandAssetPublicly(approved, new Date("2026-09-03T07:00:00.000Z"))).toBe(true);
    expect(brandAssetPresentationMode(approved)).toBe("brand_asset");
    expect(canUseBrandAssetPublicly(unknownRights)).toBe(false);
    expect(brandAssetPresentationMode(unknownRights)).toBe("monogram_text_fallback");
    expect(brandAssetPresentationMode(null)).toBe("monogram_text_fallback");
  });

  it("keeps locale tags BCP-47 based and separate from stable organization IDs", () => {
    expect(canonicalizeBcp47Locale("de-de")).toBe("de-DE");
    expect(canonicalizeBcp47Locale("ar")).toBe("ar");
    expect(canonicalizeBcp47Locale("de_DE")).toBeNull();

    const de = CanonicalOrganizationSchema.parse({
      id: "org:stable:42",
      name: "Beispiel",
      type: "ngo",
      jurisdictions: [DE],
      localeTags: ["de-DE", "en"],
      primaryLocale: "de-DE",
      reviewStatus: "approved",
    });
    const en = CanonicalOrganizationSchema.parse({
      ...de,
      name: "Example",
      primaryLocale: "en",
    });

    expect(de.id).toBe(en.id);
  });

  it("exposes the canonical organization subtypes through the existing entity registry", () => {
    expect(ENTITY_TYPES).toEqual(
      expect.arrayContaining([
        "political_party",
        "parliamentary_group",
        "media_publisher",
        "media_outlet",
        "public_broadcaster",
        "trade_union",
        "professional_association",
      ]),
    );
  });
});
