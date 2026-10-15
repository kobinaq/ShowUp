import { endOfSessionDay, startOfSessionDay } from "@/lib/utils/sessionTime";
import type { AskPeriod } from "@/types/ask";

export const periodLabels: Record<AskPeriod, string> = {
  today: "today",
  yesterday: "yesterday",
  week: "this week",
  last_week: "last week",
  month: "this month",
  last_month: "last month",
  semester: "this semester",
  previous_semester: "last semester",
  year: "this academic year",
  unrecognized: "that period"
};

const inferredPeriods: Array<{ preset: AskPeriod; pattern: RegExp }> = [
  { preset: "yesterday", pattern: /\byesterday\b/i },
  { preset: "today", pattern: /\b(today|this morning|this afternoon|this evening)\b/i },
  { preset: "last_week", pattern: /\blast week\b/i },
  { preset: "week", pattern: /\b(this week|current week)\b/i },
  { preset: "last_month", pattern: /\blast month\b/i },
  { preset: "month", pattern: /\b(this month|current month)\b/i },
  { preset: "previous_semester", pattern: /\b(last semester|previous semester|prior semester|last term|previous term)\b/i },
  { preset: "year", pattern: /\b(this academic year|current academic year|this year|academic year)\b/i },
  { preset: "semester", pattern: /\b(this semester|current semester|this term|the semester)\b/i }
];

const unrecognizedTimePhrase =
  /\b(tomorrow|next week|next month|next semester|next term|last year|next year|this weekend|last weekend|fortnight|quarter)\b/i;

const explicitRangePhrase = /\b(between\b.+\band\b|since\b|until\b|from\b.+\bto\b)/i;

export function inferAskPeriod(question: string): AskPeriod | null {
  const match = inferredPeriods.find((candidate) => candidate.pattern.test(question));
  return match?.preset ?? null;
}

export function hasUnrecognizedTimePhrase(question: string) {
  return unrecognizedTimePhrase.test(question);
}

export function needsModelPeriod(question: string) {
  return explicitRangePhrase.test(question) && !inferAskPeriod(question);
}

export function periodLabelFor(period?: AskPeriod | null) {
  if (!period) return periodLabels.semester;
  return periodLabels[period];
}

export type AskWindow = {
  from: Date | null;
  to: Date | null;
  label: string;
};

type SemesterBounds = { startDate: Date; endDate: Date; name?: string | null };

export function resolveAskWindow(period: AskPeriod, now: Date, semester?: SemesterBounds | null): AskWindow {
  if (period === "today") return bounded(startOfSessionDay(now), endOfSessionDay(now), periodLabels.today);
  if (period === "yesterday") {
    const day = startOfSessionDay(now);
    day.setDate(day.getDate() - 1);
    return bounded(day, endOfSessionDay(day), periodLabels.yesterday);
  }
  if (period === "week") return bounded(startOfWeek(now), endOfWeek(now), periodLabels.week);
  if (period === "last_week") {
    const thisWeek = startOfWeek(now);
    const start = new Date(thisWeek);
    start.setDate(start.getDate() - 7);
    return bounded(start, endOfWeek(start), periodLabels.last_week);
  }
  if (period === "month") return monthWindow(now.getFullYear(), now.getMonth(), periodLabels.month);
  if (period === "last_month") return monthWindow(now.getFullYear(), now.getMonth() - 1, periodLabels.last_month);
  if (period === "year") {
    const academicYearStart = now.getMonth() >= 7 ? now.getFullYear() : now.getFullYear() - 1;
    return bounded(new Date(academicYearStart, 7, 1), endOfSessionDay(new Date(academicYearStart + 1, 6, 31)), periodLabels.year);
  }
  if (period === "semester" || period === "previous_semester") {
    if (!semester) return { from: null, to: null, label: periodLabels[period] };
    return bounded(
      startOfSessionDay(semester.startDate),
      endOfSessionDay(semester.endDate),
      semester.name ? `in ${semester.name}` : periodLabels[period]
    );
  }
  return { from: null, to: null, label: periodLabels.unrecognized };
}

export function explicitAskWindow(from?: string, to?: string): AskWindow | null {
  const start = parseDay(from);
  const end = parseDay(to);
  if (!start || !end) return null;
  const fromDay = startOfSessionDay(start);
  const toDay = endOfSessionDay(end);
  if (fromDay > toDay) return null;
  const label = `${formatDay(fromDay)} to ${formatDay(toDay)}`;
  return { from: fromDay, to: toDay, label };
}

function bounded(from: Date, to: Date, label: string): AskWindow {
  return { from: startOfSessionDay(from), to: endOfSessionDay(to), label };
}

function startOfWeek(date: Date) {
  const start = startOfSessionDay(date);
  const day = start.getDay();
  const diff = day === 0 ? 6 : day - 1;
  start.setDate(start.getDate() - diff);
  return start;
}

function endOfWeek(date: Date) {
  const end = startOfWeek(date);
  end.setDate(end.getDate() + 6);
  return endOfSessionDay(end);
}

function monthWindow(year: number, month: number, label: string): AskWindow {
  const start = new Date(year, month, 1);
  const end = new Date(year, month + 1, 0);
  return bounded(start, end, label);
}

function parseDay(value?: string) {
  if (!value) return null;
  const match = /^(\d{4})-(\d{2})-(\d{2})/.exec(value.trim());
  if (match) return new Date(Number(match[1]), Number(match[2]) - 1, Number(match[3]));
  const parsed = new Date(value);
  return Number.isNaN(parsed.getTime()) ? null : parsed;
}

function formatDay(date: Date) {
  return date.toLocaleDateString("en-GB", { day: "numeric", month: "short", year: "numeric" });
}
