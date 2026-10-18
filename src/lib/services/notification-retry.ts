import { DeliveryStatus } from "@prisma/client";

const HOUR_MS = 1000 * 60 * 60;

export function nextNotificationRetryAt(attemptCount: number, now: Date) {
  const hours = Math.min(24, 2 ** Math.max(0, attemptCount - 1));
  return new Date(now.getTime() + hours * HOUR_MS);
}

export function canRetryNotification(
  notification: { status: DeliveryStatus; attemptCount: number; nextRetryAt: Date | null },
  maxRetries: number,
  now: Date
) {
  if (notification.status !== DeliveryStatus.FAILED) return false;
  if (notification.attemptCount >= maxRetries) return false;
  if (!notification.nextRetryAt) return false;
  return notification.nextRetryAt.getTime() <= now.getTime();
}
