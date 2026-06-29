import { Sidebar } from "@/components/layout/Sidebar";
import { TopBar } from "@/components/layout/TopBar";
import { MobileNav } from "@/components/layout/MobileNav";
import { AskPanel } from "@/components/ask/AskPanel";
import { prisma } from "@/lib/prisma";
import { createClient } from "@/lib/supabase/server";

export const dynamic = "force-dynamic";

export default async function DashboardLayout({ children }: { children: React.ReactNode }) {
  const supabase = await createClient();
  const { data } = await supabase.auth.getUser();
  const profile = data.user
    ? await prisma.profile.findUnique({
        where: { supabaseUid: data.user.id },
        select: { role: true }
      })
    : null;
  const canAsk =
    profile?.role === "QA_OFFICER" ||
    profile?.role === "VC" ||
    profile?.role === "HOD" ||
    profile?.role === "HOD_ASSISTANT";

  return (
    <div className="flex min-h-screen">
      <Sidebar>{canAsk ? <AskPanel /> : null}</Sidebar>
      <div className="min-w-0 flex-1 pb-20 md:pb-0">
        <TopBar role={profile?.role} email={data.user?.email} />
        <main className="mx-auto w-full max-w-7xl px-4 py-6 md:px-8">{children}</main>
      </div>
      <MobileNav />
    </div>
  );
}
