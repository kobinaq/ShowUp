import { Sidebar } from "@/components/layout/Sidebar";
import { TopBar } from "@/components/layout/TopBar";
import { MobileNav } from "@/components/layout/MobileNav";
import { AskPanel } from "@/components/ask/AskPanel";
import { canAccessPath, roleHome } from "@/lib/auth/roles";
import { prisma } from "@/lib/prisma";
import { createClient } from "@/lib/supabase/server";
import { headers } from "next/headers";
import { redirect } from "next/navigation";

export const dynamic = "force-dynamic";

export default async function DashboardLayout({ children }: { children: React.ReactNode }) {
  const supabase = await createClient();
  const { data } = await supabase.auth.getUser();
  const profile = data.user
    ? await prisma.profile.findUnique({
        where: { supabaseUid: data.user.id },
        select: {
          role: true,
          isActive: true,
          university: { select: { name: true } },
          department: { select: { name: true } }
        }
      })
    : null;
  if (!profile?.isActive) redirect("/login");
  const pathname = (await headers()).get("x-showup-pathname") ?? "/dashboard";
  if (!canAccessPath(profile.role, pathname)) redirect(roleHome[profile.role]);

  const canAsk =
    profile?.role === "QA_OFFICER" ||
    profile?.role === "VC" ||
    profile?.role === "HOD" ||
    profile?.role === "HOD_ASSISTANT";

  return (
    <div className="flex h-screen overflow-hidden bg-[#f7f8fb]">
      <Sidebar role={profile?.role} />
      <div className="flex min-w-0 flex-1 flex-col pb-20 md:pb-0">
        <TopBar role={profile?.role} email={data.user?.email} university={profile?.university?.name} department={profile?.department?.name} />
        <main className="min-h-0 flex-1 overflow-y-auto">
          <div className="mx-auto w-full max-w-7xl px-4 py-6 md:px-8">{children}</div>
        </main>
      </div>
      <MobileNav role={profile.role} />
      {canAsk ? <AskPanel universityName={profile?.university?.name} /> : null}
    </div>
  );
}
