import { canAccessPath, pathRoles, roleHome, rolesForHref } from "@/lib/auth/roles";
import { Role } from "@prisma/client";

describe("roleHome", () => {
  it("routes each role to its primary workspace", () => {
    expect(roleHome[Role.VC]).toBe("/analytics");
    expect(roleHome[Role.CLASS_REP]).toBe("/rep/submit");
    expect(roleHome[Role.QA_OFFICER]).toBe("/dashboard");
    expect(roleHome[Role.HOD]).toBe("/courses");
  });
});

describe("canAccessPath", () => {
  it("blocks VC from flags and command center", () => {
    expect(canAccessPath(Role.VC, "/flags")).toBe(false);
    expect(canAccessPath(Role.VC, "/dashboard")).toBe(false);
    expect(canAccessPath(Role.VC, "/analytics")).toBe(true);
  });

  it("allows QA on flags and contests", () => {
    expect(canAccessPath(Role.QA_OFFICER, "/flags")).toBe(true);
    expect(canAccessPath(Role.QA_OFFICER, "/contests")).toBe(true);
  });

  it("keeps HOD off settings and flags", () => {
    expect(canAccessPath(Role.HOD, "/settings")).toBe(false);
    expect(canAccessPath(Role.HOD, "/flags")).toBe(false);
    expect(canAccessPath(Role.HOD, "/contests")).toBe(true);
  });

  it("locks class reps to reporter surfaces", () => {
    expect(canAccessPath(Role.CLASS_REP, "/rep/submit")).toBe(true);
    expect(canAccessPath(Role.CLASS_REP, "/dashboard")).toBe(false);
  });
});

describe("pathRoles / rolesForHref", () => {
  it("exposes matching role lists for nav filtering", () => {
    expect(pathRoles["/flags"]).toEqual([Role.SUPER_ADMIN, Role.QA_OFFICER, Role.QA_ASSISTANT]);
    expect(rolesForHref("/admin")).toContain(Role.VC);
    expect(rolesForHref("/settings")).not.toContain(Role.VC);
  });
});
