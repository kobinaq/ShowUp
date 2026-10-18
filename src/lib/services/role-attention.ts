export type AttentionItem = {
  id: string;
  title: string;
  detail: string;
  href: string;
  tone?: "amber" | "red" | "blue";
};

export function summarizeAttention(items: AttentionItem[], limit = 8) {
  return items.slice(0, limit);
}

/** Pure helper: lecturer attention from already-scoped counts. */
export function buildLecturerAttention(input: {
  openFlags: Array<{ id: string; type: string; message: string }>;
  openAttendanceSessions: Array<{ id: string; courseCode: string; courseId: string }>;
  pendingConfirmSessions: Array<{ id: string; courseCode: string }>;
  facilitiesOpen: number;
}) {
  const items: AttentionItem[] = [];
  for (const flag of input.openFlags) {
    items.push({
      id: `flag-${flag.id}`,
      title: flag.type.replaceAll("_", " "),
      detail: flag.message,
      href: "/lecturer",
      tone: "amber"
    });
  }
  for (const session of input.openAttendanceSessions) {
    items.push({
      id: `att-${session.id}`,
      title: `${session.courseCode} attendance open`,
      detail: "Mark the roster while the edit window is open.",
      href: `/courses/${session.courseId}/attendance/${session.id}`,
      tone: "blue"
    });
  }
  for (const session of input.pendingConfirmSessions) {
    items.push({
      id: `confirm-${session.id}`,
      title: `${session.courseCode} needs confirmation`,
      detail: "Confirm presence for this lecture session.",
      href: "/timetable",
      tone: "blue"
    });
  }
  if (input.facilitiesOpen > 0) {
    items.push({
      id: "facilities",
      title: `${input.facilitiesOpen} open facilities issue${input.facilitiesOpen === 1 ? "" : "s"}`,
      detail: "Room/projector problems may be affecting your sessions.",
      href: "/facilities",
      tone: "amber"
    });
  }
  return summarizeAttention(items);
}

export function buildStaffAttention(input: {
  unresolvedFlags: number;
  pendingContests: number;
  openDiscrepancies: number;
  noDataSessions: number;
  repFlags: number;
  supportOpen?: number;
}) {
  const items: AttentionItem[] = [];
  if (input.unresolvedFlags) {
    items.push({
      id: "flags",
      title: `${input.unresolvedFlags} unresolved flag${input.unresolvedFlags === 1 ? "" : "s"}`,
      detail: "Review lecturer attendance and quality flags.",
      href: "/flags",
      tone: "red"
    });
  }
  if (input.pendingContests) {
    items.push({
      id: "contests",
      title: `${input.pendingContests} pending contest${input.pendingContests === 1 ? "" : "s"}`,
      detail: "HOD contests awaiting QA decision.",
      href: "/contests",
      tone: "amber"
    });
  }
  if (input.openDiscrepancies) {
    items.push({
      id: "discrepancies",
      title: `${input.openDiscrepancies} open discrepanc${input.openDiscrepancies === 1 ? "y" : "ies"}`,
      detail: "Rep vs rep or lecturer confirmation disagreements.",
      href: "/discrepancies",
      tone: "amber"
    });
  }
  if (input.noDataSessions) {
    items.push({
      id: "nodata",
      title: `${input.noDataSessions} session${input.noDataSessions === 1 ? "" : "s"} with NO_DATA`,
      detail: "Missing reports — not marked as missed lectures.",
      href: "/reps",
      tone: "blue"
    });
  }
  if (input.repFlags) {
    items.push({
      id: "repflags",
      title: `${input.repFlags} rep reliability flag${input.repFlags === 1 ? "" : "s"}`,
      detail: "Class reps repeatedly failing to report.",
      href: "/reps",
      tone: "amber"
    });
  }
  if (input.supportOpen) {
    items.push({
      id: "support",
      title: `${input.supportOpen} open IT ticket${input.supportOpen === 1 ? "" : "s"}`,
      detail: "Support requests waiting on IT.",
      href: "/support",
      tone: "blue"
    });
  }
  return summarizeAttention(items);
}
