import { prisma } from "@/lib/prisma";
import { contestScope } from "@/lib/auth/scope";
import { getAuthProfile } from "@/lib/auth/session";
import { isContestOverdue } from "@/lib/services/contest-sla";
import { redirect } from "next/navigation";
import { displayText } from "@/lib/utils/displayText";
import { PageHeader } from "@/components/shared/PageHeader";
import { SectionPanel } from "@/components/shared/Panels";
import { DataTable, type DataTableColumn, type DataTableRow } from "@/components/shared/DataTable";

const columns: DataTableColumn[] = [
  { key: "course", label: "Course", mono: true },
  { key: "reason", label: "Reason" },
  { key: "status", label: "Status", badge: { PENDING: "amber", ACCEPTED: "red", DISMISSED: "green", OVERDUE: "red" } },
  { key: "raisedBy", label: "Raised by" },
  { key: "date", label: "Raised" }
];

export default async function ContestsPage() {
  const profile = await getAuthProfile();
  if (!profile) redirect("/login");
  const [contests, settings] = await Promise.all([
    prisma.contest.findMany({ where: contestScope(profile), include: { report: { include: { course: true } }, raisedBy: true }, orderBy: { raisedAt: "desc" } }),
    prisma.universitySettings.findUnique({ where: { universityId: profile.universityId } })
  ]);
  const slaDays = settings?.contestSlaDays ?? 5;
  const now = new Date();
  const rows: DataTableRow[] = contests.map((contest) => {
    const overdue = isContestOverdue({ status: contest.status, raisedAt: contest.raisedAt, slaDays, now });
    return {
    id: contest.id,
    href: `/reports/${contest.reportId}`,
    searchText: `${contest.report.course.code} ${contest.reason} ${contest.status} ${contest.raisedBy.displayName ?? contest.raisedBy.email ?? ""}`,
    filters: [overdue ? "OVERDUE" : contest.status],
    cells: {
      course: contest.report.course.code,
      reason: displayText(contest.reason),
      status: overdue ? "OVERDUE" : contest.status,
      raisedBy: contest.raisedBy.displayName ?? contest.raisedBy.email ?? "-",
      date: contest.raisedAt.toLocaleDateString(undefined, { month: "short", day: "numeric", year: "numeric" })
    }
  };
  });
  return (
    <div className="space-y-6">
      <PageHeader title="Contests" eyebrow="Governance" description="Review challenged reports and open individual reports for full evidence and resolution context." />
      <SectionPanel title="Contested reports" description={`${contests.filter((contest) => contest.status === "PENDING").length} pending. SLA is ${slaDays} days.`}>
        <DataTable
          columns={columns}
          rows={rows}
          searchPlaceholder="Search contests by course, reason, status..."
          emptyTitle="No contests match this view."
          filters={[
            { label: "Pending", value: "PENDING" },
            { label: "Overdue", value: "OVERDUE" },
            { label: "Accepted", value: "ACCEPTED" },
            { label: "Dismissed", value: "DISMISSED" }
          ]}
        />
      </SectionPanel>
    </div>
  );
}
