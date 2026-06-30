import { redirect } from "next/navigation";
import { prisma } from "@/lib/prisma";
import { createClient } from "@/lib/supabase/server";
import { SupportButton } from "@/components/support/SupportButton";

export const dynamic = "force-dynamic";

export default async function RepLayout({ children }: { children: React.ReactNode }) {
  const supabase = await createClient();
  const { data } = await supabase.auth.getUser();
  const profile = data.user
    ? await prisma.profile.findUnique({ where: { supabaseUid: data.user.id }, select: { role: true, isActive: true } })
    : null;
  if (!profile?.isActive) redirect("/login");
  if (profile.role !== "CLASS_REP") redirect("/dashboard");
  return <main className="mx-auto min-h-screen max-w-xl bg-white px-4 py-4"><div className="mb-4 flex justify-end"><SupportButton compact /></div>{children}</main>;
}
