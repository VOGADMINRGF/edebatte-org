import { BRAND } from "@/lib/brand";

const PRIVATE_CRAWL_PATHS = ["/api/", "/admin/", "/konto/", "/login/"];

export default function robots() {
  return {
    rules: [
      {
        userAgent: "OAI-SearchBot",
        allow: "/",
        disallow: PRIVATE_CRAWL_PATHS,
      },
      {
        userAgent: "*",
        allow: "/",
        disallow: PRIVATE_CRAWL_PATHS,
      },
    ],
    host: BRAND.baseUrl,
    sitemap: `${BRAND.baseUrl}/sitemap.xml`,
  };
}
