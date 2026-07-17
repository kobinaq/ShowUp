import { Role } from "@prisma/client";

export const roleHome: Record<Role, string> = {
  SUPER_ADMIN: "/admin",
  VC: "/analytics",
  QA_OFFICER: "/dashboard",
  QA_ASSISTANT: "/dashboard",
  IT: "/admin",
  HOD: "/courses",
  HOD_ASSISTANT: "/courses",
  CLASS_REP: "/rep/submit"
};

const STAFF: Role[] = [
  Role.SUPER_ADMIN,
  Role.VC,
  Role.QA_OFFICER,
  Role.QA_ASSISTANT,
  Role.IT,
  Role.HOD,
  Role.HOD_ASSISTANT
];

const OPS: Role[] = [Role.SUPER_ADMIN, Role.QA_OFFICER, Role.QA_ASSISTANT, Role.IT, Role.HOD, Role.HOD_ASSISTANT];
const QA: Role[] = [Role.SUPER_ADMIN, Role.QA_OFFICER, Role.QA_ASSISTANT];
const QA_HOD: Role[] = [Role.SUPER_ADMIN, Role.QA_OFFICER, Role.QA_ASSISTANT, Role.HOD, Role.HOD_ASSISTANT];

/** Shared nav + page access matrix — keep Sidebar/MobileNav in sync with this. */
export const pathRoles: Record<string, Role[]> = {
  "/dashboard": OPS,
  "/analytics": STAFF,
  "/reports": STAFF,
  "/courses": STAFF,
  "/students": STAFF,
  "/lecturers": STAFF,
  "/flags": QA,
  "/contests": QA_HOD,
  "/support": STAFF,
  "/admin": [Role.SUPER_ADMIN, Role.VC, Role.IT],
  "/settings": [Role.SUPER_ADMIN, Role.IT],
  "/rep": [Role.CLASS_REP]
};

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
