import { NextResponse } from "next/server";
import { auth } from "@/lib/auth";

const CABINET_PREFIXES = ["/dashboard", "/clients", "/schedule", "/sessions", "/settings"];

export default auth((req) => {
  const isCabinetRoute = CABINET_PREFIXES.some((prefix) =>
    req.nextUrl.pathname.startsWith(prefix)
  );
  if (isCabinetRoute && !req.auth) {
    const loginUrl = new URL("/login", req.nextUrl.origin);
    return NextResponse.redirect(loginUrl);
  }
});

export const config = {
  // Next.js requires this to be a static array literal (no computed values),
  // so it can't be derived from CABINET_PREFIXES above — keep both in sync
  // by hand when adding a new cabinet route.
  matcher: [
    "/dashboard/:path*",
    "/clients/:path*",
    "/schedule/:path*",
    "/sessions/:path*",
    "/settings/:path*",
  ],
};
