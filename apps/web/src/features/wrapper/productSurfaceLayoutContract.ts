import { normalizeInternalRedirectPath, type InternalRedirectPath } from "@/features/create/finalizeRedirect";
import {
  PRODUCT_SURFACE_ROUTE_IDS,
  type ProductSurfaceRouteId,
} from "@features/routes/routeInventoryContract";

export type ProductSurfaceId = ProductSurfaceRouteId;

export type ProductSurfaceLayoutContract = {
  id: ProductSurfaceId | null;
  isProductSurface: boolean;
  path: InternalRedirectPath | null;
  mainClassName: string;
  shellClassName: string;
};

export const PRODUCT_SURFACE_MAIN_CLASSNAME = "min-h-screen bg-[rgb(var(--bg))] pb-10 sm:pb-12 xl:pb-14";
export const PRODUCT_SURFACE_SHELL_CLASSNAME =
  "mx-auto w-full max-w-[1700px] px-4 py-8 sm:px-6 sm:py-10 lg:px-9 lg:py-12 xl:px-12 xl:py-14";

function toComparablePath(input: InternalRedirectPath): InternalRedirectPath {
  const [pathname] = input.split("?");
  if (pathname.length > 1 && pathname.endsWith("/")) {
    return pathname.slice(0, -1) as InternalRedirectPath;
  }
  return pathname as InternalRedirectPath;
}

function resolveProductSurfaceId(path: InternalRedirectPath): ProductSurfaceId | null {
  return PRODUCT_SURFACE_ROUTE_IDS[path as keyof typeof PRODUCT_SURFACE_ROUTE_IDS] ?? null;
}

export function classifyProductSurfacePath(pathname: unknown): ProductSurfaceLayoutContract {
  const normalizedPath = normalizeInternalRedirectPath(pathname);
  if (!normalizedPath) {
    return {
      id: null,
      isProductSurface: false,
      path: null,
      mainClassName: PRODUCT_SURFACE_MAIN_CLASSNAME,
      shellClassName: PRODUCT_SURFACE_SHELL_CLASSNAME,
    };
  }

  const path = toComparablePath(normalizedPath);
  const id = resolveProductSurfaceId(path);
  return {
    id,
    isProductSurface: Boolean(id),
    path,
    mainClassName: PRODUCT_SURFACE_MAIN_CLASSNAME,
    shellClassName: PRODUCT_SURFACE_SHELL_CLASSNAME,
  };
}

export function isProductSurfacePath(pathname: unknown): boolean {
  return classifyProductSurfacePath(pathname).isProductSurface;
}
