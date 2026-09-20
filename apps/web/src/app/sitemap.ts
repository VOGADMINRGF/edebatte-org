import { buildPublicSitemap } from "@/lib/seo/publicSitemap";

export const dynamic = "force-dynamic";

export default async function sitemap() {
  return buildPublicSitemap();
}
