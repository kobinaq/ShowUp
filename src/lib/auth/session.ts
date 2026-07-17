import { prisma } from "@/lib/prisma";
import { createClient } from "@/lib/supabase/server";
import { getDemoSessionFromCookies, resolveDemoProfile } from "@/lib/auth/demo";
import type { ApiContext } from "@/lib/middleware/withAuth";

export type AuthProfile = ApiContext["profile"] & {
  isDemo: boolean;
  email?: string | null;
  displayName?: string | null;
  university?: { name: string; settings: { showUpAiEnabled: boolean | null } | null } | null;
  department?: { name: string } | null;
  demoPhone?: string;
};

export async function getAuthProfile(): Promise<AuthProfile | null> {
  const supabase = await createClient();
  const { data } = await supabase.auth.getUser();
  if (data.user) {
    const profile = await prisma.profile.findUnique({
      where: { supabaseUid: data.user.id },
      select: {
        id: true,
        supabaseUid: true,
        role: true,
        universityId: true,
        departmentId: true,
        isActive: true,
        email: true,
        displayName: true,
        university: { select: { name: true, settings: { select: { showUpAiEnabled: true } } } },
        department: { select: { name: true } }
      }
    });
    if (profile?.isActive) {
      const { isActive: _isActive, ...rest } = profile;
      return { ...rest, isDemo: false };
    }
  }

  const demo = await getDemoSessionFromCookies();
  if (!demo) return null;
  const profile = await resolveDemoProfile(demo);
  if (!profile) return null;

  const enriched = await prisma.profile.findUnique({
    where: { id: profile.id },
    select: {
      id: true,
      supabaseUid: true,
      role: true,
      universityId: true,
      departmentId: true,
      email: true,
      displayName: true,
      university: { select: { name: true, settings: { select: { showUpAiEnabled: true } } } },
      department: { select: { name: true } }
    }
  });
  if (!enriched) return null;
  return { ...enriched, isDemo: true, demoPhone: demo.phone };
}
