import { NextResponse, type NextRequest } from "next/server";
import { AUTH_COOKIE, isAuthorized } from "@/lib/auth";

export async function proxy(request: NextRequest) {
  if (await isAuthorized(request.cookies.get(AUTH_COOKIE)?.value)) return NextResponse.next();

  const { pathname, search } = request.nextUrl;
  if (pathname.startsWith("/api/")) {
    return NextResponse.json({ error: "Потрібен пароль", code: "unauthorized" }, { status: 401 });
  }
  const url = new URL("/unlock", request.url);
  if (pathname !== "/") url.searchParams.set("next", pathname + search);
  return NextResponse.redirect(url);
}

export const config = {
  // Everything except the unlock flow and the static files a locked device still needs.
  matcher: [
    "/((?!unlock|api/unlock|_next/static|_next/image|icons/|favicon.ico|manifest.webmanifest|sw.js|offline.html).*)",
  ],
};
