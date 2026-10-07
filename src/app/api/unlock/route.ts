import { NextResponse } from "next/server";
import { z } from "zod";
import { AUTH_COOKIE, AUTH_MAX_AGE, authToken, safeEqual } from "@/lib/auth";
import { db } from "@/lib/db";
import { HttpError, handle } from "@/lib/http";

const bodySchema = z.object({ password: z.string().max(200) });

const FAILS_KEY = "auth:fails";
const MAX_FAILS = 10;
const WINDOW_MS = 15 * 60_000;

interface Fails {
  count: number;
  since: number;
}

async function readFails(): Promise<Fails> {
  const row = await db.setting.findUnique({ where: { key: FAILS_KEY } });
  const fails = row ? (JSON.parse(row.value) as Fails) : null;
  return fails && Date.now() - fails.since < WINDOW_MS ? fails : { count: 0, since: Date.now() };
}

async function writeFails(fails: Fails) {
  const value = JSON.stringify(fails);
  await db.setting.upsert({ where: { key: FAILS_KEY }, create: { key: FAILS_KEY, value }, update: { value } });
}

export const POST = handle(async (request: Request) => {
  const expected = process.env.APP_PASSWORD;
  const { password } = bodySchema.parse(await request.json());
  const response = new NextResponse(null, { status: 204 });
  if (!expected) return response;

  // The counter lives in the database so it holds across serverless instances.
  const fails = await readFails();
  if (fails.count >= MAX_FAILS) {
    throw new HttpError(429, "Забагато спроб. Спробуйте через 15 хвилин.", "too_many_attempts");
  }
  if (!safeEqual(password, expected)) {
    await writeFails({ count: fails.count + 1, since: fails.since });
    await new Promise((resolve) => setTimeout(resolve, 800));
    throw new HttpError(401, "Невірний пароль", "wrong_password");
  }
  if (fails.count > 0) await db.setting.delete({ where: { key: FAILS_KEY } }).catch(() => {});

  response.cookies.set(AUTH_COOKIE, await authToken(expected), {
    httpOnly: true,
    secure: process.env.NODE_ENV === "production",
    sameSite: "lax",
    path: "/",
    maxAge: AUTH_MAX_AGE,
  });
  return response;
});
