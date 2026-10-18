import { Role } from "@prisma/client";

export const roleHome: Record<Role, string> = {
  SUPER_ADMIN: "/admin",
  VC: "/analytics",
  QA_OFFICER: "/dashboard",
  QA_ASSISTANT: "/dashboard",
  IT: "/admin",
  HOD: "/courses",
  HOD_ASSISTANT: "/courses",
  LECTURER: "/lecturer",
  CLASS_REP: "/rep/submit"
};

const STAFF: Role[] = [
  Role.SUPER_ADMIN,
  Role.VC,
  Role.QA_OFFICER,
  Role.QA_ASSISTANT,
  Role.IT,
  Role.HOD,
  Role.HOD_ASSISTANT,
  Role.LECTURER
];

const OPS: Role[] = [Role.SUPER_ADMIN, Role.QA_OFFICER, Role.QA_ASSISTANT, Role.IT, Role.HOD, Role.HOD_ASSISTANT];
const QA: Role[] = [Role.SUPER_ADMIN, Role.QA_OFFICER, Role.QA_ASSISTANT];
const QA_HOD: Role[] = [Role.SUPER_ADMIN, Role.QA_OFFICER, Role.QA_ASSISTANT, Role.HOD, Role.HOD_ASSISTANT];
const COURSE_MANAGERS: Role[] = [...QA_HOD, Role.IT, Role.LECTURER];

/** Shared nav + page access matrix — keep Sidebar/MobileNav in sync with this. */
export const pathRoles: Record<string, Role[]> = {
  "/dashboard": OPS,
  "/lecturer": [Role.LECTURER, Role.SUPER_ADMIN],
  "/analytics": STAFF.filter((role) => role !== Role.LECTURER),
  "/reports": STAFF.filter((role) => role !== Role.LECTURER),
  "/courses": STAFF,
  "/students": STAFF.filter((role) => role !== Role.LECTURER),
  "/lecturers": STAFF.filter((role) => role !== Role.LECTURER),
  "/flags": QA,
  "/contests": QA_HOD,
  "/roster": [...QA, Role.HOD, Role.HOD_ASSISTANT],
  "/rotation": [Role.SUPER_ADMIN, Role.QA_OFFICER, Role.QA_ASSISTANT, Role.IT],
  "/lookups": QA,
  "/discrepancies": QA,
  "/reps": [...QA, Role.IT, Role.HOD, Role.HOD_ASSISTANT],
  "/timetable": [...QA, Role.IT, Role.HOD, Role.HOD_ASSISTANT, Role.LECTURER],
  "/facilities": [...QA, Role.IT, Role.HOD, Role.HOD_ASSISTANT, Role.LECTURER, Role.VC],
  "/calendar": [...QA, Role.IT, Role.HOD, Role.HOD_ASSISTANT, Role.VC, Role.LECTURER],
  "/support": STAFF.filter((role) => role !== Role.LECTURER),
  "/admin": [Role.SUPER_ADMIN, Role.VC, Role.IT],
  "/settings": [Role.SUPER_ADMIN, Role.IT],
  "/rep": [Role.CLASS_REP]
};

export const attendanceManagers = COURSE_MANAGERS;

export const routeRoles: Array<{ pattern: RegExp; roles: Role[] }> = Object.entries(pathRoles).map(([path, roles]) => ({
  pattern: new RegExp(`^\\${path}`),
  roles
}));

export function canAccessPath(role: Role, path: string) {
  const match = routeRoles.find((route) => route.pattern.test(path));
  return match ? match.roles.includes(role) : true;
}

export function rolesForHref(href: string): Role[] | undefined {
  const exact = pathRoles[href];
  if (exact) return exact;
  const entry = Object.entries(pathRoles).find(([path]) => href === path || href.startsWith(`${path}/`));
  return entry?.[1];
}
