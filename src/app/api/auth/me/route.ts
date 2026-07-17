import { Role } from "@prisma/client";
import { getAuthProfile } from "@/lib/auth/session";
import { roleHome } from "@/lib/auth/roles";
import { json } from "@/lib/middleware/withAuth";

export async function GET() {
  const profile = await getAuthProfile();
  if (!profile) return json({ error: "Unauthorized" }, { status: 401 });
  return json({
    role: profile.role as Role,
    home: roleHome[profile.role],
    isDemo: profile.isDemo
  });
}
