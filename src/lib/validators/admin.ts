import { z } from "zod";

export const universitySchema = z.object({
  name: z.string().min(2).max(160),
  logo: z.string().url().optional(),
  address: z.string().max(240).optional()
});

export const semesterSchema = z.object({
  name: z.string().min(4).max(120),
  startDate: z.coerce.date(),
  endDate: z.coerce.date(),
  isActive: z.boolean().default(false),
  universityId: z.string().min(8)
});

export const createStaffSchema = z.object({
  email: z.string().email(),
  password: z.string().min(10),
  displayName: z.string().min(2),
  role: z.enum(["VC", "QA_OFFICER", "QA_ASSISTANT", "HOD", "HOD_ASSISTANT", "SUPER_ADMIN"]),
  universityId: z.string().min(8),
  departmentId: z.string().min(8).optional()
});
