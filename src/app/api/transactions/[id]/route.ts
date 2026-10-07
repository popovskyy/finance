import { NextResponse } from "next/server";
import { db } from "@/lib/db";
import { handle, notFound } from "@/lib/http";
import { assertLedgerValid, toTx } from "@/lib/portfolio-service";
import { transactionInputSchema } from "@/lib/validation";

async function loadWithSiblings(id: string) {
  const existing = await db.transaction.findUnique({
    where: { id },
    include: { asset: { include: { transactions: { orderBy: [{ date: "asc" }, { createdAt: "asc" }] } } } },
  });
  if (!existing) throw notFound("Транзакцію не знайдено");
  return { existing, siblings: existing.asset.transactions.filter((t) => t.id !== id).map(toTx) };
}

export const PUT = handle(async (request: Request, ctx: RouteContext<"/api/transactions/[id]">) => {
  const { id } = await ctx.params;
  const input = transactionInputSchema.parse(await request.json());
  const { existing, siblings } = await loadWithSiblings(id);

  const tx = existing.asset.category === "CASH" ? { ...input, price: 1 } : input;
  assertLedgerValid([...siblings, tx]);
  const updated = await db.transaction.update({ where: { id }, data: { ...tx, note: tx.note ?? null } });
  return NextResponse.json(updated);
});

export const DELETE = handle(async (_request: Request, ctx: RouteContext<"/api/transactions/[id]">) => {
  const { id } = await ctx.params;
  const { siblings } = await loadWithSiblings(id);
  // Removing a buy must not leave a later sell without the units to cover it.
  assertLedgerValid(siblings);
  await db.transaction.delete({ where: { id } });
  return new NextResponse(null, { status: 204 });
});
