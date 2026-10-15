import { summarizeCoverage } from "@/lib/services/coverage.service";
import { getSemesterWeek } from "@/lib/utils/semesterWeek";

describe("summarizeCoverage windows", () => {
  const semesterStart = new Date(2026, 8, 7);
  const septemberReport = new Date(2026, 8, 10, 9, 0, 0);
  const octoberReport = new Date(2026, 9, 8, 9, 0, 0);
  const now = new Date(2026, 9, 15, 12, 0, 0);
  const septemberWeek = getSemesterWeek(semesterStart, septemberReport);
  const octoberWeek = getSemesterWeek(semesterStart, octoberReport);

  const topics = [
    { id: "sep", weekNumber: septemberWeek },
    { id: "oct", weekNumber: octoberWeek }
  ];

  it("keeps cumulative coverage and reports only this month's topics inside the window", () => {
    const summary = summarizeCoverage({
      semesterStart,
      topics,
      reports: [
        { lectureDate: septemberReport, topicIds: ["sep"] },
        { lectureDate: octoberReport, topicIds: ["oct"] }
      ],
      now,
      window: { from: new Date(2026, 9, 1), to: new Date(2026, 9, 31, 23, 59, 59, 999) }
    });

    expect(summary.taughtTopics).toBe(2);
    expect(summary.pacingStatus).toBe("On Track");
    expect(summary.topicsReportedInPeriod).toBe(1);
    expect(summary.topicsScheduledInPeriod).toBe(1);
    expect(summary.scheduledTopicsTaughtInPeriod).toBe(1);
  });

  it("marks the month behind when this month's outline topic was not taught", () => {
    const summary = summarizeCoverage({
      semesterStart,
      topics,
      reports: [{ lectureDate: septemberReport, topicIds: ["sep"] }],
      now,
      window: { from: new Date(2026, 9, 1), to: new Date(2026, 9, 31, 23, 59, 59, 999) }
    });

    expect(summary.topicsReportedInPeriod).toBe(0);
    expect(summary.scheduledTopicsTaughtInPeriod).toBe(0);
    expect(summary.pacingStatus).toBe("Behind");
  });

  it("counts every report when no window is given", () => {
    const summary = summarizeCoverage({
      semesterStart,
      topics,
      reports: [
        { lectureDate: septemberReport, topicIds: ["sep"] },
        { lectureDate: octoberReport, topicIds: ["oct"] }
      ],
      now
    });
    expect(summary.topicsReportedInPeriod).toBeUndefined();
    expect(summary.taughtTopics).toBe(2);
    expect(summary.pacingStatus).toBe("On Track");
  });
});
