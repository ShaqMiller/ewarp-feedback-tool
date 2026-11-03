import { NextResponse, type NextRequest } from "next/server";
import { SESSION_COOKIE } from "@/lib/api/cookies";

// Sends anyone without a session cookie to the login page. This only checks that the cookie exists;
// the API checks the token itself and a 401 also lands on /login (see forward() in src/lib/api).
export function proxy(request: NextRequest) {
  if (request.cookies.has(SESSION_COOKIE)) return NextResponse.next();
  const url = new URL("/login", request.url);
  const { pathname, search } = request.nextUrl;
  if (pathname !== "/") url.searchParams.set("next", pathname + search);
  return NextResponse.redirect(url);
}

// Everything except the login page, the reference API (it takes bearer tokens) and static files.
export const config = {
  matcher: ["/((?!login|api/|_next/static|_next/image|favicon.ico).*)"],
};
