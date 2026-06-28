import { z } from "zod";

export const contestSchema = z.object({
  reportId: z.string().min(8),
  reason: z.string().min(10).max(1200),
  evidenceUrl: z.string().url().optional()
});

export const resolveContestSchema = z.object({
  status: z.enum(["ACCEPTED", "DISMISSED"]),
  resolutionNote: z.string().min(3).max(1200)
});
