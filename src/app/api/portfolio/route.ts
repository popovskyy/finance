import { NextResponse } from "next/server";
import { handle } from "@/lib/http";
import { getPortfolio } from "@/lib/portfolio-service";

export const GET = handle(async () => NextResponse.json(await getPortfolio()));
