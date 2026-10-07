import { expect, test } from "@playwright/test";
import { dialog, squash, unlock, waitDialogClosed } from "./helpers";

test.describe.configure({ mode: "serial" });

test("password gate blocks the app until the right password is entered", async ({ page }) => {
  await page.goto("/transactions");
  await expect(page).toHaveURL(/\/unlock\?next=%2Ftransactions/);
  expect((await page.request.get("/api/portfolio")).status()).toBe(401);

  await page.getByLabel("Пароль").fill("wrong");
  await page.getByRole("button", { name: "Відкрити" }).click();
  await expect(page.getByText("Невірний пароль")).toBeVisible();

  await page.getByLabel("Пароль").fill("e2e-password");
  await page.getByRole("button", { name: "Відкрити" }).click();
  await expect(page).toHaveURL(/\/transactions$/);
  await expect(page.getByRole("heading", { name: "Операцій ще немає" })).toBeVisible();
});

test.describe("portfolio flow", () => {
  test.beforeEach(async ({ page }) => unlock(page));

  test("empty dashboard invites adding the first asset", async ({ page }) => {
    await page.goto("/");
    await expect(page.getByRole("heading", { name: "Портфель поки порожній" })).toBeVisible();
  });

  test("adds a crypto, a stock and a cash balance", async ({ page }) => {
    await page.goto("/");

    await page.getByRole("button", { name: "Додати перший актив" }).click();
    await page.getByLabel("Пошук активу").fill("solana");
    await dialog(page).getByRole("button", { name: /^SOL\b/ }).first().click();
    await dialog(page).getByLabel(/Кількість/).fill("10");
    await dialog(page).getByLabel(/Ціна за одиницю/).fill("100");
    await dialog(page).getByLabel(/Комісія/).fill("2");
    await expect(dialog(page).getByRole("button", { name: /Підставити поточну ціну/ })).toBeVisible();
    await expect.poll(async () => squash(await dialog(page).locator("p.tabular").innerText())).toContain("1002,00$");
    await dialog(page).getByRole("button", { name: "Додати до портфеля" }).click();
    await waitDialogClosed(page);
    await expect(page.getByRole("link", { name: /SOL/ })).toBeVisible();

    await page.getByRole("button", { name: "Додати актив" }).click();
    await dialog(page).getByRole("radio", { name: "Акції" }).click();
    await page.getByLabel("Пошук активу").fill("microsoft");
    await dialog(page).getByRole("button", { name: /^MSFT\b/ }).first().click();
    // The quote also tells the form which currency the stock trades in.
    await expect(dialog(page).getByRole("button", { name: /Підставити поточну ціну/ })).toBeVisible();
    await dialog(page).getByLabel(/Кількість/).fill("2");
    await dialog(page).getByLabel(/Ціна за одиницю/).fill("400");
    await dialog(page).getByRole("button", { name: "Додати до портфеля" }).click();
    await waitDialogClosed(page);

    await page.getByRole("button", { name: "Додати актив" }).click();
    await dialog(page).getByRole("radio", { name: "Готівка" }).click();
    await dialog(page).getByRole("button", { name: /^EUR\b/ }).first().click();
    await dialog(page).getByLabel(/Сума/).fill("500");
    await dialog(page).getByRole("button", { name: "Додати до портфеля" }).click();
    await waitDialogClosed(page);

    const rows = page.locator("tbody a");
    await expect(rows).toHaveCount(3);
    await expect(page.getByText("Чисті статки")).toBeVisible();
    // Net worth is positive and allocation lists all three categories.
    for (const name of ["Крипто", "Акції", "Готівка"]) {
      await expect(page.locator("li", { hasText: name }).first()).toBeVisible();
    }
  });

  test("records sells with average-cost PnL and guards the ledger", async ({ page }) => {
    await page.goto("/");
    await page.getByRole("link", { name: /SOL/ }).click();
    await expect(page.getByRole("heading", { name: "SOL" })).toBeVisible();

    await page.getByRole("button", { name: "Нова операція" }).click();
    await dialog(page).getByRole("radio", { name: "Продаж" }).click();
    await dialog(page).getByLabel(/Кількість/).fill("11");
    await dialog(page).getByLabel(/Ціна за одиницю/).fill("150");
    await dialog(page).getByRole("button", { name: "Додати операцію" }).click();
    await expect(dialog(page).getByText(/більше, ніж є/)).toBeVisible();

    await dialog(page).getByLabel(/Кількість/).fill("4");
    await dialog(page).getByLabel(/Комісія/).fill("1");
    await dialog(page).getByRole("button", { name: "Додати операцію" }).click();
    await waitDialogClosed(page);

    // avg cost 100.2; realized = 4×150 − 1 − 4×100.2 = 198.20
    const stats = page.locator("dl").first();
    await expect.poll(async () => squash(await stats.innerText())).toContain("+198,20$");
    await expect.poll(async () => squash(await stats.innerText())).toContain("Середняціна100,20$");

    await page.getByRole("button", { name: "Редагувати операцію" }).first().click();
    await expect(dialog(page).getByLabel(/Кількість/)).toHaveValue("4");
    await dialog(page).getByLabel(/Кількість/).fill("5");
    await dialog(page).getByRole("button", { name: "Зберегти зміни" }).click();
    await waitDialogClosed(page);
    // 5×150 − 1 − 5×100.2 = 248.00
    await expect.poll(async () => squash(await stats.innerText())).toContain("+248,00$");

    // Removing the buy would leave the sell uncovered.
    await page.getByRole("button", { name: "Видалити операцію" }).last().click();
    await page.getByRole("button", { name: "Видалити?" }).click();
    await expect(page.getByText(/більше, ніж є/)).toBeVisible();
    await expect(page.locator("tbody tr")).toHaveCount(2);
  });

  test("a rejected first sell does not leave an empty asset behind", async ({ page }) => {
    await page.goto("/");
    const response = await page.request.post("/api/assets", {
      data: {
        category: "CRYPTO",
        providerId: "cardano",
        symbol: "ADA",
        name: "Cardano",
        transaction: { type: "SELL", date: new Date().toISOString(), quantity: 1, price: 1, fee: 0 },
      },
    });
    expect(response.status()).toBe(400);
    const assets = await (await page.request.get("/api/assets")).json();
    expect(assets.map((a: { symbol: string }) => a.symbol)).not.toContain("ADA");
  });

  test("lists every operation in the journal", async ({ page }) => {
    await page.goto("/transactions");
    await expect(page.locator("tbody tr")).toHaveCount(4);
    await expect(page.locator("tbody")).toContainText("Поповнення");
    await expect(page.locator("tbody")).toContainText("Продаж");
  });

  test("switches the PnL timeframe", async ({ page }) => {
    await page.goto("/");
    await page.getByRole("radio", { name: "Місяць" }).click();
    await expect(page.getByText("за місяць")).toBeVisible();
    await expect(page.locator("thead")).toContainText("Місяць");
    await page.getByRole("radio", { name: "Увесь час" }).click();
    await expect(page.getByText("за весь час")).toBeVisible();
  });

  test("changes the base currency", async ({ page }) => {
    await page.goto("/settings");
    await page.getByLabel("Основна валюта").selectOption("EUR");
    await page.goto("/");
    await expect.poll(async () => squash(await page.locator("p.font-display").first().innerText())).toContain("€");
    await page.goto("/settings");
    await page.getByLabel("Основна валюта").selectOption("USD");
  });

  test("deletes an asset with its operations", async ({ page }) => {
    await page.goto("/");
    await page.getByRole("link", { name: /MSFT/ }).click();
    await page.getByRole("button", { name: "Видалити актив" }).click();
    await page.getByRole("button", { name: "Точно видалити?" }).click();
    await expect(page).toHaveURL(/\/$/);
    await expect(page.locator("tbody a")).toHaveCount(2);
  });

  test("AI analyst writes a report and answers in chat", async ({ page }) => {
    test.skip(!process.env.GEMINI_API_KEY && !process.env.CI_HAS_GEMINI, "needs GEMINI_API_KEY");
    test.setTimeout(150_000);
    await page.goto("/");
    await page.getByRole("button", { name: "Проаналізувати портфель" }).click();
    await expect(page.getByRole("heading", { name: "Оцінка ризику" })).toBeVisible({ timeout: 90_000 });

    // Slow history load, as on a cold serverless start: a reply sent meanwhile must not vanish.
    await page.route("**/api/ai/chat", async (route) => {
      if (route.request().method() === "GET") await new Promise((resolve) => setTimeout(resolve, 2500));
      await route.continue();
    });
    await page.getByRole("button", { name: "Відкрити чат з AI-аналітиком" }).click();
    await page.getByLabel("Ваше питання").fill("Скільки SOL у мене зараз? Відповідь одним реченням.");
    await page.getByRole("button", { name: "Надіслати" }).click();
    const reply = page.locator(".chat-panel .bg-surface-2").last();
    await expect(reply).toContainText(/5/, { timeout: 60_000 });
    await expect(page.locator(".chat-panel .caret")).toHaveCount(0, { timeout: 60_000 });
  });
});
