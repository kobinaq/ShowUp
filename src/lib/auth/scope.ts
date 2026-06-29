import { Role, type Prisma } from "@prisma/client";

export type ScopedProfile = {
  id: string;
  role: Role;
  universityId: string;
  departmentId: string | null;
};

const noAccessId = "__no_access__";

export function isDepartmentRole(role: Role) {
  return role === Role.HOD || role === Role.HOD_ASSISTANT;
}

export function isUniversityRole(role: Role) {
  return role === Role.VC || role === Role.QA_OFFICER;
}

export function courseScope(profile: ScopedProfile): Prisma.CourseWhereInput {
  if (profile.role === Role.SUPER_ADMIN) return {};
  if (isDepartmentRole(profile.role)) return { departmentId: profile.departmentId ?? noAccessId };
  if (isUniversityRole(profile.role)) return { department: { faculty: { universityId: profile.universityId } } };
  return { repAssignments: { some: { profileId: profile.id, isActive: true } } };
}

export function lecturerScope(profile: ScopedProfile): Prisma.LecturerWhereInput {
  if (profile.role === Role.SUPER_ADMIN) return {};
  if (isDepartmentRole(profile.role)) return { departmentId: profile.departmentId ?? noAccessId };
  if (isUniversityRole(profile.role)) return { department: { faculty: { universityId: profile.universityId } } };
  return { id: noAccessId };
}

export function departmentScope(profile: ScopedProfile): Prisma.DepartmentWhereInput {
  if (profile.role === Role.SUPER_ADMIN) return {};
  if (isDepartmentRole(profile.role)) return { id: profile.departmentId ?? noAccessId };
  if (isUniversityRole(profile.role)) return { faculty: { universityId: profile.universityId } };
  return { id: noAccessId };
}

export function facultyScope(profile: ScopedProfile): Prisma.FacultyWhereInput {
  if (profile.role === Role.SUPER_ADMIN) return {};
  if (isDepartmentRole(profile.role)) return { departments: { some: { id: profile.departmentId ?? noAccessId } } };
  if (isUniversityRole(profile.role)) return { universityId: profile.universityId };
  return { id: noAccessId };
}

export function semesterScope(profile: ScopedProfile): Prisma.SemesterWhereInput {
  if (profile.role === Role.SUPER_ADMIN) return {};
  if (profile.role === Role.CLASS_REP) return { id: noAccessId };
  return { universityId: profile.universityId };
}

export function profileScope(profile: ScopedProfile): Prisma.ProfileWhereInput {
  if (profile.role === Role.SUPER_ADMIN) return {};
  if (isDepartmentRole(profile.role)) return { universityId: profile.universityId, departmentId: profile.departmentId ?? noAccessId };
  if (isUniversityRole(profile.role)) return { universityId: profile.universityId };
  return { id: profile.id };
}

export function reportScope(profile: ScopedProfile): Prisma.LectureReportWhereInput {
  if (profile.role === Role.CLASS_REP) return { submittedById: profile.id };
  return { course: courseScope(profile) };
}

export function flagScope(profile: ScopedProfile): Prisma.FlagWhereInput {
  return { lecturer: lecturerScope(profile) };
}

export function contestScope(profile: ScopedProfile): Prisma.ContestWhereInput {
  return { report: reportScope(profile) };
}

export function latePingScope(profile: ScopedProfile): Prisma.LatePingWhereInput {
  return { course: courseScope(profile) };
}

export function activityLogScope(profile: ScopedProfile): Prisma.ActivityLogWhereInput {
  if (profile.role === Role.SUPER_ADMIN) return {};
  return { universityId: profile.universityId };
}

export function andWhere<T extends object>(...parts: T[]): T {
  const filtered = parts.filter((part) => Object.keys(part).length > 0);
  if (filtered.length === 0) return {} as T;
  if (filtered.length === 1) return filtered[0];
  return { AND: filtered } as T;
}

export function startOfSessionDay(date: Date) {
  const value = new Date(date);
  value.setHours(0, 0, 0, 0);
  return value;
}

export function endOfSessionDay(date: Date) {
  const value = new Date(date);
  value.setHours(23, 59, 59, 999);
  return value;
}

export function timeOnSessionDate(date: Date, time: string) {
  const [hour, minute] = time.split(":").map(Number);
  const value = startOfSessionDay(date);
  value.setHours(hour, minute, 0, 0);
  return value;
}
