import { Role } from "@prisma/client";

export const roleHome: Record<Role, string> = {
  SUPER_ADMIN: "/admin",
  VC: "/analytics",
  QA_OFFICER: "/dashboard",
  QA_ASSISTANT: "/dashboard",
  HOD: "/courses",
  HOD_ASSISTANT: "/courses",
  CLASS_REP: "/rep/submit"
};

export const routeRoles: Array<{ pattern: RegExp; roles: Role[] }> = [
  { pattern: /^\/admin/, roles: [Role.SUPER_ADMIN, Role.VC, Role.QA_OFFICER, Role.QA_ASSISTANT, Role.HOD, Role.HOD_ASSISTANT] },
  { pattern: /^\/analytics/, roles: [Role.SUPER_ADMIN, Role.VC, Role.QA_OFFICER, Role.QA_ASSISTANT, Role.HOD, Role.HOD_ASSISTANT] },
  { pattern: /^\/courses/, roles: [Role.SUPER_ADMIN, Role.VC, Role.QA_OFFICER, Role.QA_ASSISTANT, Role.HOD, Role.HOD_ASSISTANT] },
  { pattern: /^\/reports/, roles: [Role.SUPER_ADMIN, Role.VC, Role.QA_OFFICER, Role.QA_ASSISTANT, Role.HOD, Role.HOD_ASSISTANT] },
  { pattern: /^\/lecturers/, roles: [Role.SUPER_ADMIN, Role.VC, Role.QA_OFFICER, Role.QA_ASSISTANT, Role.HOD, Role.HOD_ASSISTANT] },
  { pattern: /^\/flags/, roles: [Role.SUPER_ADMIN, Role.QA_OFFICER, Role.QA_ASSISTANT] },
  { pattern: /^\/contests/, roles: [Role.SUPER_ADMIN, Role.QA_OFFICER, Role.QA_ASSISTANT, Role.HOD, Role.HOD_ASSISTANT] },
  { pattern: /^\/settings/, roles: [Role.QA_OFFICER, Role.QA_ASSISTANT] },
  { pattern: /^\/rep/, roles: [Role.CLASS_REP] },
  { pattern: /^\/dashboard/, roles: [Role.SUPER_ADMIN, Role.QA_OFFICER, Role.QA_ASSISTANT, Role.HOD, Role.HOD_ASSISTANT] }
];

export function canAccessPath(role: Role, path: string) {
  const match = routeRoles.find((route) => route.pattern.test(path));
  return match ? match.roles.includes(role) : true;
}
