import { buildLecturerAttention, buildStaffAttention } from "@/lib/services/role-attention";

describe("role attention builders", () => {
  it("builds lecturer attention from open work", () => {
    const items = buildLecturerAttention({
      openFlags: [{ id: "f1", type: "LATENESS", message: "Late for CENG301" }],
      openAttendanceSessions: [{ id: "a1", courseCode: "CENG301", courseId: "c1" }],
      pendingConfirmSessions: [{ id: "s1", courseCode: "CENG301" }],
      facilitiesOpen: 2
    });
    expect(items.length).toBeGreaterThanOrEqual(3);
    expect(items.some((item) => item.href.includes("/courses/"))).toBe(true);
  });

  it("builds staff attention without inventing work", () => {
    expect(buildStaffAttention({ unresolvedFlags: 0, pendingContests: 0, openDiscrepancies: 0, noDataSessions: 0, repFlags: 0 })).toEqual([]);
    expect(buildStaffAttention({ unresolvedFlags: 2, pendingContests: 1, openDiscrepancies: 0, noDataSessions: 3, repFlags: 1 }).map((i) => i.id)).toEqual([
      "flags",
      "contests",
      "nodata",
      "repflags"
    ]);
  });
});
