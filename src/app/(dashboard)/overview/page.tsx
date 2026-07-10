import { getBusiness } from "@/lib/getBusiness";
import { db } from "@/db";
import { appointments, clients, professionals } from "@/db/schema";
import { eq, and, gte, count } from "drizzle-orm";
import { AppointmentList } from "@/components/dashboard/AppointmentList";
import type { AptItem } from "@/components/dashboard/AppointmentList";
import { CalendarDays, Users, TrendingUp, ExternalLink, AlertTriangle } from "lucide-react";
import Link from "next/link";

function today() {
  return new Date().toISOString().split("T")[0];
}

export default async function OverviewPage() {
  const biz = await getBusiness();
  const todayStr = today();

  // Verificar si el negocio tiene profesionales activos
  const [prosRow] = await db
    .select({ n: count() })
    .from(professionals)
    .where(and(eq(professionals.businessId, biz.id), eq(professionals.isActive, true)));
  const hasTeam = (prosRow?.n ?? 0) > 0;

  // Citas de hoy con joins
  const todayApts = await db.query.appointments.findMany({
    where: and(eq(appointments.businessId, biz.id), eq(appointments.date, todayStr)),
    with:  { service: true, professional: true, client: true },
    orderBy: (t, { asc }) => [asc(t.startTime)],
  });

  // KPIs
  const completedToday = todayApts.filter((a) => a.status === "completed");
  const revenueToday   = completedToday.reduce((s, a) => s + Number(a.pricePaid ?? a.service?.price ?? 0), 0);

  // Clientes nuevos este mes
  const firstOfMonth = new Date();
  firstOfMonth.setDate(1);
  firstOfMonth.setHours(0, 0, 0, 0);
  const [newClientsRow] = await db
    .select({ value: count() })
    .from(clients)
    .where(and(eq(clients.businessId, biz.id), gte(clients.createdAt, firstOfMonth)));
  const newClientsMonth = newClientsRow?.value ?? 0;

  const bookingUrl = `https://www.agendame.mx/book/${biz.slug}`;

  const apts = todayApts.map((a) => ({
    id:            a.id,
    startTime:     a.startTime,
    endTime:       a.endTime,
    status:        a.status,
    pricePaid:     a.pricePaid,
    paymentStatus: a.paymentStatus,
    paymentMethod: a.paymentMethod ?? null,
    notes:         a.notes,
    service:       a.service ? { name: a.service.name, price: a.service.price } : null,
    professional:  a.professional ? { name: a.professional.name } : null,
    client:        a.client ? { name: a.client.name, phone: a.client.phone } : null,
  })) satisfies AptItem[];

  return (
    <div className="dash-page">
      {/* Header */}
      <div className="dash-page-header">
        <div>
          <p className="dash-page-eyebrow">Agenda</p>
          <h1 className="dash-page-title">Hoy · {new Date().toLocaleDateString("es-MX", { weekday: "long", day: "numeric", month: "long" })}</h1>
        </div>
        <a href={bookingUrl} target="_blank" rel="noopener noreferrer" className="dash-btn-secondary">
          <ExternalLink size={15} /> Ver mi página
        </a>
      </div>

      {/* Banner: sin equipo → booking no funciona */}
      {!hasTeam && (
        <Link href="/settings" className="dash-alert-banner">
          <AlertTriangle size={18} style={{ flexShrink: 0 }} />
          <div>
            <strong>Tu página de reservas no está lista.</strong>
            <span> Agrégate como profesional en Ajustes para que tus clientes puedan agendar.</span>
          </div>
          <span className="dash-alert-cta">Ir a Ajustes →</span>
        </Link>
      )}

      {/* KPIs */}
      <div className="dash-kpi-grid">
        <div className="dash-kpi-card">
          <div className="dash-kpi-icon" style={{ background: "#6E2A9618" }}>
            <CalendarDays size={20} style={{ color: "#6E2A96" }} />
          </div>
          <div>
            <p className="dash-kpi-val">{todayApts.length}</p>
            <p className="dash-kpi-label">Citas hoy</p>
          </div>
        </div>
        <div className="dash-kpi-card">
          <div className="dash-kpi-icon" style={{ background: "#3E7C7418" }}>
            <TrendingUp size={20} style={{ color: "#3E7C74" }} />
          </div>
          <div>
            <p className="dash-kpi-val">${revenueToday.toLocaleString("es-MX")}</p>
            <p className="dash-kpi-label">Ingresos del día</p>
          </div>
        </div>
        <div className="dash-kpi-card">
          <div className="dash-kpi-icon" style={{ background: "#E8631F18" }}>
            <Users size={20} style={{ color: "#E8631F" }} />
          </div>
          <div>
            <p className="dash-kpi-val">{newClientsMonth}</p>
            <p className="dash-kpi-label">Nuevas clientas este mes</p>
          </div>
        </div>
      </div>

      {/* Citas */}
      <div className="dash-section">
        <div className="svc-header">
          <h2 className="dash-section-title">Citas de hoy</h2>
          <span className="dash-pill">
            {completedToday.length}/{todayApts.length} completadas
          </span>
        </div>
        <AppointmentList appointments={apts} />
      </div>

      {/* Link de reservas */}
      <div className="dash-booking-link-card">
        <p className="dash-booking-link-label">Tu link de reservas</p>
        <a href={bookingUrl} target="_blank" rel="noopener noreferrer" className="dash-booking-url">
          agendame.mx/book/{biz.slug}
        </a>
      </div>
    </div>
  );
}
