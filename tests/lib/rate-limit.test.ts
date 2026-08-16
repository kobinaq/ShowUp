import { allowRateLimitCount, nextRateLimitHit } from "@/lib/rate-limit";

describe("nextRateLimitHit", () => {
  const now = new Date("2026-08-16T12:00:00.000Z");
  const windowMs = 60_000;

  it("starts a window at count 1", () => {
    expect(nextRateLimitHit(null, now, windowMs)).toEqual({
      count: 1,
      resetAt: new Date("2026-08-16T12:01:00.000Z")
    });
  });

  it("resets when the window has elapsed", () => {
    expect(
      nextRateLimitHit({ count: 9, resetAt: new Date("2026-08-16T11:59:00.000Z") }, now, windowMs)
    ).toEqual({
      count: 1,
      resetAt: new Date("2026-08-16T12:01:00.000Z")
    });
  });

  it("increments inside an open window", () => {
    const resetAt = new Date("2026-08-16T12:01:00.000Z");
    expect(nextRateLimitHit({ count: 3, resetAt }, now, windowMs)).toEqual({ count: 4, resetAt });
  });
});

describe("allowRateLimitCount", () => {
  it("allows hits up to the limit", () => {
    expect(allowRateLimitCount(10, 10)).toBe(true);
    expect(allowRateLimitCount(11, 10)).toBe(false);
  });
});
