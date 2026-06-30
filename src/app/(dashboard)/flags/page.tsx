import { Role } from "@prisma/client";
import { prisma } from "@/lib/prisma";
import { createClient } from "@/lib/supabase/server";
import { displayText } from "@/lib/utils/displayText";
import { PageHeader } from "@/components/shared/PageHeader";
import { SectionPanel } from "@/components/shared/Panels";
import { DataTable, type DataTableColumn, type DataTableRow } from "@/components/shared/DataTable";

const columns: DataTableColumn[] = [
  { key: "type", label: "Type", mono: true },
  { key: "lecturer", label: "Lecturer" },
  { key: "course", label: "Course", mono: true },
  { key: "status", label: "Status", badge: { Open: "amber", Reviewed: "green" } },
  { key: "message", label: "Message" },
  { key: "date", label: "Date" }
];

export default async function FlagsPage() {
  const supabase = await createClient();
  const { data } = await supabase.auth.getUser();
  const profile = data.user
    ? await prisma.profile.findUnique({ where: { supabaseUid: data.user.id }, select: { role: true, universityId: true, departmentId: true } })
    : null;
  const isSuperAdmin = profile?.role === Role.SUPER_ADMIN;
  const isDepartmentScope = profile?.role === Role.HOD || profile?.role === Role.HOD_ASSISTANT;
  const flags = await prisma.flag.findMany({
    where: isSuperAdmin
      ? {}
      : isDepartmentScope
        ? { lecturer: { departmentId: profile?.departmentId ?? "__none__" } }
        : { lecturer: { department: { faculty: { universityId: profile?.universityId ?? "__none__" } } } },
    include: { lecturer: true, report: { include: { course: true } } },
    orderBy: { createdAt: "desc" }
  });
  const rows: DataTableRow[] = flags.map((flag) => ({
    id: flag.id,
    href: flag.reportId ? `/reports/${flag.reportId}` : undefined,
    searchText: `${flag.type} ${flag.lecturer.firstName} ${flag.lecturer.lastName} ${flag.report?.course.code ?? ""} ${flag.message}`,
    filters: [flag.type, flag.isResolved ? "Reviewed" : "Open"],
    cells: {
      type: flag.type,
      lecturer: `${flag.lecturer.firstName} ${flag.lecturer.lastName}`,
      course: flag.report?.course.code ?? "-",
      status: flag.isResolved ? "Reviewed" : "Open",
      message: displayText(flag.message),
      date: flag.createdAt.toLocaleDateString(undefined, { month: "short", day: "numeric", year: "numeric" })
    }
  }));
  return (
    <div className="space-y-6">
      <PageHeader title="Flags" eyebrow="Governance" description="Review attendance, lateness, early dismissal, and coverage issues raised by ShowUp." />
      <SectionPanel title="Quality flags" description={`${flags.filter((flag) => !flag.isResolved).length} open flags need review.`}>
        <DataTable
          columns={columns}
          rows={rows}
          searchPlaceholder="Search flags by type, lecturer, course..."
          emptyTitle="No flags match this view."
          filters={[
            { label: "Open", value: "Open" },
            { label: "Reviewed", value: "Reviewed" },
            { label: "Absence", value: "ABSENCE" },
            { label: "Lateness", value: "LATENESS" },
            { label: "Coverage", value: "COVERAGE_LAG" }
          ]}
        />
      </SectionPanel>
    </div>
  );
}
