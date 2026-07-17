import { NextResponse, type NextRequest } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { prisma } from "@/lib/prisma";
import { roleHome } from "@/lib/auth/roles";

export async function GET(request: NextRequest) {
  const requestUrl = new URL(request.url);
  const code = requestUrl.searchParams.get("code");
  const next = requestUrl.searchParams.get("next");
  if (code) {
    const supabase = await createClient();
    await supabase.auth.exchangeCodeForSession(code);
  }

  if (next && next.startsWith("/") && !next.startsWith("//")) {
    return NextResponse.redirect(new URL(next, request.url));
  }

  const supabase = await createClient();
  const { data } = await supabase.auth.getUser();
  if (data.user) {
    const profile = await prisma.profile.findUnique({
      where: { supabaseUid: data.user.id },
      select: { role: true, isActive: true }
    });
    if (profile?.isActive) {
      return NextResponse.redirect(new URL(roleHome[profile.role], request.url));
    }
  }

  return NextResponse.redirect(new URL("/login", request.url));
}
