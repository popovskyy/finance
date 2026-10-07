import { expect, test, type APIRequestContext, type BrowserContext, type Page } from "@playwright/test";
import { unlockContext } from "./helpers";

// Every page, dialog and the chat at phone, tablet and desktop widths, filled with
// awkward data (long names, seven-digit sums, a stale price): nothing may stick out.

const WIDTHS = [
  { width: 360, height: 760 },
  { width: 375, height: 667 },
  { width: 393, height: 852 },
  { width: 768, height: 1024 },
  { width: 1024, height: 768 },
  { width: 1280, height: 800 },
  { width: 1440, height: 900 },
];
const SHOTS = "test-results/layout";

let context: BrowserContext;
let api: APIRequestContext;
const ids: Record<string, string> = {};

const daysAgo = (days: number) => new Date(Date.now() - days * 86_400_000).toISOString();

async function addAsset(key: string, body: Record<string, unknown>) {
  const response = await api.post("/api/assets", { data: body });
  expect(response.status(), await response.text()).toBe(201);
  ids[key] = (await response.json()).id;
}

test.beforeAll(async ({ browser }) => {
  context = await browser.newContext({ locale: "uk-UA" });
  await unlockContext(context);
  api = context.request;
  await addAsset("usd", {
    category: "CASH", providerId: "USD", symbol: "USD", name: "Долар США",
    transaction: { type: "DEPOSIT", date: daysAgo(60), quantity: 1_250_000, price: 1, fee: 0 },
  });
  await addAsset("uah", {
    category: "CASH", providerId: "UAH", symbol: "UAH", name: "Українська гривня",
    transaction: { type: "DEPOSIT", date: daysAgo(40), quantity: 85_000, price: 1, fee: 0 },
  });
  await addAsset("vuaa", {
    category: "STOCK", providerId: "VUAA.L", symbol: "VUAA", name: "Vanguard S&P 500 UCITS ETF USD Accumulation",
    transaction: { type: "BUY", date: daysAgo(50), quantity: 123.93, price: 120.5, fee: 1.25,
      note: "Щомісячна купівля через брокера, довга нотатка для перевірки обрізання тексту" },
  });
  await api.post("/api/transactions", {
    data: { assetId: ids.vuaa, type: "SELL", date: daysAgo(10), quantity: 20, price: 150.12, fee: 1 },
  });
  await addAsset("orcl", {
    category: "STOCK", providerId: "ORCL", symbol: "ORCL", name: "Oracle Corporation",
    transaction: { type: "BUY", date: daysAgo(35), quantity: 54.5, price: 120, fee: 0 },
  });
  await addAsset("dash", {
    category: "CRYPTO", providerId: "dash", symbol: "DASH", name: "Dash",
    transaction: { type: "BUY", date: daysAgo(30), quantity: 183.456789, price: 40.1234, fee: 0.5 },
  });
  // Unknown coin: no market price, so the stale warning shows up too.
  await addAsset("ghost", {
    category: "CRYPTO", providerId: "statky-layout-ghost-coin", symbol: "GHOSTCOINXL",
    name: "Дуже довга назва тестової монети для перевірки верстки",
    transaction: { type: "BUY", date: daysAgo(20), quantity: 0.00012345, price: 98765.4321, fee: 0 },
  });
});

test.afterAll(async () => {
  for (const id of Object.values(ids)) await api.delete(`/api/assets/${id}`);
  await context.close();
});

/** Lists anything that scrolls sideways, sticks out of the viewport or spills out of its box. */
async function findOverflow(page: Page): Promise<string[]> {
  return page.evaluate(() => {
    const vw = document.documentElement.clientWidth;
    const problems = new Set<string>();
    const name = (el: Element) => {
      const text = (el.textContent ?? "").trim().replace(/\s+/g, " ").slice(0, 40);
      const cls = typeof el.className === "string" ? el.className.split(" ").slice(0, 4).join(".") : "";
      return `<${el.tagName.toLowerCase()} ${cls}> "${text}"`;
    };
    if (document.documentElement.scrollWidth > vw + 1) {
      problems.add(`page scrolls sideways: ${document.documentElement.scrollWidth}px > ${vw}px`);
    }
    for (const el of document.querySelectorAll<HTMLElement>("body *")) {
      const style = getComputedStyle(el);
      if (style.display === "none" || style.visibility === "hidden" || style.display === "contents") continue;
      const rect = el.getBoundingClientRect();
      if (rect.width <= 1 || rect.height <= 1) continue;
      if (el.closest("svg") && el.tagName.toLowerCase() !== "svg") continue;
      if (el.closest(".recharts-wrapper")) continue;
      const clipped = el.closest(".truncate");
      if (/(auto|scroll)/.test(style.overflowX) && el.scrollWidth > el.clientWidth + 1) {
        problems.add(`scrolls sideways (${el.scrollWidth}px in ${el.clientWidth}px): ${name(el)}`);
      }
      if (!clipped && (rect.right > vw + 1 || rect.left < -1)) {
        problems.add(`sticks out of the screen (${Math.round(rect.left)}..${Math.round(rect.right)} of ${vw}): ${name(el)}`);
      }
      const isText = style.display !== "inline" && [...el.childNodes].some((n) => n.nodeType === 3 && n.textContent!.trim());
      if (isText && !clipped && style.overflowX === "visible" && el.scrollWidth > el.clientWidth + 1) {
        problems.add(`text spills out of its box (${el.scrollWidth}px in ${el.clientWidth}px): ${name(el)}`);
      }
      // Grids and flex rows whose children no longer fit push content past their own edge.
      const box = /^(block|flex|grid|inline-flex|inline-grid|list-item)$/.test(style.display);
      if (box && !isText && !clipped && style.overflowX === "visible" && el.scrollWidth > el.clientWidth + 1) {
        problems.add(`content spills out of its box (${el.scrollWidth}px in ${el.clientWidth}px): ${name(el)}`);
      }
    }
    return [...problems];
  });
}

async function check(page: Page, label: string, width: number) {
  await page.waitForTimeout(1100); // let entrance and chart animations finish
  const problems = await findOverflow(page);
  await page.screenshot({ path: `${SHOTS}/${width}-${label}.png`, fullPage: true });
  expect.soft(problems, `${label} at ${width}px`).toEqual([]);
}

for (const size of WIDTHS) {
  test(`nothing overflows at ${size.width}px`, async () => {
    test.setTimeout(150_000);
    const page = await context.newPage();
    await page.setViewportSize(size);

    await page.goto("/");
    await expect(page.getByRole("heading", { name: "Активи" })).toBeVisible({ timeout: 60_000 });
    await expect(page.getByText("Частина цін може бути застарілою")).toBeVisible();
    // The first visit also fetches every price history, so allow it time.
    await expect(page.locator(".recharts-area-curve")).toBeVisible({ timeout: 60_000 });
    await check(page, "dashboard", size.width);
    // The name column gives way to the figures but must stay readable.
    const nameWidths = await page.locator("tbody td:first-child").evaluateAll((cells) =>
      cells.map((cell) => Math.round(cell.getBoundingClientRect().width)),
    );
    expect.soft(Math.min(...nameWidths), `asset name column at ${size.width}px`).toBeGreaterThanOrEqual(110);

    await page.getByRole("radio", { name: "Увесь час" }).click();
    await check(page, "dashboard-all-time", size.width);

    await page.getByRole("button", { name: "Додати актив" }).click();
    // Stocks: Yahoo search, which is not rate-limited like CoinGecko's public API.
    await page.locator("dialog[open]").getByRole("radio", { name: "Акції" }).click();
    await page.getByLabel("Пошук активу").fill("apple");
    await expect(page.locator("dialog[open] li").first()).toBeVisible({ timeout: 30_000 });
    await check(page, "add-search", size.width);
    await page.locator("dialog[open] li button").first().click();
    await page.locator("dialog[open]").getByLabel(/Кількість/).fill("1234,56789");
    await page.locator("dialog[open]").getByLabel(/Ціна за одиницю/).fill("98765,43");
    await page.locator("dialog[open]").getByLabel(/Комісія/).fill("12,5");
    await check(page, "add-form", size.width);
    await page.keyboard.press("Escape");

    await page.getByRole("button", { name: "Відкрити чат з AI-аналітиком" }).click();
    await expect(page.locator(".chat-panel[data-open='true']")).toBeVisible();
    await check(page, "chat", size.width);
    await page.getByRole("button", { name: "Закрити чат" }).first().click();

    await page.goto("/transactions");
    await expect(page.locator("tbody tr")).toHaveCount(7);
    await check(page, "transactions", size.width);

    await page.goto(`/assets/${ids.vuaa}`);
    await expect(page.getByRole("heading", { name: "VUAA" })).toBeVisible();
    await expect(page.getByText("Зафіксований результат")).toBeVisible();
    await check(page, "asset-stock", size.width);
    await page.getByRole("button", { name: "Нова операція" }).click();
    await page.locator("dialog[open]").getByRole("radio", { name: "Надходження" }).click();
    await check(page, "transaction-dialog", size.width);
    await page.keyboard.press("Escape");

    await page.goto(`/assets/${ids.uah}`);
    await expect(page.getByRole("heading", { name: "UAH" })).toBeVisible();
    await check(page, "asset-cash", size.width);

    await page.goto("/settings");
    await expect(page.getByLabel("Основна валюта")).toBeVisible();
    await check(page, "settings", size.width);

    const anonymous = await context.browser()!.newPage({ viewport: size, locale: "uk-UA" });
    await anonymous.goto("/unlock");
    await expect(anonymous.getByLabel("Пароль")).toBeVisible();
    await check(anonymous, "unlock", size.width);
    await anonymous.close();
    await page.close();
  });
}
