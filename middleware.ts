import { NextResponse, type NextRequest } from "next/server";
import { prisma } from "@/lib/prisma";
import { canAccessPath, roleHome } from "@/lib/auth/roles";
import { updateSession } from "@/lib/supabase/middleware";

const publicPaths = ["/login", "/api/auth/callback", "/manifest.json", "/sw.js", "/icon.svg"];

export async function middleware(request: NextRequest) {
  const path = request.nextUrl.pathname;
  if (publicPaths.some((publicPath) => path.startsWith(publicPath)) || path.startsWith("/_next")) {
    return NextResponse.next();
  }

  const { response, user } = await updateSession(request);
  if (!user) return NextResponse.redirect(new URL("/login", request.url));

  if (path.startsWith("/api")) return response;

  const profile = await prisma.profile.findUnique({ where: { supabaseUid: user.id }, select: { role: true } });
  if (!profile) return NextResponse.redirect(new URL("/login", request.url));
  if (!canAccessPath(profile.role, path)) return NextResponse.redirect(new URL(roleHome[profile.role], request.url));
  return response;
}

export const config = {
  matcher: ["/((?!_next/static|_next/image|favicon.ico).*)"]
};
