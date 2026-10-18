import {
  applyLateGrace
} from "@/lib/services/session-status";
import {
  isFacilitiesReason,
  parseDayOfWeek,
  parseTimetableCsv
} from "@/lib/services/timetable";
import { SessionDisruptionReason } from "@prisma/client";

describe("timetable CSV parse", () => {
  it("parses headered CSV rows", () => {
    const csv = `course_code,lecturer_email,room_code,room_name,day,start_time,end_time,class_group
CENG301,a@atu.edu.gh,A101,Lab 1,Mon,08:00,10:00,Morning
CS101,b@atu.edu.gh,B2,Lab 2,2,13:00,15:00,Evening`;
    const { rows, errors } = parseTimetableCsv(csv);
    expect(errors).toEqual([]);
    expect(rows).toHaveLength(2);
    expect(rows[0]).toMatchObject({
      courseCode: "CENG301",
      dayOfWeek: 1,
      startTime: "08:00",
      endTime: "10:00",
      classGroupCode: "Morning",
      roomCode: "A101"
    });
    expect(rows[1].dayOfWeek).toBe(2);
  });

  it("reports missing required fields", () => {
    const { rows, errors } = parseTimetableCsv("course_code,day,start_time,end_time\nCENG301,,08:00,10:00");
    expect(rows).toHaveLength(0);
    expect(errors[0]).toMatch(/need course_code/);
  });
});

describe("day and facilities helpers", () => {
  it("parses day names and numbers", () => {
    expect(parseDayOfWeek("Mon")).toBe(1);
    expect(parseDayOfWeek("5")).toBe(5);
    expect(parseDayOfWeek("nope")).toBeNull();
  });

  it("classifies facilities reasons", () => {
    expect(isFacilitiesReason(SessionDisruptionReason.ROOM_NOT_READY)).toBe(true);
    expect(isFacilitiesReason(SessionDisruptionReason.POWER_PROJECTOR)).toBe(true);
    expect(isFacilitiesReason(SessionDisruptionReason.LECTURER_EMERGENCY)).toBe(false);
  });
});

describe("late grace window", () => {
  it("keeps arrivals within grace as on-time", () => {
    expect(applyLateGrace({ lateMinutes: 8, graceMinutes: 10 })).toEqual({
      arrivalStatus: "ON_TIME",
      lateMinutes: 8
    });
  });

  it("marks beyond grace as late", () => {
    expect(applyLateGrace({ lateMinutes: 15, graceMinutes: 10 })).toEqual({
      arrivalStatus: "LATE",
      lateMinutes: 15
    });
  });
});
