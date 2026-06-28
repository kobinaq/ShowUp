import { differenceInCalendarWeeks } from "date-fns";

export function getSemesterWeek(startDate: Date, now = new Date()) {
  if (now < startDate) return 0;
  return differenceInCalendarWeeks(now, startDate, { weekStartsOn: 1 }) + 1;
}
