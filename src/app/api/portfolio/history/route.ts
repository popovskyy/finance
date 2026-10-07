import { NextResponse, type NextRequest } from "next/server";
import { handle } from "@/lib/http";
import { getPortfolioHistory } from "@/lib/portfolio-service";
import { rangeSchema } from "@/lib/validation";

export const GET = handle(async (request: NextRequest) => {
  const range = rangeSchema.parse(request.nextUrl.searchParams.get("range") ?? "1M");
  return NextResponse.json(await getPortfolioHistory(range));
});
