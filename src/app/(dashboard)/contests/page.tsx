import { prisma } from "@/lib/prisma";
import { contestScope } from "@/lib/auth/scope";
import { createClient } from "@/lib/supabase/server";
import { displayText } from "@/lib/utils/displayText";
import { PageHeader } from "@/components/shared/PageHeader";
import { SectionPanel } from "@/components/shared/Panels";
import { DataTable, type DataTableColumn, type DataTableRow } from "@/components/shared/DataTable";

const columns: DataTableColumn[] = [
  { key: "course", label: "Course", mono: true },
  { key: "reason", label: "Reason" },
  { key: "status", label: "Status", badge: { PENDING: "amber", ACCEPTED: "red", DISMISSED: "green" } },
  { key: "raisedBy", label: "Raised by" },
  { key: "date", label: "Raised" }
];

export default async function ContestsPage() {
  const supabase = await createClient();
  const { data } = await supabase.auth.getUser();
  const profile = data.user
    ? await prisma.profile.findUnique({ where: { supabaseUid: data.user.id }, select: { id: true, role: true, universityId: true, departmentId: true } })
    : null;
  const contests = profile
    ? await prisma.contest.findMany({ where: contestScope(profile), include: { report: { include: { course: true } }, raisedBy: true }, orderBy: { raisedAt: "desc" } })
    : [];
  const rows: DataTableRow[] = contests.map((contest) => ({
    id: contest.id,
    href: `/reports/${contest.reportId}`,
    searchText: `${contest.report.course.code} ${contest.reason} ${contest.status} ${contest.raisedBy.displayName ?? contest.raisedBy.email ?? ""}`,
    filters: [contest.status],
    cells: {
      course: contest.report.course.code,
      reason: displayText(contest.reason),
      status: contest.status,
      raisedBy: contest.raisedBy.displayName ?? contest.raisedBy.email ?? "-",
      date: contest.raisedAt.toLocaleDateString(undefined, { month: "short", day: "numeric", year: "numeric" })
    }
  }));
  return (
    <div className="space-y-6">
      <PageHeader title="Contests" eyebrow="Governance" description="Review challenged reports and open individual reports for full evidence and resolution context." />
      <SectionPanel title="Contested reports" description={`${contests.filter((contest) => contest.status === "PENDING").length} contests are pending.`}>
        <DataTable
          columns={columns}
          rows={rows}
          searchPlaceholder="Search contests by course, reason, status..."
          emptyTitle="No contests match this view."
          filters={[
            { label: "Pending", value: "PENDING" },
            { label: "Accepted", value: "ACCEPTED" },
            { label: "Dismissed", value: "DISMISSED" }
          ]}
        />
      </SectionPanel>
    </div>
  );
}
