import { NextResponse } from "next/server";
import { db } from "@/lib/db";
import { handle, notFound } from "@/lib/http";
import { assertLedgerValid, toTx } from "@/lib/portfolio-service";
import { createTransactionSchema } from "@/lib/validation";

export const GET = handle(async () => {
  const transactions = await db.transaction.findMany({
    orderBy: { date: "desc" },
    include: { asset: { select: { id: true, symbol: true, name: true, category: true, currency: true } } },
  });
  return NextResponse.json(transactions);
});

export const POST = handle(async (request: Request) => {
  const { assetId, ...input } = createTransactionSchema.parse(await request.json());
  const asset = await db.asset.findUnique({ where: { id: assetId }, include: { transactions: { orderBy: [{ date: "asc" }, { createdAt: "asc" }] } } });
  if (!asset) throw notFound("Актив не знайдено");

  const tx = asset.category === "CASH" ? { ...input, price: 1 } : input;
  assertLedgerValid([...asset.transactions.map(toTx), tx]);
  const created = await db.transaction.create({ data: { ...tx, assetId } });
  return NextResponse.json(created, { status: 201 });
});
