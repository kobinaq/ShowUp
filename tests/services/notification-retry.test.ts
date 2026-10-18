import { DeliveryStatus } from "@prisma/client";
import { canRetryNotification, nextNotificationRetryAt } from "@/lib/services/notification-retry";

describe("notification retry", () => {
  const now = new Date("2026-08-16T12:00:00.000Z");

  it("backs off from one hour toward a day", () => {
    expect(nextNotificationRetryAt(1, now)).toEqual(new Date("2026-08-16T13:00:00.000Z"));
    expect(nextNotificationRetryAt(5, now)).toEqual(new Date("2026-08-17T04:00:00.000Z"));
    expect(nextNotificationRetryAt(8, now)).toEqual(new Date("2026-08-17T12:00:00.000Z"));
  });

  it("retries a failed notice whose window has opened", () => {
    expect(
      canRetryNotification(
        { status: DeliveryStatus.FAILED, attemptCount: 1, nextRetryAt: new Date("2026-08-16T11:00:00.000Z") },
        3,
        now
      )
    ).toBe(true);
  });

  it("stops after the retry cap", () => {
    expect(
      canRetryNotification(
        { status: DeliveryStatus.FAILED, attemptCount: 3, nextRetryAt: new Date("2026-08-16T11:00:00.000Z") },
        3,
        now
      )
    ).toBe(false);
  });
});
