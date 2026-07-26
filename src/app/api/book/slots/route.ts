import { NextRequest, NextResponse } from "next/server";
import { auth } from "@clerk/nextjs/server";
import { db } from "@/db";
import { businesses, professionals, appointments, services, timeBlocks, serviceProfessionals } from "@/db/schema";
import { eq, and } from "drizzle-orm";
import { generateSlots, getMinBookableMinutes, timeToMinutes } from "@/lib/time";

type DayKey = "mon" | "tue" | "wed" | "thu" | "fri" | "sat" | "sun";
const DAY_KEYS: DayKey[] = ["sun", "mon", "tue", "wed", "thu", "fri", "sat"];

export async function GET(req: NextRequest) {
  const p = req.nextUrl.searchParams;
  let businessId       = p.get("businessId") ?? "";
  const professionalId = p.get("professionalId") ?? ""; // "any" o UUID
  const serviceId      = p.get("serviceId") ?? "";
  const date           = p.get("date") ?? ""; // YYYY-MM-DD

  // Si businessId es "__from_session__", resolverlo desde la sesión (uso interno del dashboard)
  if (businessId === "__from_session__") {
    const { userId } = await auth();
    if (userId) {
      const biz = await db.query.businesses.findFirst({ where: eq(businesses.ownerId, userId) });
      businessId = biz?.id ?? "";
    }
  }

  if (!businessId || !date || !serviceId) {
    return NextResponse.json({ slots: [] });
  }

  const service = await db.query.services.findFirst({
    where: eq(services.id, serviceId),
  });
  if (!service) return NextResponse.json({ slots: [] });
  const durationMin = service.durationMin;

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

  const minBookableMinutes = getMinBookableMinutes(date);
  if (minBookableMinutes === Number.POSITIVE_INFINITY) {
    return NextResponse.json({ slots: [], open: daySchedule.open, close: daySchedule.close });
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
    return NextResponse.json({ slots: [] });
  }

  // Obtener profesionales elegibles para el servicio
  let proIds: string[] = [];
  if (professionalId && professionalId !== "any") {
    proIds = eligiblePros.some((pro) => pro.id === professionalId) ? [professionalId] : [];
  } else {
    proIds = eligiblePros.map((p) => p.id);
  }

  if (proIds.length === 0) {
    return NextResponse.json({ slots: [] });
  }

  // Bloques de tiempo del negocio para ese día
  const allBlocks = await db.query.timeBlocks.findMany({
    where: and(eq(timeBlocks.businessId, businessId), eq(timeBlocks.date, date)),
  });
  // Bloques sin profesional asignado = bloquean a TODOS
  const businessWideBlocks = allBlocks
    .filter((b) => !b.professionalId)
    .map((b) => ({ startTime: b.startTime, endTime: b.endTime }));

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

    // Bloques específicos de este profesional
    const proBlocks = allBlocks
      .filter((b) => b.professionalId === proId)
      .map((b) => ({ startTime: b.startTime, endTime: b.endTime }));

    const bookedSlots = [
      ...booked.filter((a) => a.status !== "cancelled").map((a) => ({ startTime: a.startTime, endTime: a.endTime })),
      ...businessWideBlocks,
      ...proBlocks,
    ];

    const available = generateSlots(daySchedule.open, daySchedule.close, durationMin, bookedSlots)
      .filter((slot) => minBookableMinutes === null || timeToMinutes(slot) >= minBookableMinutes);

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
