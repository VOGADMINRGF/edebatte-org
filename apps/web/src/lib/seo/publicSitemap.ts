import { BRAND } from "@/lib/brand";
import {
  buildStaticPublicDiscoverySitemap,
  type PublicSitemapEntry,
} from "@/lib/seo/publicDiscovery";
import { listContentReleaseTargetsByType } from "@features/contentReleaseWorkbench";
import { isPublicVisibilityState } from "@features/region/publicationRiskLadder";

const INDEXABLE_DYNAMIC_TARGET_TYPES = ["topic_page", "dossier"] as const;

function canonicalPublicUrl(href: string): string | null {
  try {
    const url = new URL(href, BRAND.baseUrl);
    const base = new URL(BRAND.baseUrl);
    if (url.origin !== base.origin) return null;
    if (url.search || url.hash) return null;
    return url.toString();
  } catch {
    return null;
  }
}

async function listVisibleDynamicPublicUrls(): Promise<string[]> {
  try {
    const recordGroups = await Promise.all(
      INDEXABLE_DYNAMIC_TARGET_TYPES.map((targetType) =>
        listContentReleaseTargetsByType(targetType),
      ),
    );

    return Array.from(
      new Set(
        recordGroups
          .flat()
          .filter((record) => isPublicVisibilityState(record.visibilityState))
          .map((record) => canonicalPublicUrl(record.publicHref))
          .filter((url): url is string => Boolean(url)),
      ),
    ).sort();
  } catch (error) {
    console.warn("Public sitemap dynamic discovery failed closed; serving static URLs only.", error);
    return [];
  }
}

export async function buildPublicSitemap(): Promise<PublicSitemapEntry[]> {
  const staticEntries = buildStaticPublicDiscoverySitemap();
  const dynamicUrls = await listVisibleDynamicPublicUrls();
  const urls = new Set(staticEntries.map((entry) => entry.url));

  for (const url of dynamicUrls) urls.add(url);

  return Array.from(urls, (url) => ({ url }));
}
