import { NextResponse } from "next/server";
import { handle } from "@/lib/http";
import { getSettings, updateSettings } from "@/lib/settings";
import { settingsSchema } from "@/lib/validation";

export const GET = handle(async () => NextResponse.json(await getSettings()));

export const PUT = handle(async (request: Request) => {
  const patch = settingsSchema.parse(await request.json());
  return NextResponse.json(await updateSettings(patch));
});
