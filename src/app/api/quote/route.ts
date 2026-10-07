import { NextResponse, type NextRequest } from "next/server";
import { handle } from "@/lib/http";
import { getQuotes } from "@/lib/prices";
import { categorySchema } from "@/lib/validation";

/** Current price and quote currency for one asset; null when the provider has no data. */
export const GET = handle(async (request: NextRequest) => {
  const category = categorySchema.parse(request.nextUrl.searchParams.get("category"));
  const id = request.nextUrl.searchParams.get("id") ?? "";
  if (category === "CASH") return NextResponse.json({ price: 1, currency: id.toUpperCase() });
  const quote = id ? (await getQuotes(category, [id]))[id] : undefined;
  return NextResponse.json(quote ? { price: quote.price, currency: quote.currency } : null);
});
