import { Role } from "@prisma/client";
import { prisma } from "@/lib/prisma";
import { ReportTable } from "@/components/reports/ReportTable";
import { createClient } from "@/lib/supabase/server";

export default async function ReportsPage() {
  const supabase = await createClient();
  const { data } = await supabase.auth.getUser();
  const profile = data.user
    ? await prisma.profile.findUnique({ where: { supabaseUid: data.user.id }, select: { role: true, universityId: true, departmentId: true } })
    : null;
  const isSuperAdmin = profile?.role === Role.SUPER_ADMIN;
  const isDepartmentScope = profile?.role === Role.HOD || profile?.role === Role.HOD_ASSISTANT;
  const reports = await prisma.lectureReport.findMany({
    where: isSuperAdmin
      ? {}
      : isDepartmentScope
        ? { course: { departmentId: profile?.departmentId ?? "__none__" } }
        : { course: { department: { faculty: { universityId: profile?.universityId ?? "__none__" } } } },
    include: { course: { include: { lecturer: true } }, flags: true, contest: true, latePing: true },
    orderBy: { lectureDate: "desc" },
    take: 100
  });
  return (
    <section className="rounded-card bg-white p-5 shadow-card">
      <h1 className="font-display text-2xl font-bold">Reports</h1>
      <ReportTable reports={reports} />
    </section>
  );
}
