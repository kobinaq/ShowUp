import { Role } from "@prisma/client";
import { prisma } from "@/lib/prisma";
import { ReportTable } from "@/components/reports/ReportTable";
import { createClient } from "@/lib/supabase/server";
import { PageHeader } from "@/components/shared/PageHeader";
import { SectionPanel } from "@/components/shared/Panels";

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
    <div className="space-y-6">
      <PageHeader title="Reports" eyebrow="Attendance records" description="Search, filter, and open submitted class reports from your role scope." />
      <SectionPanel title="Submitted reports" description={`${reports.length} reports currently visible.`}>
        <ReportTable reports={reports} exportHref="/api/export/reports" />
      </SectionPanel>
    </div>
  );
}
