import { lecturerDigestBody, shouldSendLecturerDigest } from "@/lib/services/lecturer-digest";

describe("lecturer digest", () => {
  it("sends only when both switches are on and there are notices", () => {
    expect(shouldSendLecturerDigest(true, true, 2)).toBe(true);
    expect(shouldSendLecturerDigest(true, false, 2)).toBe(false);
    expect(shouldSendLecturerDigest(true, true, 0)).toBe(false);
  });

  it("lists each notice", () => {
    const body = lecturerDigestBody([
      {
        channel: "EMAIL",
        status: "SENT",
        message: "Absent from CENG301.",
        sentAt: new Date("2026-08-16T09:00:00.000Z")
      }
    ]);
    expect(body).toContain("1 notice");
    expect(body).toContain("Absent from CENG301.");
  });
});
