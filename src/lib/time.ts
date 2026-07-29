export const DEFAULT_BUSINESS_TIMEZONE = "America/Mexico_City";

export function timeToMinutes(t: string): number {
  const [h, m] = t.split(":").map(Number);
  return h * 60 + m;
}

function getDatePartsInTimeZone(
  date = new Date(),
  timeZone = DEFAULT_BUSINESS_TIMEZONE,
) {
  const parts = new Intl.DateTimeFormat("en-CA", {
    timeZone,
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  }).formatToParts(date);

  const year = parts.find((part) => part.type === "year")?.value ?? "0000";
  const month = parts.find((part) => part.type === "month")?.value ?? "00";
  const day = parts.find((part) => part.type === "day")?.value ?? "00";
  return { year, month, day };
}

export function toLocalISODate(
  date = new Date(),
  timeZone = DEFAULT_BUSINESS_TIMEZONE,
): string {
  const { year, month, day } = getDatePartsInTimeZone(date, timeZone);
  return `${year}-${month}-${day}`;
}

export function getCurrentMinutesInTimeZone(
  date = new Date(),
  timeZone = DEFAULT_BUSINESS_TIMEZONE,
): number {
  const parts = new Intl.DateTimeFormat("en-GB", {
    timeZone,
    hour: "2-digit",
    minute: "2-digit",
    hour12: false,
  }).formatToParts(date);

  const hour = Number(parts.find((part) => part.type === "hour")?.value ?? "0");
  const minute = Number(parts.find((part) => part.type === "minute")?.value ?? "0");
  return (hour * 60) + minute;
}

export function getMinBookableMinutes(
  isoDate: string,
  now = new Date(),
  intervalMin = 30,
  timeZone = DEFAULT_BUSINESS_TIMEZONE,
): number | null {
  const todayIso = toLocalISODate(now, timeZone);
  if (isoDate < todayIso) return Number.POSITIVE_INFINITY;
  if (isoDate > todayIso) return null;

  const currentMinutes = getCurrentMinutesInTimeZone(now, timeZone);
  return Math.ceil(currentMinutes / intervalMin) * intervalMin;
}

export function minutesToTime(mins: number): string {
  const h = Math.floor(mins / 60);
  const m = mins % 60;
  return `${String(h).padStart(2, "0")}:${String(m).padStart(2, "0")}`;
}

export function addMinutes(t: string, mins: number): string {
  return minutesToTime(timeToMinutes(t) + mins);
}

/** Formatea "14:30" → "2:30 pm" */
export function formatTime(t: string): string {
  const [h, m] = t.split(":").map(Number);
  const period = h >= 12 ? "pm" : "am";
  const hour   = h % 12 || 12;
  return `${hour}:${String(m).padStart(2, "0")} ${period}`;
}

/** Genera slots de startTime a closeTime - durationMin, cada 30 min */
export function generateSlots(
  openTime:    string,
  closeTime:   string,
  durationMin: number,
  booked:      Array<{ startTime: string; endTime: string }>,
): string[] {
  const slots: string[] = [];
  let current = timeToMinutes(openTime);
  const close = timeToMinutes(closeTime);

  while (current + durationMin <= close) {
    const slotEnd  = current + durationMin;
    const timeStr  = minutesToTime(current);
    const overlaps = booked.some(({ startTime, endTime }) => {
      const s = timeToMinutes(startTime);
      const e = timeToMinutes(endTime);
      return current < e && slotEnd > s;
    });
    if (!overlaps) slots.push(timeStr);
    current += 30;
  }
  return slots;
}
