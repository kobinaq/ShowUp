import { redirect } from "next/navigation";
import { prisma } from "@/lib/prisma";
import { createClient } from "@/lib/supabase/server";
import { roleHome } from "@/lib/auth/roles";

export const dynamic = "force-dynamic";

export default async function Home() {
  const supabase = await createClient();
  const { data } = await supabase.auth.getUser();
  if (!data.user) redirect("/login");
  const profile = await prisma.profile.findUnique({ where: { supabaseUid: data.user.id } });
  redirect(profile ? roleHome[profile.role] : "/login");
}
