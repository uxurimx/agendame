export function timeToMinutes(t: string): number {
  const [h, m] = t.split(":").map(Number);
  return h * 60 + m;
}

export function toLocalISODate(date = new Date()): string {
  return `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, "0")}-${String(date.getDate()).padStart(2, "0")}`;
}

export function getMinBookableMinutes(
  isoDate: string,
  now = new Date(),
  intervalMin = 30,
): number | null {
  const todayIso = toLocalISODate(now);
  if (isoDate < todayIso) return Number.POSITIVE_INFINITY;
  if (isoDate > todayIso) return null;

  const currentMinutes = (now.getHours() * 60) + now.getMinutes();
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
