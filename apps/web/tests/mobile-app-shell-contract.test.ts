import { describe, expect, it } from "vitest";
import { classifyMobileAppShellPath } from "@/features/wrapper/mobileAppShellContract";

describe("mobile app shell contract", () => {
  it("enables core app shell + bottom nav on core paths", () => {
    const surface = classifyMobileAppShellPath("/swipes?fromDraft=abc");
    expect(surface.shellEnabled).toBe(true);
    expect(surface.bottomNavEnabled).toBe(true);
    expect(surface.hideFooter).toBe(true);
    expect(surface.reason).toBe("core");
  });

  it("keeps create/factcheck/companion in mobile core shell", () => {
    const create = classifyMobileAppShellPath("/create?mode=guided");
    expect(create.shellEnabled).toBe(true);
    expect(create.bottomNavEnabled).toBe(true);
    expect(create.reason).toBe("core");

    const factcheck = classifyMobileAppShellPath("/factcheck");
    expect(factcheck.shellEnabled).toBe(true);
    expect(factcheck.bottomNavEnabled).toBe(true);
    expect(factcheck.reason).toBe("core");

    const companion = classifyMobileAppShellPath("/companion/mobilitaet-berlin");
    expect(companion.shellEnabled).toBe(true);
    expect(companion.bottomNavEnabled).toBe(true);
    expect(companion.reason).toBe("core");

    const themen = classifyMobileAppShellPath("/themen");
    expect(themen.shellEnabled).toBe(true);
    expect(themen.bottomNavEnabled).toBe(true);
    expect(themen.reason).toBe("core");

    const topicDetail = classifyMobileAppShellPath("/topic/bezahlbare-energie-und-waermewende-berlin");
    expect(topicDetail.shellEnabled).toBe(true);
    expect(topicDetail.bottomNavEnabled).toBe(true);
    expect(topicDetail.reason).toBe("core");
  });

  it("keeps nested pricing routes inside core shell", () => {
    const pricing = classifyMobileAppShellPath("/pricing?segment=journalismus");
    expect(pricing.shellEnabled).toBe(true);
    expect(pricing.bottomNavEnabled).toBe(true);
    expect(pricing.reason).toBe("core");

    const order = classifyMobileAppShellPath("/order?segment=organisationen");
    expect(order.shellEnabled).toBe(true);
    expect(order.bottomNavEnabled).toBe(true);
    expect(order.reason).toBe("core");

    const preorder = classifyMobileAppShellPath("/vormerken?segment=kommunen");
    expect(preorder.shellEnabled).toBe(true);
    expect(preorder.bottomNavEnabled).toBe(true);
    expect(preorder.reason).toBe("core");

    const nestedPricing = classifyMobileAppShellPath("/pricing/institutionen");
    expect(nestedPricing.shellEnabled).toBe(true);
    expect(nestedPricing.bottomNavEnabled).toBe(true);
    expect(nestedPricing.reason).toBe("core");
  });

  it("enables compact auth shell without bottom nav for login/register paths", () => {
    const login = classifyMobileAppShellPath("/login");
    const register = classifyMobileAppShellPath("/register/verify-email");
    expect(login.shellEnabled).toBe(true);
    expect(login.bottomNavEnabled).toBe(false);
    expect(login.reason).toBe("auth");
    expect(register.shellEnabled).toBe(true);
    expect(register.bottomNavEnabled).toBe(false);
    expect(register.reason).toBe("auth");
  });

  it("excludes admin/demo/operator routes from app shell", () => {
    const admin = classifyMobileAppShellPath("/admin/reports");
    expect(admin.shellEnabled).toBe(false);
    expect(admin.reason).toBe("excluded");
  });

  it("keeps unrelated routes in normal web shell", () => {
    const normal = classifyMobileAppShellPath("/faq");
    expect(normal.shellEnabled).toBe(false);
    expect(normal.bottomNavEnabled).toBe(false);
    expect(normal.reason).toBe("web");
  });
});
