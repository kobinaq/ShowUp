import { NextResponse, type NextRequest } from "next/server";
import { Role } from "@prisma/client";
import { prisma } from "@/lib/prisma";
import { createClient } from "@/lib/supabase/server";

export type ApiContext = {
  profile: {
    id: string;
    supabaseUid: string;
    role: Role;
    universityId: string;
    departmentId: string | null;
  };
};

export type ApiHandler<T = unknown> = (request: NextRequest, context: ApiContext & T) => Promise<Response>;

export function json(data: unknown, init?: ResponseInit) {
  return NextResponse.json(data, init);
}

export function forbidden(message = "Forbidden") {
  return json({ error: message }, { status: 403 });
}

export function badRequest(message: string, details?: unknown) {
  return json({ error: message, details }, { status: 400 });
}

export function withAuth<T>(handler: ApiHandler<T>, roles?: Role[]) {
  return async (request: NextRequest, context: T) => {
    const supabase = await createClient();
    const { data, error } = await supabase.auth.getUser();
    if (error || !data.user) return json({ error: "Unauthorized" }, { status: 401 });

    const profile = await prisma.profile.findUnique({
      where: { supabaseUid: data.user.id },
      select: { id: true, supabaseUid: true, role: true, universityId: true, departmentId: true, isActive: true }
    });
    if (!profile || !profile.isActive) return json({ error: "Inactive or missing profile" }, { status: 401 });
    if (roles && !roles.includes(profile.role)) return forbidden();
    return handler(request, { ...(context as object), profile } as ApiContext & T);
  };
}
