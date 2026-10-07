import { expect, type BrowserContext, type Page } from "@playwright/test";
import { authToken } from "../src/lib/auth";
import { E2E_PASSWORD } from "../playwright.config";

/** Skips the password page by setting the auth cookie directly. */
export async function unlock(page: Page) {
  await unlockContext(page.context());
}

export async function unlockContext(context: BrowserContext) {
  await context.addCookies([
    { name: "statky_auth", value: await authToken(E2E_PASSWORD), url: "http://localhost:3211" },
  ]);
}

/** Text with every kind of space removed, so "1 002,00 $" compares as "1002,00$". */
export const squash = (text: string) => text.replace(/\s/g, "");

export async function expectMoney(page: Page, locator: ReturnType<Page["locator"]>, expected: string) {
  await expect.poll(async () => squash(await locator.innerText())).toContain(squash(expected));
}

export const dialog = (page: Page) => page.locator("dialog[open]");

export async function waitDialogClosed(page: Page) {
  await expect(page.locator("dialog[open]")).toHaveCount(0);
}
