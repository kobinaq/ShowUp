import { explicitAskWindow, inferAskPeriod, resolveAskWindow } from "@/lib/services/ask.period";

const now = new Date(2026, 9, 15, 15, 0, 0);

describe("ask periods", () => {
  it("resolves the phrases the assistant is asked in plain language", () => {
    expect(inferAskPeriod("which lecturers have been late this week")).toBe("week");
    expect(inferAskPeriod("who missed classes today")).toBe("today");
    expect(inferAskPeriod("coverage this month")).toBe("month");
    expect(inferAskPeriod("who has been late the most")).toBeNull();
    expect(inferAskPeriod("which courses are behind by week 6")).toBeNull();
  });

  it("uses calendar boundaries for today, this week, and this month", () => {
    expect(now.getDay()).toBe(4);

    const today = resolveAskWindow("today", now);
    expect(today.from).toEqual(new Date(2026, 9, 15, 0, 0, 0, 0));
    expect(today.to).toEqual(new Date(2026, 9, 15, 23, 59, 59, 999));

    const week = resolveAskWindow("week", now);
    expect(week.from).toEqual(new Date(2026, 9, 12, 0, 0, 0, 0));
    expect(week.to).toEqual(new Date(2026, 9, 18, 23, 59, 59, 999));
    expect(week.label).toBe("this week");

    const month = resolveAskWindow("month", now);
    expect(month.from).toEqual(new Date(2026, 9, 1, 0, 0, 0, 0));
    expect(month.to).toEqual(new Date(2026, 9, 31, 23, 59, 59, 999));
  });

  it("defaults a named semester to that semester's dates", () => {
    const semester = resolveAskWindow("semester", now, {
      name: "2026/27 First Semester",
      startDate: new Date(2026, 8, 1, 9, 0, 0),
      endDate: new Date(2026, 11, 18, 9, 0, 0)
    });
    expect(semester.from).toEqual(new Date(2026, 8, 1, 0, 0, 0, 0));
    expect(semester.to).toEqual(new Date(2026, 11, 18, 23, 59, 59, 999));
    expect(semester.label).toBe("in 2026/27 First Semester");
  });

  it("treats this academic year as August to July", () => {
    const year = resolveAskWindow("year", now);
    expect(year.from).toEqual(new Date(2026, 7, 1, 0, 0, 0, 0));
    expect(year.to).toEqual(new Date(2027, 6, 31, 23, 59, 59, 999));
  });

  it("parses an explicit YYYY-MM-DD range in local days", () => {
    const range = explicitAskWindow("2026-10-01", "2026-10-03");
    expect(range?.from).toEqual(new Date(2026, 9, 1, 0, 0, 0, 0));
    expect(range?.to).toEqual(new Date(2026, 9, 3, 23, 59, 59, 999));
  });
});
