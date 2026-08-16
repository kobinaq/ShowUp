import { z } from "zod";

export const presenceStatusSchema = z.enum(["PRESENT", "ABSENT", "SUBSTITUTE"]);
const teachingAidSchema = z.enum(["SLIDES", "WHITEBOARD", "HANDOUTS", "VIDEO", "NONE", "OTHER"]);

const reportCore = {
  courseId: z.string().min(8),
  scheduleId: z.string().min(8),
  lectureDate: z.coerce.date(),
  substituteNote: z.string().max(500).optional(),
  topicIds: z.array(z.string().min(8)).default([]),
  additionalNotes: z.string().max(1200).optional()
};

const heldClass = {
  arrivalStatus: z.enum(["ON_TIME", "LATE"]).optional(),
  lateMinutes: z.number().int().min(1).max(240).optional(),
  earlyDismissal: z.boolean().default(false),
  dismissedEarlyMinutes: z.number().int().min(1).max(240).optional(),
  previousTopicsRevisited: z.boolean().default(false),
  teachingAids: z.array(teachingAidSchema).min(1),
  wasInteractive: z.enum(["YES", "SOMEWHAT", "NO"]),
  studentCount: z.number().int().min(0).max(2000).optional()
};

export const reportSchema = z.discriminatedUnion("lecturerPresent", [
  z.object({
    ...reportCore,
    lecturerPresent: z.literal("ABSENT"),
    arrivalStatus: z.enum(["ON_TIME", "LATE"]).optional(),
    lateMinutes: z.number().int().min(1).max(240).optional(),
    earlyDismissal: z.boolean().optional(),
    dismissedEarlyMinutes: z.number().int().min(1).max(240).optional(),
    previousTopicsRevisited: z.boolean().optional(),
    teachingAids: z.array(teachingAidSchema).optional(),
    wasInteractive: z.enum(["YES", "SOMEWHAT", "NO"]).optional(),
    studentCount: z.number().int().min(0).max(2000).optional()
  }),
  z.object({
    ...reportCore,
    lecturerPresent: z.literal("PRESENT"),
    ...heldClass
  }),
  z.object({
    ...reportCore,
    lecturerPresent: z.literal("SUBSTITUTE"),
    ...heldClass
  })
]);
