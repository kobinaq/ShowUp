import { prisma } from "@/lib/prisma";
import { ReportTable } from "@/components/reports/ReportTable";
import { getAuthProfile } from "@/lib/auth/session";
import { reportScope } from "@/lib/auth/scope";
import { redirect } from "next/navigation";
import { PageHeader } from "@/components/shared/PageHeader";
import { SectionPanel } from "@/components/shared/Panels";

export default async function ReportsPage() {
  const profile = await getAuthProfile();
  if (!profile) redirect("/login");
  const reports = await prisma.lectureReport.findMany({
    where: reportScope(profile),
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
