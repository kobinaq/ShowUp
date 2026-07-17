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
