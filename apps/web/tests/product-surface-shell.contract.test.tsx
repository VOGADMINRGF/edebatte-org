import { readFileSync } from "node:fs";
import { resolve } from "node:path";
import { describe, expect, it, vi } from "vitest";
import { renderToStaticMarkup } from "react-dom/server";
import PricingPage from "@/app/pricing/page";
import InstitutionalPricingPage from "@/app/pricing/institutionen/page";
import OrderPage from "@/app/order/page";
import VormerkenPage from "@/app/vormerken/page";
import {
  PRODUCT_SURFACE_MAIN_CLASSNAME,
  PRODUCT_SURFACE_SHELL_CLASSNAME,
  classifyProductSurfacePath,
} from "@/features/wrapper/productSurfaceLayoutContract";

const mockNavigation = vi.hoisted(() => ({
  params: new URLSearchParams(),
}));

vi.mock("next/navigation", () => ({
  useSearchParams: () => mockNavigation.params,
}));

function countMatches(input: string, pattern: RegExp) {
  return (input.match(pattern) ?? []).length;
}

async function renderPricing() {
  const element = await PricingPage();
  return renderToStaticMarkup(element);
}

async function renderInstitutions() {
  const element = await InstitutionalPricingPage();
  return renderToStaticMarkup(element);
}

function renderOrder(query = "") {
  mockNavigation.params = new URLSearchParams(query);
  return renderToStaticMarkup(<OrderPage />);
}

function renderVormerken(query = "") {
  mockNavigation.params = new URLSearchParams(query);
  return renderToStaticMarkup(<VormerkenPage />);
}

describe("product surface layout contract", () => {
  it("classifies product surface routes explicitly", () => {
    expect(classifyProductSurfacePath("/pricing").id).toBe("pricing");
    expect(classifyProductSurfacePath("/order?segment=organisationen").id).toBe("order");
    expect(classifyProductSurfacePath("/vormerken?segment=kommunen").id).toBe("vormerken");
    expect(classifyProductSurfacePath("/pricing/institutionen").id).toBe("pricing_institutionen");
    expect(classifyProductSurfacePath("/account").isProductSurface).toBe(false);
  });

  it("keeps /pricing, /order, /vormerken and /pricing/institutionen on one shared shell wrapper", async () => {
    const pricing = await renderPricing();
    const institutions = await renderInstitutions();
    const order = renderOrder();
    const vormerken = renderVormerken();

    [pricing, institutions, order, vormerken].forEach((html) => {
      expect(html).toContain('data-product-surface-root="true"');
      expect(html).toContain('data-product-surface-shell="true"');
      expect(html).toContain(PRODUCT_SURFACE_MAIN_CLASSNAME);
      expect(html).toContain(PRODUCT_SURFACE_SHELL_CLASSNAME);
      expect(countMatches(html, /data-product-surface-shell="true"/g)).toBe(1);
      expect(html).not.toContain("max-w-7xl");
    });
  });

  it("scopes mobile shell bottom spacing to the site-main contract only", () => {
    const css = readFileSync(resolve(process.cwd(), "src/app/globals.css"), "utf8");
    const layout = readFileSync(resolve(process.cwd(), "src/app/layout.tsx"), "utf8");

    expect(css).toContain('body.vog-mobile-app-shell-nav [data-site-main="true"]');
    expect(css).not.toContain("body.vog-mobile-app-shell-nav main");
    expect(layout).toContain('data-site-main="true"');
    expect(layout).toContain('data-site-safe-area-spacer="true"');
  });
});
