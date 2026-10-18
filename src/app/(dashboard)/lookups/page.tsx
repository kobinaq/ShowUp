import { prisma } from "@/lib/prisma";
import { getAuthProfile } from "@/lib/auth/session";
import { identityLookupScope } from "@/lib/auth/scope";
import { redirect } from "next/navigation";
import { PageHeader } from "@/components/shared/PageHeader";
import { SectionPanel } from "@/components/shared/Panels";
import { DataTable, type DataTableColumn, type DataTableRow } from "@/components/shared/DataTable";

const columns: DataTableColumn[] = [
  { key: "when", label: "When" },
  { key: "who", label: "Looked up by" },
  { key: "alias", label: "Reporter alias", mono: true },
  { key: "reason", label: "Reason" }
];

export default async function LookupsPage() {
  const profile = await getAuthProfile();
  if (!profile) redirect("/login");
  const lookups = await prisma.identityLookup.findMany({
    where: identityLookupScope(profile),
    include: {
      performedBy: { select: { displayName: true, email: true } },
      lookedUpProfile: { select: { anonymousAlias: true } }
    },
    orderBy: { performedAt: "desc" },
    take: 200
  });
  const rows: DataTableRow[] = lookups.map((lookup) => ({
    id: lookup.id,
    searchText: `${lookup.performedBy.email ?? ""} ${lookup.lookedUpProfile.anonymousAlias ?? ""} ${lookup.reason}`,
    cells: {
      when: lookup.performedAt.toLocaleString(),
      who: lookup.performedBy.displayName ?? lookup.performedBy.email ?? "-",
      alias: lookup.lookedUpProfile.anonymousAlias ?? "-",
      reason: lookup.reason
    }
  }));

  return (
    <div className="space-y-6">
      <PageHeader
        eyebrow="Privacy"
        title="Identity lookups"
        description="Every sealed-identity reveal writes a reason. This is the audit log for that action."
      />
      <SectionPanel title="Lookup history" description={`${lookups.length} recorded lookups.`}>
        <DataTable columns={columns} rows={rows} searchPlaceholder="Search lookups..." emptyTitle="No identity lookups yet." />
      </SectionPanel>
    </div>
  );
}
