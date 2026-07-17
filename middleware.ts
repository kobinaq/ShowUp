import { NextResponse, type NextRequest } from "next/server";
import { updateSession } from "@/lib/supabase/middleware";
import { DEMO_COOKIE, hasDemoCookieShape, isDemoModeEnabled } from "@/lib/auth/demo-session";

const publicPaths = [
  "/m",
  "/login",
  "/forgot-password",
  "/update-password",
  "/demo",
  "/api/auth/callback",
  "/api/leads",
  "/api/demo",
  "/api/cron",
  "/manifest.json",
  "/sw.js",
  "/icon.svg"
];

function isMobilePhone(userAgent: string) {
  return /Android.*Mobile|iPhone|iPod|BlackBerry|IEMobile|Opera Mini|Mobile Safari/i.test(userAgent);
}

function isPublicPath(path: string) {
  if (/^\/api\/pings\/[^/]+\/acknowledge\/?$/.test(path)) return true;
  return publicPaths.some((publicPath) => path === publicPath || path.startsWith(`${publicPath}/`));
}

export async function middleware(request: NextRequest) {
  const path = request.nextUrl.pathname;
  if (path === "/" && isMobilePhone(request.headers.get("user-agent") ?? "")) {
    return NextResponse.redirect(new URL("/m", request.url));
  }

  if (path === "/" || isPublicPath(path) || path.startsWith("/_next")) {
    return NextResponse.next();
  }

  const { response, user } = await updateSession(request);
  if (user) return response;

  if (isDemoModeEnabled() && hasDemoCookieShape(request.cookies.get(DEMO_COOKIE)?.value)) {
    const requestHeaders = new Headers(request.headers);
    requestHeaders.set("x-showup-pathname", path);
    requestHeaders.set("x-showup-demo", "1");
    return NextResponse.next({ request: { headers: requestHeaders } });
  }

  return NextResponse.redirect(new URL("/login", request.url));
}

export const config = {
  matcher: ["/((?!_next/static|_next/image|favicon.ico).*)"]
};
