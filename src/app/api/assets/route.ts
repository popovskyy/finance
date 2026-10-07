import { NextResponse } from "next/server";
import { db } from "@/lib/db";
import { HttpError, handle } from "@/lib/http";
import { assertLedgerValid, toTx } from "@/lib/portfolio-service";
import { getQuotes } from "@/lib/prices";
import { CURRENCIES } from "@/lib/prices/fx";
import { createAssetSchema } from "@/lib/validation";

export const GET = handle(async () => {
  const assets = await db.asset.findMany({ orderBy: [{ category: "asc" }, { symbol: "asc" }] });
  return NextResponse.json(assets);
});

/** Creates an asset (or reuses the existing one) and optionally its first transaction. */
export const POST = handle(async (request: Request) => {
  const input = createAssetSchema.parse(await request.json());
  const providerId = input.category === "CASH" ? input.providerId.toUpperCase() : input.providerId;

  const existing = await db.asset.findUnique({
    where: { category_providerId: { category: input.category, providerId } },
    include: { transactions: true },
  });
  const tx = input.transaction && (input.category === "CASH" ? { ...input.transaction, price: 1 } : input.transaction);
  // Check the ledger before writing anything, so a rejected sell leaves no empty asset behind.
  if (tx) assertLedgerValid([...(existing?.transactions.map(toTx) ?? []), tx]);

  if (existing) {
    if (tx) await db.transaction.create({ data: { ...tx, assetId: existing.id } });
    return NextResponse.json({ id: existing.id }, { status: 201 });
  }

  let currency = "USD";
  if (input.category === "CASH") {
    if (!CURRENCIES[providerId]) throw new HttpError(400, "Невідома валюта", "unknown_currency");
    currency = providerId;
  } else if (input.category === "STOCK") {
    const quote = (await getQuotes("STOCK", [providerId]))[providerId];
    if (!quote) throw new HttpError(400, "Не вдалося знайти цей тикер", "unknown_symbol");
    currency = quote.currency;
  }

  // Asset and first transaction are written together in one nested create.
  const asset = await db.asset.create({
    data: {
      category: input.category,
      providerId,
      symbol: input.symbol.toUpperCase(),
      name: input.name,
      currency,
      transactions: tx ? { create: [tx] } : undefined,
    },
  });
  return NextResponse.json({ id: asset.id }, { status: 201 });
});
