import { NextRequest, NextResponse } from "next/server";
import { auth } from "@clerk/nextjs/server";
import { db } from "@/db";
import { appointments, timeBlocks, businesses, clientPhotos } from "@/db/schema";
import { eq, and, gte, lte, inArray, desc } from "drizzle-orm";

export async function GET(req: NextRequest) {
  const { userId } = await auth();
  if (!userId) return NextResponse.json({ error: "No autorizado" }, { status: 401 });

  const biz = await db.query.businesses.findFirst({ where: eq(businesses.ownerId, userId) });
  if (!biz) return NextResponse.json({ error: "Negocio no encontrado" }, { status: 404 });

  const p    = req.nextUrl.searchParams;
  const from = p.get("from") ?? new Date().toISOString().split("T")[0];
  const to   = p.get("to")   ?? from;

  const [apts, blocks] = await Promise.all([
    db.query.appointments.findMany({
      where: and(
        eq(appointments.businessId, biz.id),
        gte(appointments.date, from),
        lte(appointments.date, to),
      ),
      with: { service: true, professional: true, client: true },
      orderBy: (t, { asc }) => [asc(t.date), asc(t.startTime)],
    }),
    db.query.timeBlocks.findMany({
      where: and(
        eq(timeBlocks.businessId, biz.id),
        gte(timeBlocks.date, from),
        lte(timeBlocks.date, to),
      ),
      with: { professional: true },
    }),
  ]);

  const appointmentIds = apts.map((appointment) => appointment.id);
  const photos = appointmentIds.length > 0
    ? await db.query.clientPhotos.findMany({
      where: inArray(clientPhotos.appointmentId, appointmentIds),
      orderBy: [desc(clientPhotos.createdAt)],
    })
    : [];
  const latestPhotoByAppointment = new Map<string, string>();
  for (const photo of photos) {
    if (photo.appointmentId && !latestPhotoByAppointment.has(photo.appointmentId)) {
      latestPhotoByAppointment.set(photo.appointmentId, photo.url);
    }
  }

  return NextResponse.json({
    appointments: apts.map((appointment) => ({
      ...appointment,
      latestReferenceImageUrl: latestPhotoByAppointment.get(appointment.id) ?? null,
    })),
    blocks,
    schedule: biz.schedule,
  });
}
