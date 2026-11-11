export const AREAS = ["Westlands", "Kilimani", "Karen", "Lavington", "CBD", "Eastlands"] as const;
export type Area = (typeof AREAS)[number];

export const SLOTS = [
  { id: "morning", label: "Morning (8:00 – 11:00)", startHour: 8, endHour: 11 },
  { id: "midday", label: "Midday (11:00 – 14:00)", startHour: 11, endHour: 14 },
  { id: "afternoon", label: "Afternoon (14:00 – 17:00)", startHour: 14, endHour: 17 },
  { id: "evening", label: "Evening (17:00 – 20:00)", startHour: 17, endHour: 20 },
] as const;

const OFFSET_MS = 3 * 60 * 60 * 1000;
const DAY_MS = 24 * 60 * 60 * 1000;

export function parseSlotDay(value: string | undefined): Date | null {
  if (!value || !/^\d{4}-\d{2}-\d{2}$/.test(value)) return null;
  const day = new Date(`${value}T00:00:00+03:00`);
  return Number.isNaN(day.getTime()) ? null : day;
}

export function slotBounds(day: Date, slotId: string): { start: Date; end: Date } | null {
  const slot = SLOTS.find((s) => s.id === slotId);
  if (!slot) return null;
  return {
    start: new Date(day.getTime() + slot.startHour * 60 * 60 * 1000),
    end: new Date(day.getTime() + slot.endHour * 60 * 60 * 1000),
  };
}

export function upcomingDays(count = 7): { value: string; label: string }[] {
  const today = new Date(Date.now() + OFFSET_MS);
  today.setUTCHours(0, 0, 0, 0);
  const base = today.getTime() - OFFSET_MS;
  return Array.from({ length: count }, (_, i) => {
    const d = new Date(base + i * DAY_MS);
    return {
      value: new Date(d.getTime() + OFFSET_MS).toISOString().slice(0, 10),
      label: d.toLocaleDateString("en-KE", {
        timeZone: "Africa/Nairobi",
        weekday: "short",
        day: "numeric",
        month: "short",
      }),
    };
  });
}

export function slotAvailable(dayValue: string, slotId: string, now = Date.now()): boolean {
  const day = parseSlotDay(dayValue);
  const bounds = day && slotBounds(day, slotId);
  return !!bounds && bounds.start.getTime() > now;
}

export function firstAvailableSlot(dayValue: string, now = Date.now()): string | undefined {
  return SLOTS.find((slot) => slotAvailable(dayValue, slot.id, now))?.id;
}

export function nextAvailableSlot(now = Date.now()): { dayValue: string; dayLabel: string; slotLabel: string } | null {
  for (const day of upcomingDays(7)) {
    const slotId = firstAvailableSlot(day.value, now);
    const slot = SLOTS.find((s) => s.id === slotId);
    if (slot) return { dayValue: day.value, dayLabel: day.label, slotLabel: slot.label };
  }
  return null;
}

export function formatSlot(start: Date, end: Date): string {
  return `${start.toLocaleString("en-KE", {
    timeZone: "Africa/Nairobi",
    weekday: "short",
    day: "numeric",
    month: "short",
  })}, ${start.toLocaleTimeString("en-KE", { timeZone: "Africa/Nairobi", hour: "2-digit", minute: "2-digit" })}–${end.toLocaleTimeString("en-KE", {
    timeZone: "Africa/Nairobi",
    hour: "2-digit",
    minute: "2-digit",
  })}`;
}
