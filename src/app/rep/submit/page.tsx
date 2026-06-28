import { prisma } from "@/lib/prisma";
import { createClient } from "@/lib/supabase/server";
import { ReportForm } from "@/components/reports/ReportForm";
import { EmptyState } from "@/components/shared/EmptyState";

export default async function RepSubmitPage() {
  const supabase = await createClient();
  const { data } = await supabase.auth.getUser();
  const profile = data.user ? await prisma.profile.findUnique({ where: { supabaseUid: data.user.id } }) : null;
  const assignment = profile
    ? await prisma.repAssignment.findFirst({
        where: { profileId: profile.id, isActive: true },
        include: { course: { include: { schedule: true, outline: { include: { topics: { orderBy: { order: "asc" } } } } } } }
      })
    : null;
  if (!assignment) return <EmptyState title="No active reporting assignment." />;
  return <ReportForm course={assignment.course} />;
}
