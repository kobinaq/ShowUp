import { z } from "zod";

export const reportSchema = z.object({
  courseId: z.string().min(8),
  scheduleId: z.string().min(8),
  lectureDate: z.coerce.date(),
  lecturerPresent: z.enum(["PRESENT", "ABSENT", "SUBSTITUTE"]),
  substituteNote: z.string().max(500).optional(),
  arrivalStatus: z.enum(["ON_TIME", "LATE"]).optional(),
  lateMinutes: z.number().int().min(1).max(240).optional(),
  earlyDismissal: z.boolean().default(false),
  dismissedEarlyMinutes: z.number().int().min(1).max(240).optional(),
  topicIds: z.array(z.string().min(8)).default([]),
  previousTopicsRevisited: z.boolean().default(false),
  teachingAids: z.array(z.enum(["SLIDES", "WHITEBOARD", "HANDOUTS", "VIDEO", "NONE", "OTHER"])).default([]),
  wasInteractive: z.enum(["YES", "SOMEWHAT", "NO"]).optional(),
  studentCount: z.number().int().min(0).max(2000).optional(),
  additionalNotes: z.string().max(1200).optional()
}).superRefine((report, ctx) => {
  if (report.lecturerPresent === "ABSENT") return;
  if (!report.wasInteractive) {
    ctx.addIssue({ code: z.ZodIssueCode.custom, path: ["wasInteractive"], message: "Interactivity is required when a class was held." });
  }
  if (report.teachingAids.length === 0) {
    ctx.addIssue({ code: z.ZodIssueCode.custom, path: ["teachingAids"], message: "Select at least one teaching aid, or None." });
  }
});
