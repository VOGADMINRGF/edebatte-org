import { test, expect } from "@playwright/test";

test("admin users page requires login", async ({ page }) => {
  await page.goto("/admin/users");
  await expect(page).toHaveURL(/\/login/);
});
