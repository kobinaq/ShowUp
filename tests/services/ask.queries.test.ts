import { prisma } from "@/lib/prisma";
import { executeQueryPlan } from "@/lib/services/ask.queries";
import { resolveAskWindow } from "@/lib/services/ask.period";
import { planQuestion } from "@/lib/services/ask.service";

jest.mock("@/lib/prisma", () => ({
  prisma: {
    semester: { findFirst: jest.fn() },
    lectureReport: { groupBy: jest.fn() },
    course: { findMany: jest.fn(), findUnique: jest.fn() },
    lecturer: { findMany: jest.fn() },
    flag: { findMany: jest.fn() },
    department: { findMany: jest.fn() },
    latePing: { findMany: jest.fn() }
  }
}));

const now = new Date(2026, 9, 15, 15, 0, 0);
const activeSemester = {
  id: "sem-active",
  name: "2026/27 First Semester",
  startDate: new Date(2026, 8, 1, 9, 0, 0),
  endDate: new Date(2026, 11, 18, 9, 0, 0),
  universityId: "atu"
};
const previousSemester = {
  id: "sem-previous",
  name: "2025/26 Second Semester",
  startDate: new Date(2026, 0, 12, 9, 0, 0),
  endDate: new Date(2026, 4, 29, 9, 0, 0),
  universityId: "atu"
};

const semesterFindFirst = prisma.semester.findFirst as jest.Mock;
const groupBy = prisma.lectureReport.groupBy as jest.Mock;

describe("executeQueryPlan", () => {
  beforeEach(() => {
    jest.resetAllMocks();
    semesterFindFirst.mockResolvedValue(activeSemester);
    groupBy.mockResolvedValue([]);
    (prisma.course.findMany as jest.Mock).mockResolvedValue([]);
    (prisma.course.findUnique as jest.Mock).mockResolvedValue(null);
    (prisma.flag.findMany as jest.Mock).mockResolvedValue([]);
  });

  it("returns an empty result for unsupported plans", async () => {
    await expect(executeQueryPlan({ queryType: "unsupported", params: {}, intent: "" }, undefined, now)).resolves.toEqual([]);
    expect(semesterFindFirst).not.toHaveBeenCalled();
  });

  it("limits lateness to this week and the active semester", async () => {
    const plan = planQuestion("which lecturers have been late this week");
    await executeQueryPlan(plan!, undefined, now);
    const week = resolveAskWindow("week", now);
    expect(groupBy).toHaveBeenCalledWith(
      expect.objectContaining({
        where: expect.objectContaining({
          arrivalStatus: "LATE",
          isVoided: false,
          lectureDate: { gte: week.from, lte: week.to },
          course: { semesterId: activeSemester.id }
        })
      })
    );
  });

  it("limits missed classes to today", async () => {
    const plan = planQuestion("who missed classes today");
    await executeQueryPlan(plan!, undefined, now);
    const today = resolveAskWindow("today", now);
    expect(groupBy).toHaveBeenCalledWith(
      expect.objectContaining({
        where: expect.objectContaining({
          lecturerPresent: "ABSENT",
          lectureDate: { gte: today.from, lte: today.to },
          course: { semesterId: activeSemester.id }
        })
      })
    );
  });

  it("defaults an undated question to the active semester dates", async () => {
    const plan = planQuestion("who has been late the most");
    await executeQueryPlan(plan!, undefined, now);
    const semester = resolveAskWindow("semester", now, activeSemester);
    expect(groupBy).toHaveBeenCalledWith(
      expect.objectContaining({
        where: expect.objectContaining({
          lectureDate: { gte: semester.from, lte: semester.to },
          course: { semesterId: activeSemester.id }
        })
      })
    );
  });

  it("asks coverage for this month with reports up to the end of the month", async () => {
    (prisma.course.findMany as jest.Mock).mockResolvedValue([
      {
        id: "course-1",
        code: "CS301",
        title: "Networks",
        lecturer: { firstName: "Ama", lastName: "Mensah" },
        department: { name: "Computer Science" }
      }
    ]);
    const plan = planQuestion("coverage this month");
    const rows = await executeQueryPlan(plan!, undefined, now);
    const month = resolveAskWindow("month", now);
    expect(prisma.course.findUnique).toHaveBeenCalledWith(
      expect.objectContaining({
        where: { id: "course-1" },
        include: expect.objectContaining({
          reports: expect.objectContaining({
            where: { isVoided: false, lectureDate: { lte: month.to } }
          })
        })
      })
    );
    expect(rows).toEqual([
      expect.objectContaining({
        course: "CS301",
        period: "this month",
        coveragePercent: 0
      })
    ]);
  });

  it("counts only this week's lateness in a department summary", async () => {
    (prisma.department.findMany as jest.Mock).mockResolvedValue([
      {
        id: "dept-1",
        name: "Computer Science",
        faculty: { name: "Engineering" },
        courses: [
          {
            id: "course-1",
            code: "CS301",
            title: "Networks",
            lecturer: { firstName: "Ama", lastName: "Mensah" },
            semester: { startDate: activeSemester.startDate },
            outline: { topics: [] },
            reports: [
              {
                lectureDate: new Date(2026, 9, 13, 9, 0, 0),
                lecturerPresent: "PRESENT",
                arrivalStatus: "LATE",
                flags: [],
                topicsCovered: []
              },
              {
                lectureDate: new Date(2026, 8, 10, 9, 0, 0),
                lecturerPresent: "PRESENT",
                arrivalStatus: "LATE",
                flags: [],
                topicsCovered: []
              }
            ]
          }
        ]
      }
    ]);
    const plan = planQuestion("department performance this week");
    const rows = await executeQueryPlan(plan!, undefined, now);
    expect(rows).toEqual([
      expect.objectContaining({
        department: "Computer Science",
        period: "this week",
        late: 1,
        reports: 1
      })
    ]);
  });

  it("uses the previous semester when asked for last semester", async () => {
    semesterFindFirst.mockImplementation((args: { where: { isActive?: boolean } }) =>
      args.where.isActive ? activeSemester : previousSemester
    );
    const plan = planQuestion("which lecturers have been late last semester");
    await executeQueryPlan(plan!, undefined, now);
    const window = resolveAskWindow("semester", now, previousSemester);
    expect(groupBy).toHaveBeenCalledWith(
      expect.objectContaining({
        where: expect.objectContaining({
          lectureDate: { gte: window.from, lte: window.to },
          course: { semesterId: previousSemester.id }
        })
      })
    );
  });
});
