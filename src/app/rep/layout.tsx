import { redirect } from "next/navigation";
import { DemoBanner } from "@/components/demo/DemoBanner";
import { SupportButton } from "@/components/support/SupportButton";
import { getAuthProfile } from "@/lib/auth/session";

export const dynamic = "force-dynamic";

export default async function RepLayout({ children }: { children: React.ReactNode }) {
  const profile = await getAuthProfile();
  if (!profile) redirect("/login");
  if (profile.role !== "CLASS_REP") redirect("/dashboard");
  return (
    <main className="mx-auto min-h-screen max-w-xl bg-white px-4 py-4">
      {profile.isDemo ? <div className="-mx-4 mb-4"><DemoBanner role={profile.role} /></div> : null}
      <div className="mb-4 flex justify-end">
        <SupportButton compact />
      </div>
      {children}
    </main>
  );
}
