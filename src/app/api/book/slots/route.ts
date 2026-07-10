import { NextRequest, NextResponse } from "next/server";
import { db } from "@/db";
import { businesses, professionals, appointments } from "@/db/schema";
import { eq, and } from "drizzle-orm";
import { generateSlots } from "@/lib/time";

type DayKey = "mon" | "tue" | "wed" | "thu" | "fri" | "sat" | "sun";
const DAY_KEYS: DayKey[] = ["sun", "mon", "tue", "wed", "thu", "fri", "sat"];

export async function GET(req: NextRequest) {
  const p = req.nextUrl.searchParams;
  const businessId     = p.get("businessId") ?? "";
  const professionalId = p.get("professionalId") ?? ""; // "any" o UUID
  const serviceId      = p.get("serviceId") ?? "";
  const date           = p.get("date") ?? ""; // YYYY-MM-DD
  const durationMin    = parseInt(p.get("durationMin") ?? "60", 10);

  if (!businessId || !date || !serviceId) {
    return NextResponse.json({ slots: [] });
  }

  // Horario del negocio para ese día
  const business = await db.query.businesses.findFirst({
    where: eq(businesses.id, businessId),
  });
  if (!business) return NextResponse.json({ slots: [] });

  const dayIdx  = new Date(date + "T00:00:00").getDay();
  const dayKey  = DAY_KEYS[dayIdx];
  const schedule = business.schedule as Record<string, { open: string; close: string; closed: boolean }> | null;
  const daySchedule = schedule?.[dayKey];

  if (!daySchedule || daySchedule.closed) {
    return NextResponse.json({ slots: [], closed: true });
  }

  // Obtener profesionales activos del negocio
  let proIds: string[] = [];
  if (professionalId && professionalId !== "any") {
    proIds = [professionalId];
  } else {
    const pros = await db.query.professionals.findMany({
      where: and(eq(professionals.businessId, businessId), eq(professionals.isActive, true)),
    });
    proIds = pros.map((p) => p.id);
  }

  // Para cada profesional, obtener sus citas ese día
  // Retornar slots donde AL MENOS UN profesional esté libre
  const slotAvailability: Map<string, string[]> = new Map(); // slot → [proIds disponibles]

  for (const proId of proIds) {
    const booked = await db.query.appointments.findMany({
      where: and(
        eq(appointments.professionalId, proId),
        eq(appointments.date, date),
      ),
    });

    const bookedSlots = booked
      .filter((a) => a.status !== "cancelled")
      .map((a) => ({ startTime: a.startTime, endTime: a.endTime }));

    const available = generateSlots(daySchedule.open, daySchedule.close, durationMin, bookedSlots);

    for (const slot of available) {
      if (!slotAvailability.has(slot)) slotAvailability.set(slot, []);
      slotAvailability.get(slot)!.push(proId);
    }
  }

  // Ordenar slots cronológicamente
  const slots = Array.from(slotAvailability.entries())
    .sort((a, b) => a[0].localeCompare(b[0]))
    .map(([time, pros]) => ({ time, professionalIds: pros }));

  return NextResponse.json({ slots, open: daySchedule.open, close: daySchedule.close });
}
