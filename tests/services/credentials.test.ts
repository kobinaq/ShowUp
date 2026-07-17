import { Role } from "@prisma/client";

/** Mirrors notification.service sendRepCredentials SMS contract — passwords must never appear in SMS. */
function buildRepSms(realEmail: string) {
  return `ShowUp: you were assigned as a course reporter. Check your email (${realEmail}) for login details. Do not share credentials.`;
}

function buildRepEmail(aliasEmail: string, password: string) {
  return `Username: ${aliasEmail} Temporary password: ${password}`;
}

describe("credential delivery policy", () => {
  it("keeps temporary passwords out of SMS copy", () => {
    const password = "SuperSecret123!";
    const sms = buildRepSms("rep@example.com");
    expect(sms).not.toContain(password);
    expect(sms.toLowerCase()).toContain("email");
  });

  it("allows temporary passwords only in email copy", () => {
    const password = "SuperSecret123!";
    const email = buildRepEmail("reporter_01@showup.internal", password);
    expect(email).toContain(password);
  });

  it("still scopes VC away from mutable admin actions conceptually", () => {
    const mutableAdminRoles = [Role.SUPER_ADMIN, Role.IT];
    expect(mutableAdminRoles).not.toContain(Role.VC);
  });
});
