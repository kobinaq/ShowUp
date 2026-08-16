import { sessionDayRange, timeOnSessionDate } from "@/lib/utils/sessionTime";

describe("sessionDayRange", () => {
  it("covers the local calendar day", () => {
    const range = sessionDayRange(new Date("2026-08-16T15:30:00"));
    expect(range.gte.getHours()).toBe(0);
    expect(range.lte.getHours()).toBe(23);
    expect(range.gte.getDate()).toBe(range.lte.getDate());
  });
});

describe("timeOnSessionDate", () => {
  it("applies clock time on the session day, not the source timestamp", () => {
    const value = timeOnSessionDate(new Date("2026-08-16T22:15:00"), "09:30");
    expect(value.getHours()).toBe(9);
    expect(value.getMinutes()).toBe(30);
    expect(value.getDate()).toBe(16);
  });
});
