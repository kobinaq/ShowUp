import { FlagType } from "@prisma/client";

export const askQueryTypes = [
  "lecturer_attendance",
  "topic_coverage",
  "flags",
  "top_absent",
  "top_late",
  "coverage_lag",
  "department_summary",
  "ping_history",
  "unsupported"
] as const;

export type AskQueryType = (typeof askQueryTypes)[number];

export type QueryPlanParams = {
  lecturerId?: string;
  courseId?: string;
  departmentId?: string;
  semesterId?: string;
  type?: FlagType;
  threshold?: number;
  limit?: number;
};

export type QueryPlan = {
  queryType: AskQueryType;
  params: QueryPlanParams;
  intent: string;
};
