import { NextResponse, type NextRequest } from "next/server";
import { HttpError, handle } from "@/lib/http";
import { searchAssets } from "@/lib/prices";
import { categorySchema } from "@/lib/validation";

export const GET = handle(async (request: NextRequest) => {
  const category = categorySchema.parse(request.nextUrl.searchParams.get("category"));
  const query = request.nextUrl.searchParams.get("q") ?? "";
  try {
    return NextResponse.json(await searchAssets(category, query));
  } catch (error) {
    console.warn("[search]", (error as Error).message);
    throw new HttpError(502, "Сервіс цін тимчасово недоступний. Спробуйте за хвилину.", "provider_unavailable");
  }
});
