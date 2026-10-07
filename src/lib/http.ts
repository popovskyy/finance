import { NextResponse } from "next/server";
import { ZodError } from "zod";
import { InsufficientHoldingsError } from "@/lib/pnl/positions";

export class HttpError extends Error {
  constructor(
    public readonly status: number,
    message: string,
    public readonly code?: string,
  ) {
    super(message);
  }
}

export const notFound = (what = "Не знайдено") => new HttpError(404, what, "not_found");

/** Wraps a route handler so thrown errors become consistent JSON responses. */
export function handle<Args extends unknown[]>(fn: (...args: Args) => Promise<Response>) {
  return async (...args: Args): Promise<Response> => {
    try {
      return await fn(...args);
    } catch (error) {
      if (error instanceof ZodError) {
        const issue = error.issues[0];
        const field = issue?.path.join(".");
        return NextResponse.json(
          { error: field ? `${field}: ${issue.message}` : (issue?.message ?? "Некоректні дані"), code: "invalid_input" },
          { status: 400 },
        );
      }
      if (error instanceof InsufficientHoldingsError) {
        return NextResponse.json({ error: "Не можна продати або вивести більше, ніж є на цю дату", code: "insufficient_holdings" }, { status: 400 });
      }
      if (error instanceof HttpError) {
        return NextResponse.json({ error: error.message, code: error.code }, { status: error.status });
      }
      console.error(error);
      return NextResponse.json({ error: "Внутрішня помилка сервера", code: "internal" }, { status: 500 });
    }
  };
}
