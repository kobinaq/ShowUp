import { prisma } from "@/lib/prisma";

export function nextRateLimitHit(
  existing: { count: number; resetAt: Date } | null,
  now: Date,
  windowMs: number
) {
  if (!existing || existing.resetAt.getTime() <= now.getTime()) {
    return { count: 1, resetAt: new Date(now.getTime() + windowMs) };
  }
  return { count: existing.count + 1, resetAt: existing.resetAt };
}

export function allowRateLimitCount(count: number, limit: number) {
  return count <= limit;
}

export async function allowRateLimit(key: string, limit: number, windowMs: number) {
  const now = new Date();
  const resetAt = new Date(now.getTime() + windowMs);
  const rows = await prisma.$queryRaw<Array<{ count: number | bigint }>>`
    INSERT INTO "RateLimitBucket" ("key", "count", "resetAt")
    VALUES (${key}, 1, ${resetAt})
    ON CONFLICT ("key") DO UPDATE SET
      "count" = CASE
        WHEN "RateLimitBucket"."resetAt" <= ${now} THEN 1
        ELSE "RateLimitBucket"."count" + 1
      END,
      "resetAt" = CASE
        WHEN "RateLimitBucket"."resetAt" <= ${now} THEN EXCLUDED."resetAt"
        ELSE "RateLimitBucket"."resetAt"
      END
    RETURNING "count"
  `;
  return allowRateLimitCount(Number(rows[0]?.count ?? 0), limit);
}
