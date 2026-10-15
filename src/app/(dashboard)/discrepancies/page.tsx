import { prisma } from "@/lib/prisma";
import { getAuthProfile } from "@/lib/auth/session";
import { reportDiscrepancyScope } from "@/lib/auth/scope";
import { redirect } from "next/navigation";
import { PageHeader } from "@/components/shared/PageHeader";
import { SectionPanel } from "@/components/shared/Panels";
import { DataTable, type DataTableColumn, type DataTableRow } from "@/components/shared/DataTable";

const columns: DataTableColumn[] = [
  { key: "course", label: "Course", mono: true },
  { key: "date", label: "Session" },
  { key: "first", label: "First report" },
  { key: "second", label: "Second report" },
  { key: "status", label: "Status", badge: { OPEN: "amber", RESOLVED: "green" } }
];

export default async function DiscrepanciesPage() {
  const profile = await getAuthProfile();
  if (!profile) redirect("/login");
  const discrepancies = await prisma.reportDiscrepancy.findMany({
    where: reportDiscrepancyScope(profile),
    include: {
      course: { select: { code: true } },
      firstReport: { select: { id: true, lecturerPresent: true } },
      secondReport: { select: { id: true, lecturerPresent: true } }
    },
    orderBy: { createdAt: "desc" }
  });
  const rows: DataTableRow[] = discrepancies.map((item) => ({
    id: item.id,
    href: `/reports/${item.secondReportId}`,
    searchText: `${item.course.code} ${item.firstReport.lecturerPresent} ${item.secondReport.lecturerPresent}`,
    filters: [item.status],
    cells: {
      course: item.course.code,
      date: item.lectureDate.toLocaleDateString(),
      first: item.firstReport.lecturerPresent,
      second: item.secondReport.lecturerPresent,
      status: item.status
    }
  }));

  return (
    <div className="space-y-6">
      <PageHeader
        eyebrow="Governance"
        title="Reporter discrepancies"
        description="When two active reporters disagree on presence for the same session, ShowUp opens a discrepancy instead of silently keeping both answers."
      />
      <SectionPanel title="Open disagreements" description={`${discrepancies.filter((item) => item.status === "OPEN").length} still open.`}>
        <DataTable
          columns={columns}
          rows={rows}
          searchPlaceholder="Search discrepancies..."
          emptyTitle="No reporter disagreements."
          filters={[
            { label: "Open", value: "OPEN" },
            { label: "Resolved", value: "RESOLVED" }
          ]}
        />
      </SectionPanel>
    </div>
  );
}
