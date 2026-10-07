import { expect, test } from "@playwright/test";
import { unlock } from "./helpers";

test.beforeEach(async ({ page }) => unlock(page));

test("fits a phone screen with bottom navigation", async ({ page }) => {
  await page.goto("/");
  await expect(page.getByRole("navigation", { name: "Основна навігація" }).last()).toBeVisible();
  const overflow = await page.evaluate(() => document.documentElement.scrollWidth - window.innerWidth);
  expect(overflow).toBeLessThanOrEqual(0);
  await page.screenshot({ path: "test-results/mobile-dashboard.png" });
});

test("opens add-asset as a bottom sheet", async ({ page }) => {
  await page.goto("/");
  await page.getByRole("button", { name: /Додати/ }).first().click();
  const sheet = page.locator("dialog[open]");
  await expect(sheet).toBeVisible();
  await expect.poll(async () => {
    const box = await sheet.boundingBox();
    const vh = page.viewportSize()!.height;
    return box ? Math.round(box.y + box.height - vh) : 999;
  }).toBe(0);
});

test("is installable on iOS", async ({ page, request }) => {
  await page.goto("/");
  await expect(page.locator('link[rel="apple-touch-icon"]')).toHaveAttribute("href", "/icons/apple-touch-icon.png");
  await expect(page.locator('meta[name="apple-mobile-web-app-capable"], meta[name="mobile-web-app-capable"]').first()).toHaveAttribute("content", "yes");
  const manifest = await (await request.get("/manifest.webmanifest")).json();
  expect(manifest.display).toBe("standalone");
  expect(manifest.icons.map((i: { sizes: string }) => i.sizes)).toEqual(expect.arrayContaining(["192x192", "512x512"]));
  expect((await request.get("/sw.js")).ok()).toBe(true);
  expect((await request.get("/icons/apple-touch-icon.png")).ok()).toBe(true);
  await expect.poll(() => page.evaluate(async () => Boolean(await navigator.serviceWorker?.getRegistration()))).toBe(true);
});
