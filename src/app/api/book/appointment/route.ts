import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { db } from "@/db";
import { appointments, clients, professionals, services } from "@/db/schema";
import { eq, and, gte, count } from "drizzle-orm";
import { addMinutes, generateSlots } from "@/lib/time";

const schema = z.object({
  businessId:     z.string().uuid(),
  professionalId: z.string(),
  serviceId:      z.string().uuid(),
  date:           z.string().regex(/^\d{4}-\d{2}-\d{2}$/),
  startTime:      z.string().regex(/^\d{2}:\d{2}$/),
  clientName:     z.string().min(2).max(100),
  clientPhone:    z.string().min(8).max(20),
  clientEmail:    z.string().email().optional().or(z.literal("")),
  notes:          z.string().max(500).optional(),
  _hp:            z.string().optional(), // honeypot
});

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const data = schema.parse(body);

    // Honeypot: si el campo oculto tiene contenido, es un bot — responder ok falso
    if (data._hp) return NextResponse.json({ ok: true, appointmentId: "x" });

    // Rate limit: máx 3 reservas por teléfono por negocio en 24 horas
    const since = new Date(Date.now() - 24 * 60 * 60 * 1000);
    const [rateRow] = await db
      .select({ n: count() })
      .from(appointments)
      .innerJoin(clients, eq(appointments.clientId, clients.id))
      .where(and(
        eq(clients.phone, data.clientPhone),
        eq(appointments.businessId, data.businessId),
        gte(appointments.createdAt, since),
      ));
    if ((rateRow?.n ?? 0) >= 3) {
      return NextResponse.json(
        { error: "Límite de reservas alcanzado. Contáctanos directamente." },
        { status: 429 }
      );
    }

    // Obtener servicio para duración y precio
    const service = await db.query.services.findFirst({
      where: eq(services.id, data.serviceId),
    });
    if (!service) return NextResponse.json({ error: "Servicio no encontrado" }, { status: 404 });

    const endTime = addMinutes(data.startTime, service.durationMin);

    // Resolver profesional si es "any"
    let proId = data.professionalId;
    if (proId === "any") {
      const pros = await db.query.professionals.findMany({
        where: and(
          eq(professionals.businessId, data.businessId),
          eq(professionals.isActive, true),
        ),
      });

      // Buscar el primer profesional libre en ese slot
      for (const pro of pros) {
        const booked = await db.query.appointments.findMany({
          where: and(eq(appointments.professionalId, pro.id), eq(appointments.date, data.date)),
        });
        const bookedSlots = booked
          .filter((a) => a.status !== "cancelled")
          .map((a) => ({ startTime: a.startTime, endTime: a.endTime }));
        const free = generateSlots(data.startTime, endTime, service.durationMin, bookedSlots);
        if (free.length > 0) { proId = pro.id; break; }
      }
      if (proId === "any") return NextResponse.json({ error: "Sin disponibilidad" }, { status: 409 });
    }

    // Verificar que el slot sigue libre (protección contra race condition)
    const conflicting = await db.query.appointments.findFirst({
      where: and(eq(appointments.professionalId, proId), eq(appointments.date, data.date)),
    });
    if (conflicting && conflicting.status !== "cancelled") {
      // Revisar solapamiento
      const bookedSlots = [{ startTime: conflicting.startTime, endTime: conflicting.endTime }];
      const free = generateSlots(data.startTime, endTime, service.durationMin, bookedSlots);
      if (!free.includes(data.startTime)) {
        return NextResponse.json({ error: "El horario ya no está disponible" }, { status: 409 });
      }
    }

    // Obtener profesional para comisión
    const pro = await db.query.professionals.findFirst({
      where: eq(professionals.id, proId),
    });

    const pricePaid = Number(service.price);
    const commissionAmount = pro
      ? pro.commissionType === "percentage"
        ? (pricePaid * Number(pro.commissionValue)) / 100
        : Number(pro.commissionValue)
      : 0;

    // Upsert cliente por (businessId, phone)
    const existingClient = await db.query.clients.findFirst({
      where: and(eq(clients.businessId, data.businessId), eq(clients.phone, data.clientPhone)),
    });

    let clientId: string;
    if (existingClient) {
      clientId = existingClient.id;
    } else {
      const [newClient] = await db
        .insert(clients)
        .values({
          businessId: data.businessId,
          name:       data.clientName,
          phone:      data.clientPhone,
          email:      data.clientEmail || null,
        })
        .returning({ id: clients.id });
      clientId = newClient.id;
    }

    // Crear cita
    const [apt] = await db
      .insert(appointments)
      .values({
        businessId:      data.businessId,
        professionalId:  proId,
        serviceId:       data.serviceId,
        clientId,
        date:            data.date,
        startTime:       data.startTime,
        endTime,
        status:          "confirmed",
        notes:           data.notes ?? null,
        pricePaid:       String(pricePaid),
        commissionAmount: String(commissionAmount),
        paymentStatus:   "pending",
      })
      .returning({ id: appointments.id });

    return NextResponse.json({
      ok:            true,
      appointmentId: apt.id,
      professionalId: proId,
      endTime,
    });
  } catch (err) {
    if (err instanceof z.ZodError) {
      return NextResponse.json({ error: err.message }, { status: 400 });
    }
    console.error("[book/appointment]", err);
    return NextResponse.json({ error: "Error interno" }, { status: 500 });
  }
}
