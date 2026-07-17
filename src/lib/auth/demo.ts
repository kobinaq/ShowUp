import { Role } from "@prisma/client";
import { cookies } from "next/headers";
import { prisma } from "@/lib/prisma";
import type { ApiContext } from "@/lib/middleware/withAuth";
import {
  DEMO_COOKIE,
  DEMO_ROLES,
  demoCookieOptions,
  hasDemoCookieShape,
  isDemoModeEnabled,
  parseDemoSession,
  roleHomeForDemo,
  signDemoSession,
  verifyDemoAccessToken,
  type DemoRole,
  type DemoSessionPayload
} from "@/lib/auth/demo-session";

export {
  DEMO_COOKIE,
  DEMO_ROLES,
  demoCookieOptions,
  hasDemoCookieShape,
  isDemoModeEnabled,
  parseDemoSession,
  roleHomeForDemo,
  signDemoSession,
  verifyDemoAccessToken
};
export type { DemoRole, DemoSessionPayload };

/** Fixed seed profile IDs for the ATU demo university. */
const DEMO_PROFILE_BY_ROLE: Partial<Record<Role, string>> = {
  [Role.SUPER_ADMIN]: "atu_profile_admin",
  [Role.VC]: "atu_profile_vc",
  [Role.QA_OFFICER]: "atu_profile_qa",
  [Role.IT]: "atu_profile_it",
  [Role.CLASS_REP]: "atu_profile_rep_1"
};

export async function getDemoSessionFromCookies() {
  if (!isDemoModeEnabled()) return null;
  const jar = await cookies();
  return parseDemoSession(jar.get(DEMO_COOKIE)?.value);
}

export async function resolveDemoProfile(session: DemoSessionPayload): Promise<ApiContext["profile"] | null> {
  const preferredId = DEMO_PROFILE_BY_ROLE[session.role];
  if (preferredId) {
    const profile = await prisma.profile.findFirst({
      where: { id: preferredId, isActive: true },
      select: { id: true, supabaseUid: true, role: true, universityId: true, departmentId: true }
    });
    if (profile) return profile;
  }

  if (session.role === Role.HOD) {
    const profile = await prisma.profile.findFirst({
      where: { role: Role.HOD, isActive: true, email: { endsWith: "@atu.showup.demo" } },
      orderBy: { email: "asc" },
      select: { id: true, supabaseUid: true, role: true, universityId: true, departmentId: true }
    });
    if (profile) return profile;
  }

  return prisma.profile.findFirst({
    where: {
      role: session.role,
      isActive: true,
      OR: [{ email: { endsWith: "@atu.showup.demo" } }, { anonymousAlias: { startsWith: "reporter_ATU_" } }]
    },
    orderBy: { createdAt: "asc" },
    select: { id: true, supabaseUid: true, role: true, universityId: true, departmentId: true }
  });
}
