import { getBusiness } from "@/lib/getBusiness";
import { db } from "@/db";
import { appointments, clientPhotos, clients, professionals, services } from "@/db/schema";
import { eq, and, asc, desc, gte, count, inArray, sql } from "drizzle-orm";
import { OverviewDashboard } from "@/components/dashboard/OverviewDashboard";
import { AlertTriangle } from "lucide-react";
import Link from "next/link";
import { timeToMinutes } from "@/lib/time";

function mexicoISODate(date = new Date()) {
  const parts = new Intl.DateTimeFormat("en-CA", {
    timeZone: "America/Mexico_City",
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  }).formatToParts(date);

  const year = parts.find((part) => part.type === "year")?.value ?? "0000";
  const month = parts.find((part) => part.type === "month")?.value ?? "00";
  const day = parts.find((part) => part.type === "day")?.value ?? "00";
  return `${year}-${month}-${day}`;
}

function getDayKey(isoDate: string) {
  const day = new Date(`${isoDate}T12:00:00`).getDay();
  return ["sun", "mon", "tue", "wed", "thu", "fri", "sat"][day] ?? "mon";
}

export default async function DashboardPage() {
  const biz = await getBusiness();
  const today = mexicoISODate();
  const todayDate = new Date(`${today}T12:00:00`);
  todayDate.setDate(todayDate.getDate() - 7);
  const previousWeekDate = mexicoISODate(todayDate);
  const firstOfMonthDate = new Date(`${today}T12:00:00`);
  firstOfMonthDate.setDate(1);
  const firstOfMonthIso = mexicoISODate(firstOfMonthDate);

  const firstOfMonth = new Date();
  firstOfMonth.setDate(1);
  firstOfMonth.setHours(0, 0, 0, 0);

  const serviceCountExpr = sql<number>`count(${appointments.id})::int`;
  const [pros, todayApts, previousWeekApts, recentApts, newClientsRow, topServices] = await Promise.all([
    db.query.professionals.findMany({
      where: and(eq(professionals.businessId, biz.id), eq(professionals.isActive, true)),
    }),
    db.query.appointments.findMany({
      where: and(eq(appointments.businessId, biz.id), eq(appointments.date, today)),
      with: { client: true, professional: true, service: true },
      orderBy: [asc(appointments.startTime)],
    }),
    db.query.appointments.findMany({
      where: and(eq(appointments.businessId, biz.id), eq(appointments.date, previousWeekDate)),
      with: { service: true },
    }),
    db.query.appointments.findMany({
      where: eq(appointments.businessId, biz.id),
      with: { client: true, professional: true, service: true },
      orderBy: [desc(appointments.createdAt)],
      limit: 5,
    }),
    db.select({ value: count() }).from(clients).where(
      and(eq(clients.businessId, biz.id), gte(clients.createdAt, firstOfMonth)),
    ),
    db
      .select({
        serviceId: appointments.serviceId,
        name: services.name,
        total: serviceCountExpr,
      })
      .from(appointments)
      .innerJoin(services, eq(services.id, appointments.serviceId))
      .where(and(
        eq(appointments.businessId, biz.id),
        gte(appointments.date, firstOfMonthIso),
        sql`${appointments.status} not in ('cancelled', 'no_show')`,
      ))
      .groupBy(appointments.serviceId, services.name)
      .orderBy(desc(serviceCountExpr), asc(services.name))
      .limit(3),
  ]);
  const hasTeam = pros.length > 0;
  const newClientsMonth = newClientsRow[0]?.value ?? 0;
  const appointmentIds = [...new Set([...todayApts, ...recentApts].map((appointment) => appointment.id))];
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

  function mapApt(appointment: typeof todayApts[number]) {
    return {
      id: appointment.id,
      date: appointment.date,
      startTime: appointment.startTime,
      endTime: appointment.endTime,
      status: appointment.status,
      pricePaid: appointment.pricePaid,
      paymentStatus: appointment.paymentStatus ?? null,
      paymentMethod: appointment.paymentMethod ?? null,
      notes: appointment.notes ?? null,
      createdAt: appointment.createdAt?.toISOString?.() ?? null,
      service: appointment.service ? {
        name: appointment.service.name,
        price: String(appointment.service.price),
      } : null,
      professional: appointment.professional ? {
        id: appointment.professional.id,
        name: appointment.professional.name,
      } : null,
      client: appointment.client ? {
        name: appointment.client.name,
        phone: appointment.client.phone,
        isPreferred: appointment.client.isPreferred,
      } : null,
      latestReferenceImageUrl: latestPhotoByAppointment.get(appointment.id) ?? null,
    };
  }

  const todayAppointments = todayApts.map(mapApt);
  const recentAppointments = recentApts.map(mapApt);
  const todayOpenSchedule = (biz.schedule as Record<string, { open: string; close: string; closed: boolean }> | null)?.[getDayKey(today)] ?? null;
  const dailyCapacityMinutes = todayOpenSchedule && !todayOpenSchedule.closed
    ? Math.max(0, timeToMinutes(todayOpenSchedule.close) - timeToMinutes(todayOpenSchedule.open)) * pros.length
    : 0;
  const previousWeekRevenue = previousWeekApts
    .filter((appointment) => appointment.status === "completed")
    .reduce((sum, appointment) => sum + Number(appointment.pricePaid ?? appointment.service?.price ?? 0), 0);

  return (
    <div className="dash-page" style={{ maxWidth: "100%" }}>
      {!hasTeam && (
        <Link href="/settings" className="dash-alert-banner">
          <AlertTriangle size={18} style={{ flexShrink: 0 }} />
          <div>
            <strong>Tu página de reservas no está lista.</strong>
            <span> Agrégate como profesional en Ajustes para recibir citas.</span>
          </div>
          <span className="dash-alert-cta">Ir a Ajustes →</span>
        </Link>
      )}

      <OverviewDashboard
        businessName={biz.name}
        newClientsMonth={newClientsMonth}
        todayAppointments={todayAppointments}
        recentAppointments={recentAppointments}
        dailyCapacityMinutes={dailyCapacityMinutes}
        previousWeekRevenue={previousWeekRevenue}
        topServices={topServices.map((service) => ({
          id: service.serviceId,
          name: service.name,
          total: service.total,
        }))}
      />
    </div>
  );
}
