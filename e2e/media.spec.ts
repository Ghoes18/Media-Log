import { test, expect } from "@playwright/test";

test.describe("Media", () => {
  test("media page route is reachable", async ({ page }) => {
    await page.goto("/m/test-media-id");
    await expect(page.locator("body")).toBeVisible();
  });
});
