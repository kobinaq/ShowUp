import { z } from "zod";

export const createRepSchema = z.object({
  courseId: z.string().min(8),
  realName: z.string().min(2),
  realEmail: z.string().email(),
  realPhone: z.string().min(8),
  rotationOrder: z.number().int().min(1),
  rotationWeeks: z.number().int().min(1).max(16).default(4)
});
