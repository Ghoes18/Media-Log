import { test, expect } from "@playwright/test";

test.describe("Smoke", () => {
  test("home page loads", async ({ page }) => {
    await page.goto("/");
    await expect(page.locator("body")).toBeVisible();
  });

  test("discover page loads", async ({ page }) => {
    await page.goto("/discover");
    await expect(page.locator("body")).toBeVisible();
  });

  test("navigation works", async ({ page }) => {
    await page.goto("/");
    const consentAccept = page.getByRole("button", { name: /accept|agree|allow/i });
    if (await consentAccept.isVisible()) {
      await consentAccept.click();
    }
    await page.getByRole("link", { name: /discover/i }).first().click();
    await expect(page).toHaveURL(/\/discover/);
  });
});
