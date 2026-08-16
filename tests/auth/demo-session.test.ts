import { Role } from "@prisma/client";
import { parseDemoSession, signDemoSession } from "@/lib/auth/demo-session";

describe("demo session signing", () => {
  const previousAccess = process.env.DEMO_ACCESS_TOKEN;
  const previousSession = process.env.DEMO_SESSION_SECRET;

  beforeEach(() => {
    process.env.DEMO_ACCESS_TOKEN = "pitch-access-code";
    process.env.DEMO_SESSION_SECRET = "cookie-signing-secret";
  });

  afterEach(() => {
    process.env.DEMO_ACCESS_TOKEN = previousAccess;
    process.env.DEMO_SESSION_SECRET = previousSession;
  });

  it("accepts a cookie signed with DEMO_SESSION_SECRET", async () => {
    const cookie = await signDemoSession({ role: Role.QA_OFFICER, phone: "+233555000000" });
    const parsed = await parseDemoSession(cookie);
    expect(parsed?.role).toBe(Role.QA_OFFICER);
    expect(parsed?.phone).toBe("+233555000000");
  });

  it("rejects a cookie signed with DEMO_ACCESS_TOKEN", async () => {
    process.env.DEMO_SESSION_SECRET = "pitch-access-code";
    const forged = await signDemoSession({ role: Role.SUPER_ADMIN });
    process.env.DEMO_SESSION_SECRET = "cookie-signing-secret";
    await expect(parseDemoSession(forged)).resolves.toBeNull();
  });

  it("throws when DEMO_SESSION_SECRET is missing", async () => {
    delete process.env.DEMO_SESSION_SECRET;
    await expect(signDemoSession({ role: Role.HOD })).rejects.toThrow("DEMO_SESSION_SECRET is not configured");
  });
});
