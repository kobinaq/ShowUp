import { StudentAttendanceMark } from "@prisma/client";
import {
  attendancePercent,
  buildMarkAllPresent,
  isPresentLike,
  parseStudentCsv
} from "@/lib/services/student-attendance";

describe("student attendance helpers", () => {
  it("treats late as present-like for percentages", () => {
    expect(isPresentLike(StudentAttendanceMark.PRESENT)).toBe(true);
    expect(isPresentLike(StudentAttendanceMark.LATE)).toBe(true);
    expect(isPresentLike(StudentAttendanceMark.ABSENT)).toBe(false);
  });

  it("computes attendance percent safely", () => {
    expect(attendancePercent(3, 4)).toBe(75);
    expect(attendancePercent(0, 0)).toBe(100);
  });

  it("parses class-list CSV with and without headers", () => {
    const withHeader = parseStudentCsv("student_number,full_name,email\nATU001,Ada Mensah,ada@atu.edu.gh\nATU002,Kofi Boateng,");
    expect(withHeader).toEqual([
      { studentNumber: "ATU001", fullName: "Ada Mensah", email: "ada@atu.edu.gh" },
      { studentNumber: "ATU002", fullName: "Kofi Boateng", email: undefined }
    ]);
    const bare = parseStudentCsv("ATU003,Ama Owusu");
    expect(bare[0]).toMatchObject({ studentNumber: "ATU003", fullName: "Ama Owusu" });
  });

  it("builds mark-all-present payloads", () => {
    expect(buildMarkAllPresent(["a", "b"])).toEqual([
      { studentId: "a", status: StudentAttendanceMark.PRESENT },
      { studentId: "b", status: StudentAttendanceMark.PRESENT }
    ]);
  });
});
