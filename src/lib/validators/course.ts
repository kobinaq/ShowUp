import { z } from "zod";

export const scheduleSchema = z.object({
  dayOfWeek: z.number().int().min(0).max(6),
  startTime: z.string().regex(/^\d{2}:\d{2}$/),
  endTime: z.string().regex(/^\d{2}:\d{2}$/),
  venue: z.string().max(120).optional()
});

export const createCourseSchema = z.object({
  code: z.string().min(2).max(20),
  title: z.string().min(3).max(160),
  departmentId: z.string().min(8),
  semesterId: z.string().min(8),
  lecturerId: z.string().min(8),
  creditHours: z.number().int().min(1).max(6),
  schedule: scheduleSchema.array().min(1)
});

export const outlineTopicSchema = z.object({
  title: z.string().min(1).max(180),
  description: z.string().max(800).optional(),
  weekNumber: z.number().int().min(1).max(30).optional(),
  order: z.number().int().min(1)
});

export const outlineSchema = z.object({
  fileUrl: z.string().url(),
  fileName: z.string().min(3),
  outlineType: z.enum(["WEEKLY", "FLAT"]),
  topics: outlineTopicSchema.array().min(1)
});
