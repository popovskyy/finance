import { NextResponse } from "next/server";
import { db } from "@/lib/db";
import { handle, notFound } from "@/lib/http";

export const GET = handle(async (_request: Request, ctx: RouteContext<"/api/assets/[id]">) => {
  const { id } = await ctx.params;
  const asset = await db.asset.findUnique({
    where: { id },
    include: { transactions: { orderBy: { date: "desc" } } },
  });
  if (!asset) throw notFound("Актив не знайдено");
  return NextResponse.json(asset);
});

export const DELETE = handle(async (_request: Request, ctx: RouteContext<"/api/assets/[id]">) => {
  const { id } = await ctx.params;
  const asset = await db.asset.findUnique({ where: { id } });
  if (!asset) throw notFound("Актив не знайдено");
  await db.asset.delete({ where: { id } });
  return new NextResponse(null, { status: 204 });
});
