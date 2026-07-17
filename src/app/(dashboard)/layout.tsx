import { Sidebar } from "@/components/layout/Sidebar";
import { TopBar } from "@/components/layout/TopBar";
import { MobileNav } from "@/components/layout/MobileNav";
import { AskPanel } from "@/components/ask/AskPanel";
import { DemoBanner } from "@/components/demo/DemoBanner";
import { canAccessPath, roleHome } from "@/lib/auth/roles";
import { getAuthProfile } from "@/lib/auth/session";
import { headers } from "next/headers";
import { redirect } from "next/navigation";

export const dynamic = "force-dynamic";

export default async function DashboardLayout({ children }: { children: React.ReactNode }) {
  const profile = await getAuthProfile();
  if (!profile) redirect("/login");
  const pathname = (await headers()).get("x-showup-pathname") ?? "/dashboard";
  if (!canAccessPath(profile.role, pathname)) redirect(roleHome[profile.role]);

  const canAsk =
    profile.role === "QA_OFFICER" ||
    profile.role === "QA_ASSISTANT" ||
    profile.role === "VC" ||
    profile.role === "HOD" ||
    profile.role === "HOD_ASSISTANT" ||
    profile.role === "SUPER_ADMIN";
  const showAskPanel = canAsk && profile.university?.settings?.showUpAiEnabled !== false;

  return (
    <div className="flex h-screen overflow-hidden bg-[#f7f8fb]">
      <Sidebar role={profile.role} />
      <div className="flex min-w-0 flex-1 flex-col pb-20 md:pb-0">
        {profile.isDemo ? <DemoBanner role={profile.role} /> : null}
        <TopBar
          role={profile.role}
          email={profile.isDemo ? `demo · ${profile.email ?? profile.role}` : profile.email}
          university={profile.university?.name}
          department={profile.department?.name}
          isDemo={profile.isDemo}
        />
        <main className="min-h-0 flex-1 overflow-y-auto">
          <div className="mx-auto w-full max-w-7xl px-4 py-6 md:px-8">{children}</div>
        </main>
      </div>
      <MobileNav role={profile.role} />
      {showAskPanel ? <AskPanel universityName={profile.university?.name} /> : null}
    </div>
  );
}
