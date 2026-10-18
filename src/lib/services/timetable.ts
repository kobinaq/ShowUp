import {
  LectureSessionStatus,
  SessionDisruptionReason,
  type Prisma,
  type Role
} from "@prisma/client";
import { prisma } from "@/lib/prisma";
import { startOfSessionDay } from "@/lib/utils/sessionTime";

const DAY_NAMES = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"] as const;

export const FACILITIES_REASONS: SessionDisruptionReason[] = [
  SessionDisruptionReason.ROOM_NOT_READY,
  SessionDisruptionReason.POWER_PROJECTOR,
  SessionDisruptionReason.UNIVERSITY_EVENT
];

export function isFacilitiesReason(reason: SessionDisruptionReason | null | undefined) {
  return Boolean(reason && FACILITIES_REASONS.includes(reason));
}

export function parseDayOfWeek(value: string): number | null {
  const trimmed = value.trim();
  if (/^[0-6]$/.test(trimmed)) return Number(trimmed);
  const idx = DAY_NAMES.findIndex((day) => day.toLowerCase() === trimmed.slice(0, 3).toLowerCase());
  return idx >= 0 ? idx : null;
}

export function parseTimetableCsv(csv: string) {
  const lines = csv
    .split(/\r?\n/)
    .map((line) => line.trim())
    .filter(Boolean);
  if (!lines.length) return { rows: [] as TimetableImportRow[], errors: ["CSV is empty"] };

  const header = splitCsvLine(lines[0]).map((cell) => cell.trim().toLowerCase());
  const hasHeader =
    header.includes("course_code") ||
    header.includes("course") ||
    (header.includes("day") && header.includes("start_time"));
  const dataLines = hasHeader ? lines.slice(1) : lines;
  const index = (names: string[]) => names.map((name) => header.indexOf(name)).find((i) => i >= 0) ?? -1;

  const col = {
    courseCode: hasHeader ? index(["course_code", "course", "code"]) : 0,
    lecturerEmail: hasHeader ? index(["lecturer_email", "lecturer", "staff_email"]) : 1,
    roomCode: hasHeader ? index(["room_code", "room", "venue_code"]) : 2,
    roomName: hasHeader ? index(["room_name", "venue"]) : 3,
    day: hasHeader ? index(["day", "day_of_week", "weekday"]) : 4,
    startTime: hasHeader ? index(["start_time", "start"]) : 5,
    endTime: hasHeader ? index(["end_time", "end"]) : 6,
    classGroup: hasHeader ? index(["class_group", "group", "cohort"]) : 7,
    faculty: hasHeader ? index(["faculty"]) : 8,
    department: hasHeader ? index(["department", "dept"]) : 9
  };

  const rows: TimetableImportRow[] = [];
  const errors: string[] = [];

  dataLines.forEach((line, offset) => {
    const cells = splitCsvLine(line);
    const courseCode = cell(cells, col.courseCode);
    const dayRaw = cell(cells, col.day);
    const startTime = normalizeTime(cell(cells, col.startTime));
    const endTime = normalizeTime(cell(cells, col.endTime));
    const dayOfWeek = parseDayOfWeek(dayRaw);
    if (!courseCode || dayOfWeek === null || !startTime || !endTime) {
      errors.push(`Row ${offset + (hasHeader ? 2 : 1)}: need course_code, day, start_time, end_time`);
      return;
    }
    rows.push({
      courseCode: courseCode.toUpperCase(),
      lecturerEmail: cell(cells, col.lecturerEmail)?.toLowerCase() || null,
      roomCode: cell(cells, col.roomCode) || null,
      roomName: cell(cells, col.roomName) || null,
      dayOfWeek,
      startTime,
      endTime,
      classGroupCode: cell(cells, col.classGroup) || null,
      facultyName: cell(cells, col.faculty) || null,
      departmentName: cell(cells, col.department) || null
    });
  });

  return { rows, errors };
}

export type TimetableImportRow = {
  courseCode: string;
  lecturerEmail: string | null;
  roomCode: string | null;
  roomName: string | null;
  dayOfWeek: number;
  startTime: string;
  endTime: string;
  classGroupCode: string | null;
  facultyName: string | null;
  departmentName: string | null;
};

export async function importTimetableCsv(params: {
  universityId: string;
  semesterId: string;
  csv: string;
  actorId: string;
}) {
  const parsed = parseTimetableCsv(params.csv);
  if (parsed.errors.length && !parsed.rows.length) {
    return { created: 0, updated: 0, rooms: 0, groups: 0, errors: parsed.errors };
  }

  const courses = await prisma.course.findMany({
    where: { semesterId: params.semesterId, department: { faculty: { universityId: params.universityId } } },
    include: { schedule: true, lecturer: true, classGroups: true }
  });
  const byCode = new Map(courses.map((course) => [course.code.toUpperCase(), course]));
  const lecturers = await prisma.lecturer.findMany({
    where: { department: { faculty: { universityId: params.universityId } } }
  });
  const lecturerByEmail = new Map(lecturers.map((lecturer) => [lecturer.email.toLowerCase(), lecturer]));

  let created = 0;
  let updated = 0;
  let rooms = 0;
  let groups = 0;
  const errors = [...parsed.errors];

  for (const row of parsed.rows) {
    const course = byCode.get(row.courseCode);
    if (!course) {
      errors.push(`Unknown course code ${row.courseCode} in active semester`);
      continue;
    }

    let roomId: string | null = null;
    if (row.roomCode) {
      const room = await prisma.room.upsert({
        where: { universityId_code: { universityId: params.universityId, code: row.roomCode } },
        create: {
          universityId: params.universityId,
          code: row.roomCode,
          name: row.roomName || row.roomCode,
          building: null
        },
        update: { name: row.roomName || row.roomCode, isActive: true }
      });
      roomId = room.id;
      rooms += 1;
    }

    let classGroupId: string | null = null;
    if (row.classGroupCode) {
      const group = await prisma.classGroup.upsert({
        where: { courseId_code: { courseId: course.id, code: row.classGroupCode } },
        create: {
          courseId: course.id,
          code: row.classGroupCode,
          name: row.classGroupCode
        },
        update: { name: row.classGroupCode }
      });
      classGroupId = group.id;
      groups += 1;
    }

    if (row.lecturerEmail) {
      const lecturer = lecturerByEmail.get(row.lecturerEmail);
      if (lecturer && lecturer.id !== course.lecturerId) {
        await prisma.course.update({ where: { id: course.id }, data: { lecturerId: lecturer.id } });
      } else if (!lecturer) {
        errors.push(`Unknown lecturer email ${row.lecturerEmail} for ${row.courseCode}`);
      }
    }

    const existing = course.schedule.find(
      (slot) =>
        slot.dayOfWeek === row.dayOfWeek &&
        slot.startTime === row.startTime &&
        slot.endTime === row.endTime &&
        (slot.classGroupId ?? null) === classGroupId
    );

    if (existing) {
      await prisma.classSchedule.update({
        where: { id: existing.id },
        data: {
          roomId,
          classGroupId,
          venue: row.roomName || row.roomCode || existing.venue
        }
      });
      updated += 1;
    } else {
      await prisma.classSchedule.create({
        data: {
          courseId: course.id,
          dayOfWeek: row.dayOfWeek,
          startTime: row.startTime,
          endTime: row.endTime,
          roomId,
          classGroupId,
          venue: row.roomName || row.roomCode || null
        }
      });
      created += 1;
    }
  }

  await prisma.activityLog.create({
    data: {
      universityId: params.universityId,
      actorId: params.actorId,
      action: "TIMETABLE_CSV_IMPORT",
      metadata: { created, updated, rooms, groups, errorCount: errors.length }
    }
  });

  return { created, updated, rooms, groups, errors };
}

export async function ensureLectureSession(params: {
  scheduleId: string;
  lectureDate: Date;
  tx?: Prisma.TransactionClient;
}) {
  const db = params.tx ?? prisma;
  const schedule = await db.classSchedule.findUnique({
    where: { id: params.scheduleId },
    include: { classGroup: true }
  });
  if (!schedule) throw new Error("Schedule not found");
  const lectureDate = startOfSessionDay(params.lectureDate);
  const existing = await db.lectureSession.findUnique({
    where: { scheduleId_lectureDate: { scheduleId: schedule.id, lectureDate } }
  });
  if (existing) return existing;
  const session = await db.lectureSession.create({
    data: {
      courseId: schedule.courseId,
      scheduleId: schedule.id,
      lectureDate,
      status: LectureSessionStatus.SCHEDULED,
      roomId: schedule.roomId,
      classGroups: schedule.classGroupId
        ? { create: [{ classGroupId: schedule.classGroupId }] }
        : undefined
    }
  });
  return session;
}

export async function isFlagSuppressedByBlackout(params: {
  universityId: string;
  departmentId: string;
  lectureDate: Date;
  tx?: Prisma.TransactionClient;
}) {
  const db = params.tx ?? prisma;
  const day = startOfSessionDay(params.lectureDate);
  const blackout = await db.academicBlackout.findFirst({
    where: {
      universityId: params.universityId,
      suppressesFlags: true,
      startDate: { lte: day },
      endDate: { gte: day },
      OR: [{ departmentId: null }, { departmentId: params.departmentId }]
    }
  });
  return Boolean(blackout);
}

export function scorecardPunctualityFilter(): Prisma.FlagWhereInput {
  return { attributedToFacilities: false };
}

export const timetableManagers: Role[] = [
  "SUPER_ADMIN",
  "QA_OFFICER",
  "QA_ASSISTANT",
  "IT",
  "HOD",
  "HOD_ASSISTANT"
] as Role[];

function splitCsvLine(line: string) {
  const cells: string[] = [];
  let current = "";
  let inQuotes = false;
  for (let i = 0; i < line.length; i += 1) {
    const ch = line[i];
    if (ch === '"') {
      if (inQuotes && line[i + 1] === '"') {
        current += '"';
        i += 1;
      } else {
        inQuotes = !inQuotes;
      }
      continue;
    }
    if (ch === "," && !inQuotes) {
      cells.push(current.trim());
      current = "";
      continue;
    }
    current += ch;
  }
  cells.push(current.trim());
  return cells;
}

function cell(cells: string[], index: number) {
  if (index < 0 || index >= cells.length) return "";
  return cells[index].replace(/^"|"$/g, "").trim();
}

function normalizeTime(value: string) {
  const match = value.trim().match(/^(\d{1,2}):(\d{2})$/);
  if (!match) return "";
  return `${match[1].padStart(2, "0")}:${match[2]}`;
}
