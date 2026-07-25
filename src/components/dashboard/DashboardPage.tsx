import { getBusiness } from "@/lib/getBusiness";
import { db } from "@/db";
import { appointments, clients, professionals } from "@/db/schema";
import { eq, and, asc, desc, gte, count } from "drizzle-orm";
import { OverviewDashboard } from "@/components/dashboard/OverviewDashboard";
import { AlertTriangle } from "lucide-react";
import Link from "next/link";
import { siteConfig } from "@/config/site";

function mexicoISODate() {
  const parts = new Intl.DateTimeFormat("en-CA", {
    timeZone: "America/Mexico_City",
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  }).formatToParts(new Date());

  const year = parts.find((part) => part.type === "year")?.value ?? "0000";
  const month = parts.find((part) => part.type === "month")?.value ?? "00";
  const day = parts.find((part) => part.type === "day")?.value ?? "00";
  return `${year}-${month}-${day}`;
}

export default async function DashboardPage() {
  const biz = await getBusiness();
  const today = mexicoISODate();

  const firstOfMonth = new Date();
  firstOfMonth.setDate(1);
  firstOfMonth.setHours(0, 0, 0, 0);

  const [pros, todayApts, recentApts, newClientsRow] = await Promise.all([
    db.query.professionals.findMany({
      where: and(eq(professionals.businessId, biz.id), eq(professionals.isActive, true)),
    }),
    db.query.appointments.findMany({
      where: and(eq(appointments.businessId, biz.id), eq(appointments.date, today)),
      with: { client: true, professional: true, service: true },
      orderBy: [asc(appointments.startTime)],
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
  ]);
  const hasTeam = pros.length > 0;
  const newClientsMonth = newClientsRow[0]?.value ?? 0;
  const bookingUrl = `${siteConfig.url}/book/${biz.slug}`;

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
      } : null,
    };
  }

  const todayAppointments = todayApts.map(mapApt);
  const recentAppointments = recentApts.map(mapApt);

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
        bookingUrl={bookingUrl}
        newClientsMonth={newClientsMonth}
        todayAppointments={todayAppointments}
        recentAppointments={recentAppointments}
      />
    </div>
  );
}
