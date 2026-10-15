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

export const askPeriods = [
  "today",
  "yesterday",
  "week",
  "last_week",
  "month",
  "last_month",
  "semester",
  "previous_semester",
  "year",
  "unrecognized"
] as const;

export type AskPeriod = (typeof askPeriods)[number];

export type QueryPlanParams = {
  lecturerId?: string;
  courseId?: string;
  departmentId?: string;
  semesterId?: string;
  period?: AskPeriod;
  from?: string;
  to?: string;
  type?: FlagType;
  threshold?: number;
  limit?: number;
};

export type QueryPlan = {
  queryType: AskQueryType;
  params: QueryPlanParams;
  intent: string;
};
