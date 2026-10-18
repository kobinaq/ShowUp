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
  { key: "kind", label: "Kind" },
  { key: "first", label: "Rep report" },
  { key: "second", label: "Second source" },
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
      secondReport: { select: { id: true, lecturerPresent: true } },
      confirmation: { select: { presence: true } }
    },
    orderBy: { createdAt: "desc" }
  });
  const rows: DataTableRow[] = discrepancies.map((item) => {
    const secondLabel =
      item.kind === "LECTURER_CONFIRMATION"
        ? `Lecturer: ${item.confirmation?.presence ?? "—"}`
        : (item.secondReport?.lecturerPresent ?? "—");
    return {
      id: item.id,
      href: `/reports/${item.firstReportId}`,
      searchText: `${item.course.code} ${item.kind} ${item.firstReport.lecturerPresent} ${secondLabel}`,
      filters: [item.status, item.kind],
      cells: {
        course: item.course.code,
        date: item.lectureDate.toLocaleDateString(),
        kind: item.kind === "LECTURER_CONFIRMATION" ? "Rep vs lecturer" : "Rep vs rep",
        first: item.firstReport.lecturerPresent,
        second: secondLabel,
        status: item.status
      }
    };
  });

  return (
    <div className="space-y-6">
      <PageHeader
        eyebrow="Governance"
        title="Reporter discrepancies"
        description="Opened when two class reps disagree, or when a lecturer/HOD confirmation disagrees with a submitted report. Missing reports are tracked as NO_DATA — not as missed lectures."
      />
      <SectionPanel title="Open disagreements" description={`${discrepancies.filter((item) => item.status === "OPEN").length} still open.`}>
        <DataTable
          columns={columns}
          rows={rows}
          searchPlaceholder="Search discrepancies..."
          emptyTitle="No reporter disagreements."
          filters={[
            { label: "Open", value: "OPEN" },
            { label: "Resolved", value: "RESOLVED" },
            { label: "Rep vs lecturer", value: "LECTURER_CONFIRMATION" },
            { label: "Rep vs rep", value: "PEER_REPORT" }
          ]}
        />
      </SectionPanel>
    </div>
  );
}
