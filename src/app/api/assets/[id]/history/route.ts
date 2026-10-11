import { NextResponse, type NextRequest } from "next/server";
import { handle, notFound } from "@/lib/http";
import { getAssetPriceHistory } from "@/lib/portfolio-service";
import { rangeSchema } from "@/lib/validation";

export const GET = handle(async (request: NextRequest, ctx: RouteContext<"/api/assets/[id]/history">) => {
  const { id } = await ctx.params;
  const range = rangeSchema.parse(request.nextUrl.searchParams.get("range") ?? "3M");
  const points = await getAssetPriceHistory(id, range);
  if (!points) throw notFound("Актив не знайдено");
  return NextResponse.json(points);
});
