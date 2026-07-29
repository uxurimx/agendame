import { db } from "@/db";
import { appointments, businesses, professionals, services, timeBlocks, serviceProfessionals } from "@/db/schema";
import { and, eq } from "drizzle-orm";
import { DEFAULT_BUSINESS_TIMEZONE, generateSlots, getMinBookableMinutes, timeToMinutes } from "@/lib/time";

type DayKey = "mon" | "tue" | "wed" | "thu" | "fri" | "sat" | "sun";
const DAY_KEYS: DayKey[] = ["sun", "mon", "tue", "wed", "thu", "fri", "sat"];

export interface BookableSlot {
  time: string;
  professionalIds: string[];
}

export interface BookableSlotsResult {
  slots: BookableSlot[];
  open?: string;
  close?: string;
  closed?: boolean;
}

export async function getBookableSlotsForDate({
  businessId,
  serviceId,
  professionalId,
  date,
}: {
  businessId: string;
  serviceId: string;
  professionalId?: string;
  date: string;
}): Promise<BookableSlotsResult> {
  if (!businessId || !date || !serviceId) {
    return { slots: [] };
  }

  const service = await db.query.services.findFirst({
    where: eq(services.id, serviceId),
  });
  if (!service) return { slots: [] };
  const durationMin = service.durationMin;

  const business = await db.query.businesses.findFirst({
    where: eq(businesses.id, businessId),
  });
  if (!business) return { slots: [] };

  const dayIdx = new Date(`${date}T00:00:00`).getDay();
  const dayKey = DAY_KEYS[dayIdx];
  const schedule = business.schedule as Record<string, { open: string; close: string; closed: boolean }> | null;
  const daySchedule = schedule?.[dayKey];

  if (!daySchedule || daySchedule.closed) {
    return { slots: [], closed: true };
  }

  const minBookableMinutes = getMinBookableMinutes(
    date,
    new Date(),
    30,
    business.timezone || DEFAULT_BUSINESS_TIMEZONE,
  );
  if (minBookableMinutes === Number.POSITIVE_INFINITY) {
    return { slots: [], open: daySchedule.open, close: daySchedule.close };
  }

  const serviceProRows = await db.query.serviceProfessionals.findMany({
    where: eq(serviceProfessionals.serviceId, serviceId),
    columns: {
      professionalId: true,
    },
  });

  let eligiblePros = await db.query.professionals.findMany({
    where: and(eq(professionals.businessId, businessId), eq(professionals.isActive, true)),
  });

  if (serviceProRows.length > 0) {
    const eligibleIds = serviceProRows.map((row) => row.professionalId);
    eligiblePros = eligiblePros.filter((pro) => eligibleIds.includes(pro.id));
  }

  if (eligiblePros.length === 0) {
    return { slots: [] };
  }

  const proIds = professionalId && professionalId !== "any"
    ? eligiblePros.some((pro) => pro.id === professionalId) ? [professionalId] : []
    : eligiblePros.map((pro) => pro.id);

  if (proIds.length === 0) {
    return { slots: [] };
  }

  const allBlocks = await db.query.timeBlocks.findMany({
    where: and(eq(timeBlocks.businessId, businessId), eq(timeBlocks.date, date)),
  });
  const businessWideBlocks = allBlocks
    .filter((block) => !block.professionalId)
    .map((block) => ({ startTime: block.startTime, endTime: block.endTime }));

  const slotAvailability: Map<string, string[]> = new Map();

  for (const proId of proIds) {
    const booked = await db.query.appointments.findMany({
      where: and(eq(appointments.professionalId, proId), eq(appointments.date, date)),
    });

    const proBlocks = allBlocks
      .filter((block) => block.professionalId === proId)
      .map((block) => ({ startTime: block.startTime, endTime: block.endTime }));

    const bookedSlots = [
      ...booked.filter((appointment) => appointment.status !== "cancelled").map((appointment) => ({
        startTime: appointment.startTime,
        endTime: appointment.endTime,
      })),
      ...businessWideBlocks,
      ...proBlocks,
    ];

    const available = generateSlots(daySchedule.open, daySchedule.close, durationMin, bookedSlots)
      .filter((slot) => minBookableMinutes === null || timeToMinutes(slot) >= minBookableMinutes);

    for (const slot of available) {
      if (!slotAvailability.has(slot)) slotAvailability.set(slot, []);
      slotAvailability.get(slot)?.push(proId);
    }
  }

  const slots = Array.from(slotAvailability.entries())
    .sort((a, b) => a[0].localeCompare(b[0]))
    .map(([time, professionalIds]) => ({ time, professionalIds }));

  return { slots, open: daySchedule.open, close: daySchedule.close };
}
