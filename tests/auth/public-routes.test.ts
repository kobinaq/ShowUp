describe("ping acknowledge route publicity", () => {
  const publicPingAck = /^\/api\/pings\/[^/]+\/acknowledge\/?$/;

  it("matches token acknowledge URLs", () => {
    expect(publicPingAck.test("/api/pings/abc-123/acknowledge")).toBe(true);
    expect(publicPingAck.test("/api/pings/abc-123/acknowledge/")).toBe(true);
  });

  it("does not open the ping create endpoint", () => {
    expect(publicPingAck.test("/api/pings")).toBe(false);
    expect(publicPingAck.test("/api/pings/")).toBe(false);
  });
});

describe("cron route methods", () => {
  it("exports GET and POST as the same handler", async () => {
    const route = await import("@/app/api/cron/rotation/route");
    expect(route.GET).toBe(route.POST);
    expect(typeof route.GET).toBe("function");
  });
});

import { presenceStatusSchema } from "@/lib/validators/report";

describe("presence filter", () => {
  it("accepts PresenceStatus values and rejects others", () => {
    expect(presenceStatusSchema.safeParse("ABSENT").success).toBe(true);
    expect(presenceStatusSchema.safeParse("late").success).toBe(false);
  });
});

describe("cron auth contract", () => {
  function authorizeCron(header: string | null, secret: string | undefined) {
    if (!secret || header !== `Bearer ${secret}`) return false;
    return true;
  }

  it("rejects missing or wrong bearer tokens", () => {
    expect(authorizeCron(null, "secret")).toBe(false);
    expect(authorizeCron("Bearer wrong", "secret")).toBe(false);
    expect(authorizeCron("Bearer secret", undefined)).toBe(false);
  });

  it("accepts the configured cron secret", () => {
    expect(authorizeCron("Bearer secret", "secret")).toBe(true);
  });
});
