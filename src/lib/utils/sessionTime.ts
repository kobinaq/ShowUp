export function startOfSessionDay(date: Date) {
  const value = new Date(date);
  value.setHours(0, 0, 0, 0);
  return value;
}

export function endOfSessionDay(date: Date) {
  const value = new Date(date);
  value.setHours(23, 59, 59, 999);
  return value;
}

export function timeOnSessionDate(date: Date, time: string) {
  const [hour, minute] = time.split(":").map(Number);
  const value = startOfSessionDay(date);
  value.setHours(hour, minute, 0, 0);
  return value;
}

export function sessionDayRange(date: Date) {
  return { gte: startOfSessionDay(date), lte: endOfSessionDay(date) };
}

export function formatClassTime(time: string) {
  const [hourText, minuteText] = time.split(":");
  const date = new Date();
  date.setHours(Number(hourText), Number(minuteText), 0, 0);
  return date
    .toLocaleTimeString("en", { hour: "numeric", minute: Number(minuteText) ? "2-digit" : undefined, hour12: true })
    .toLowerCase()
    .replace(" ", "");
}
