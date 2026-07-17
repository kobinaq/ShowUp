import { prisma } from "@/lib/prisma";

/** Durable sliding-window style limiter stored in Postgres (works across serverless instances). */
export async function allowRateLimit(key: string, limit: number, windowMs: number) {
  const now = new Date();
  const existing = await prisma.rateLimitBucket.findUnique({ where: { key } });

  if (!existing || existing.resetAt <= now) {
    await prisma.rateLimitBucket.upsert({
      where: { key },
      create: { key, count: 1, resetAt: new Date(now.getTime() + windowMs) },
      update: { count: 1, resetAt: new Date(now.getTime() + windowMs) }
    });
    return true;
  }

  if (existing.count >= limit) return false;

  await prisma.rateLimitBucket.update({
    where: { key },
    data: { count: { increment: 1 } }
  });
  return true;
}
