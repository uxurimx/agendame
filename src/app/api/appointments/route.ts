import { NextRequest, NextResponse } from "next/server";
import { auth } from "@clerk/nextjs/server";
import { db } from "@/db";
import { appointmentEvents, appointments, businesses, clients, professionals, services, serviceProfessionals, timeBlocks } from "@/db/schema";
import { eq, and, asc, desc, inArray } from "drizzle-orm";
import { z } from "zod";
import { addMinutes, DEFAULT_BUSINESS_TIMEZONE, timeToMinutes, toLocalISODate } from "@/lib/time";

const createSchema = z.object({
  serviceId: z.string().uuid(),
  professionalId: z.string().uuid(),
  date: z.string().regex(/^\d{4}-\d{2}-\d{2}$/),
  startTime: z.string().regex(/^\d{2}:\d{2}$/),
  clientName: z.string().min(2).max(100),
  clientPhone: z.string().min(8).max(20),
  clientEmail: z.string().email().optional().or(z.literal("")),
  notes: z.string().max(500).optional().or(z.literal("")),
});

function overlaps(startA: string, endA: string, startB: string, endB: string) {
  const aStart = timeToMinutes(startA);
  const aEnd = timeToMinutes(endA);
  const bStart = timeToMinutes(startB);
  const bEnd = timeToMinutes(endB);
  return aStart < bEnd && aEnd > bStart;
}

async function isProfessionalAvailable(
  businessId: string,
  professionalId: string,
  date: string,
  startTime: string,
  endTime: string,
) {
  const [dayAppointments, dayBlocks] = await Promise.all([
    db.query.appointments.findMany({
      where: and(eq(appointments.professionalId, professionalId), eq(appointments.date, date)),
    }),
    db.query.timeBlocks.findMany({
      where: and(eq(timeBlocks.businessId, businessId), eq(timeBlocks.date, date)),
    }),
  ]);

  const hasAppointmentConflict = dayAppointments
    .filter((apt) => apt.status !== "cancelled")
    .some((apt) => overlaps(startTime, endTime, apt.startTime, apt.endTime));

  if (hasAppointmentConflict) return false;

  const hasBlockConflict = dayBlocks.some((block) => {
    const appliesToProfessional = !block.professionalId || block.professionalId === professionalId;
    return appliesToProfessional && overlaps(startTime, endTime, block.startTime, block.endTime);
  });

  return !hasBlockConflict;
}

export async function GET(req: NextRequest) {
  const { userId } = await auth();
  if (!userId) return NextResponse.json({ error: "No autorizado" }, { status: 401 });

  const biz = await db.query.businesses.findFirst({ where: eq(businesses.ownerId, userId) });
  if (!biz) return NextResponse.json({ error: "Negocio no encontrado" }, { status: 404 });

  const p        = req.nextUrl.searchParams;
  const date     = p.get("date") ?? toLocalISODate(new Date(), biz.timezone || DEFAULT_BUSINESS_TIMEZONE);
  const clientId = p.get("clientId") ?? undefined;

  const where = clientId
    ? and(eq(appointments.businessId, biz.id), eq(appointments.clientId, clientId))
    : and(eq(appointments.businessId, biz.id), eq(appointments.date, date));

  const list = await db.query.appointments.findMany({
    where,
    with: { service: true, professional: true, client: true },
    orderBy: clientId
      ? [desc(appointments.date), asc(appointments.startTime)]
      : [asc(appointments.startTime)],
  });

  if (!clientId) {
    return NextResponse.json(list);
  }

  const appointmentIds = list.map((item) => item.id);
  const events = appointmentIds.length > 0
    ? await db.query.appointmentEvents.findMany({
      where: inArray(appointmentEvents.appointmentId, appointmentIds),
      orderBy: [desc(appointmentEvents.createdAt)],
    })
    : [];
  const eventsByAppointment = new Map<string, typeof events>();
  for (const event of events) {
    const current = eventsByAppointment.get(event.appointmentId) ?? [];
    current.push(event);
    eventsByAppointment.set(event.appointmentId, current);
  }

  return NextResponse.json(list.map((item) => ({
    ...item,
    history: (eventsByAppointment.get(item.id) ?? []).map((event) => ({
      id: event.id,
      eventType: event.eventType,
      reason: event.reason,
      fromDate: event.fromDate,
      fromStartTime: event.fromStartTime,
      fromEndTime: event.fromEndTime,
      toDate: event.toDate,
      toStartTime: event.toStartTime,
      toEndTime: event.toEndTime,
      createdAt: event.createdAt?.toISOString?.() ?? null,
    })),
  })));
}

export async function POST(req: NextRequest) {
  const { userId } = await auth();
  if (!userId) return NextResponse.json({ error: "No autorizado" }, { status: 401 });

  const biz = await db.query.businesses.findFirst({ where: eq(businesses.ownerId, userId) });
  if (!biz) return NextResponse.json({ error: "Negocio no encontrado" }, { status: 404 });

  try {
    const body = await req.json();
    const data = createSchema.parse(body);
    const clientEmail = data.clientEmail?.trim() || null;

    const service = await db.query.services.findFirst({
      where: and(eq(services.id, data.serviceId), eq(services.businessId, biz.id)),
    });
    if (!service) return NextResponse.json({ error: "Servicio no encontrado" }, { status: 404 });

    const professional = await db.query.professionals.findFirst({
      where: and(
        eq(professionals.id, data.professionalId),
        eq(professionals.businessId, biz.id),
        eq(professionals.isActive, true),
      ),
    });
    if (!professional) return NextResponse.json({ error: "Profesional no encontrado" }, { status: 404 });

    const serviceProRows = await db.query.serviceProfessionals.findMany({
      where: eq(serviceProfessionals.serviceId, data.serviceId),
      columns: { professionalId: true },
    });
    if (serviceProRows.length > 0 && !serviceProRows.some((row) => row.professionalId === data.professionalId)) {
      return NextResponse.json({ error: "La profesional seleccionada no ofrece este servicio" }, { status: 409 });
    }

    const endTime = addMinutes(data.startTime, service.durationMin);
    const stillAvailable = await isProfessionalAvailable(
      biz.id,
      data.professionalId,
      data.date,
      data.startTime,
      endTime,
    );

    if (!stillAvailable) {
      return NextResponse.json({ error: "El horario ya no está disponible" }, { status: 409 });
    }

    const pricePaid = Number(service.price);
    const commissionAmount = professional.commissionType === "percentage"
      ? (pricePaid * Number(professional.commissionValue)) / 100
      : Number(professional.commissionValue);

    const existingClient = await db.query.clients.findFirst({
      where: and(eq(clients.businessId, biz.id), eq(clients.phone, data.clientPhone)),
    });

    let clientId = existingClient?.id ?? "";
    if (existingClient) {
      await db
        .update(clients)
        .set({
          name: data.clientName.trim(),
          email: clientEmail,
        })
        .where(eq(clients.id, existingClient.id));
    } else {
      const [newClient] = await db
        .insert(clients)
        .values({
          businessId: biz.id,
          name: data.clientName.trim(),
          phone: data.clientPhone.trim(),
          email: clientEmail,
          notes: null,
        })
        .returning({ id: clients.id });
      clientId = newClient.id;
    }

    const [apt] = await db
      .insert(appointments)
      .values({
        businessId: biz.id,
        professionalId: data.professionalId,
        serviceId: data.serviceId,
        clientId,
        date: data.date,
        startTime: data.startTime,
        endTime,
        status: "confirmed",
        notes: data.notes?.trim() || null,
        pricePaid: String(pricePaid),
        commissionAmount: String(commissionAmount),
        paymentStatus: "pending",
      })
      .returning({ id: appointments.id });

    return NextResponse.json({ ok: true, appointmentId: apt.id, endTime });
  } catch (err) {
    if (err instanceof z.ZodError) {
      return NextResponse.json({ error: err.message }, { status: 400 });
    }
    console.error("[appointments POST]", err);
    return NextResponse.json({ error: "Error interno" }, { status: 500 });
  }
}
