import { z } from "zod";

export const createRosterProposalSchema = z.object({
  realName: z.string().min(2),
  realEmail: z.string().email(),
  realPhone: z.string().min(8)
});

export const reviewRosterProposalSchema = z.object({
  status: z.enum(["APPROVED", "REJECTED"]),
  reviewNote: z.string().max(500).optional()
});
