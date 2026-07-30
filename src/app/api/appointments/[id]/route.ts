import { NextRequest, NextResponse } from "next/server";
import { auth } from "@clerk/nextjs/server";
import { z } from "zod";
import { db } from "@/db";
import { appointmentEvents, appointments, businesses, professionals, timeBlocks } from "@/db/schema";
import { and, eq } from "drizzle-orm";
import { timeToMinutes } from "@/lib/time";
import { isBusinessBlocked } from "@/lib/trial";

const schema = z.object({
  status:        z.enum(["pending", "confirmed", "completed", "cancelled", "no_show"]).optional(),
  paymentStatus: z.enum(["pending", "paid", "online"]).optional(),
  paymentMethod: z.enum(["cash", "card", "transfer", "online"]).optional(),
  pricePaid:     z.coerce.number().min(0).optional(),
  notes:         z.string().max(500).optional(),
  // Reprogramar
  date:          z.string().regex(/^\d{4}-\d{2}-\d{2}$/).optional(),
  startTime:     z.string().regex(/^\d{2}:\d{2}$/).optional(),
  endTime:       z.string().regex(/^\d{2}:\d{2}$/).optional(),
  historyReason: z.string().trim().max(500).optional(),
});

function overlaps(startA: string, endA: string, startB: string, endB: string) {
  const aStart = timeToMinutes(startA);
  const aEnd = timeToMinutes(endA);
  const bStart = timeToMinutes(startB);
  const bEnd = timeToMinutes(endB);
  return aStart < bEnd && aEnd > bStart;
}

async function isProfessionalAvailableExcludingAppointment(
  businessId: string,
  professionalId: string,
  date: string,
  startTime: string,
  endTime: string,
  appointmentId: string,
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
    .filter((item) => item.id !== appointmentId && item.status !== "cancelled")
    .some((item) => overlaps(startTime, endTime, item.startTime, item.endTime));

  if (hasAppointmentConflict) return false;

  const hasBlockConflict = dayBlocks.some((block) => {
    const appliesToProfessional = !block.professionalId || block.professionalId === professionalId;
    return appliesToProfessional && overlaps(startTime, endTime, block.startTime, block.endTime);
  });

  return !hasBlockConflict;
}

export async function PATCH(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const { userId } = await auth();
  if (!userId) return NextResponse.json({ error: "No autorizado" }, { status: 401 });

  const { id } = await params;
  const biz = await db.query.businesses.findFirst({ where: eq(businesses.ownerId, userId) });
  if (!biz) return NextResponse.json({ error: "Negocio no encontrado" }, { status: 404 });
  if (isBusinessBlocked(biz.planStatus, biz.trialEndsAt, biz.createdAt)) {
    return NextResponse.json({ error: "Debes elegir un plan para modificar citas." }, { status: 402 });
  }

  const apt = await db.query.appointments.findFirst({ where: eq(appointments.id, id) });
  if (!apt || apt.businessId !== biz.id) {
    return NextResponse.json({ error: "Cita no encontrada" }, { status: 404 });
  }

  try {
    const body = await req.json();
    const data = schema.parse(body);
    const updateData: Record<string, unknown> = { ...data };
    delete updateData.historyReason;
    const historyReason = data.historyReason?.trim();
    const nextDate = data.date ?? apt.date;
    const nextStartTime = data.startTime ?? apt.startTime;
    const nextEndTime = data.endTime ?? apt.endTime;
    const isReschedule = nextDate !== apt.date || nextStartTime !== apt.startTime || nextEndTime !== apt.endTime;
    const isCancellation = data.status === "cancelled" && apt.status !== "cancelled";

    if (isReschedule && (!data.date || !data.startTime || !data.endTime)) {
      return NextResponse.json({ error: "Reprogramación incompleta" }, { status: 400 });
    }

    if ((isReschedule || isCancellation) && !historyReason) {
      return NextResponse.json({ error: "El motivo es obligatorio" }, { status: 400 });
    }

    if (isReschedule) {
      const available = await isProfessionalAvailableExcludingAppointment(
        biz.id,
        apt.professionalId,
        nextDate,
        nextStartTime,
        nextEndTime,
        apt.id,
      );
      if (!available) {
        return NextResponse.json({ error: "El nuevo horario no está disponible" }, { status: 409 });
      }
    }

    if (typeof data.pricePaid === "number") {
      updateData.pricePaid = data.pricePaid.toFixed(2);

      const professional = await db.query.professionals.findFirst({
        where: and(
          eq(professionals.id, apt.professionalId),
          eq(professionals.businessId, biz.id),
        ),
      });

      if (professional) {
        const commissionAmount = professional.commissionType === "percentage"
          ? (data.pricePaid * Number(professional.commissionValue)) / 100
          : Number(professional.commissionValue);
        updateData.commissionAmount = commissionAmount.toFixed(2);
      }
    }

    await db
      .update(appointments)
      .set({
        ...updateData,
        updatedAt: new Date(),
      })
      .where(eq(appointments.id, id));

    if (isReschedule) {
      await db.insert(appointmentEvents).values({
        appointmentId: apt.id,
        businessId: biz.id,
        clientId: apt.clientId,
        eventType: "moved",
        reason: historyReason!,
        fromDate: apt.date,
        fromStartTime: apt.startTime,
        fromEndTime: apt.endTime,
        toDate: nextDate,
        toStartTime: nextStartTime,
        toEndTime: nextEndTime,
      });
    }

    if (isCancellation) {
      await db.insert(appointmentEvents).values({
        appointmentId: apt.id,
        businessId: biz.id,
        clientId: apt.clientId,
        eventType: "cancelled",
        reason: historyReason!,
        fromDate: apt.date,
        fromStartTime: apt.startTime,
        fromEndTime: apt.endTime,
      });
    }

    return NextResponse.json({ ok: true });
  } catch (err) {
    if (err instanceof z.ZodError) return NextResponse.json({ error: err.message }, { status: 400 });
    console.error("[appointments/[id]]", err);
    return NextResponse.json({ error: "Error interno" }, { status: 500 });
  }
}
