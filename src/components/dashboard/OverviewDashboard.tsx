"use client";

import { useEffect, useMemo, useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import {
  Bell,
  CalendarClock,
  Camera,
  Check,
  CreditCard,
  Loader2,
  Star,
  TrendingDown,
  TrendingUp,
  X,
} from "lucide-react";
import { formatTime, timeToMinutes } from "@/lib/time";
import { ReferenceImageModal } from "@/components/dashboard/ReferenceImageModal";
import { CompletePaymentModal } from "@/components/dashboard/CompletePaymentModal";

interface AppointmentItem {
  id: string;
  date: string;
  startTime: string;
  endTime: string;
  status: string;
  pricePaid: string | null;
  paymentStatus: string | null;
  paymentMethod: string | null;
  notes: string | null;
  createdAt: string | null;
  service: { name: string; price: string } | null;
  professional: { id: string; name: string } | null;
  client: { name: string; phone: string | null; isPreferred: boolean } | null;
  latestReferenceImageUrl: string | null;
}

interface NotificationItem {
  id: string;
  kind: "booking" | "moved" | "cancelled";
  createdAt: string;
  appointmentId: string;
  appointmentDate: string;
  startTime: string;
  clientName: string;
  professionalName: string;
  serviceName: string;
  isPreferred: boolean;
  reason?: string;
}

interface TopServiceItem {
  id: string;
  name: string;
  total: number;
}

interface OverviewDashboardProps {
  businessName: string;
  newClientsMonth: number;
  todayAppointments: AppointmentItem[];
  notifications: NotificationItem[];
  notificationSeenAt: string | null;
  dailyCapacityMinutes: number;
  previousWeekRevenue: number;
  topServices: TopServiceItem[];
}

function formatNotificationDate(iso: string) {
  return new Date(`${iso}T12:00:00`).toLocaleDateString("es-MX", {
    day: "2-digit",
    month: "short",
  });
}

function formatNotificationCopy(item: NotificationItem) {
  if (item.kind === "cancelled") return `${item.clientName} canceló ${item.serviceName}`;
  if (item.kind === "moved") return `${item.clientName} movió ${item.serviceName}`;
  return `${item.clientName} agendó ${item.serviceName}`;
}

function formatNotificationSection(item: NotificationItem) {
  if (item.kind === "cancelled") return "Cancelaciones";
  if (item.kind === "moved") return "Cambios de cita";
  return "Reservas";
}

function nowMinutesInMexico() {
  const parts = new Intl.DateTimeFormat("en-GB", {
    timeZone: "America/Mexico_City",
    hour: "2-digit",
    minute: "2-digit",
    hour12: false,
  }).formatToParts(new Date());

  const hour = Number(parts.find((part) => part.type === "hour")?.value ?? "0");
  const minute = Number(parts.find((part) => part.type === "minute")?.value ?? "0");
  return (hour * 60) + minute;
}

function formatHours(minutes: number) {
  const hours = minutes / 60;
  return Number.isInteger(hours) ? `${hours}h` : `${hours.toFixed(1)}h`;
}

function PreferredMark({ active }: { active: boolean | undefined }) {
  if (!active) return null;
  return <Star size={13} fill="currentColor" className="ov-preferred-star" />;
}

function ServiceBars({ services }: { services: TopServiceItem[] }) {
  const max = services[0]?.total ?? 1;

  if (services.length === 0) {
    return <p className="ov-empty">Aún no hay suficientes citas para calcular servicios más pedidos.</p>;
  }

  return (
    <div className="ov-service-list">
      {services.map((service) => (
        <div key={service.id} className="ov-service-row">
          <span className="ov-service-name">{service.name}</span>
          <div className="ov-service-bar-track">
            <div className="ov-service-bar-fill" style={{ width: `${(service.total / max) * 100}%` }} />
          </div>
          <span className="ov-service-total">{service.total}</span>
        </div>
      ))}
    </div>
  );
}

interface AppointmentStackProps {
  title: string;
  subtitle?: string;
  appointments: AppointmentItem[];
  empty: string;
  actionLabel: string;
  onOpenPhoto: (appointment: AppointmentItem) => void;
  onOpenPayment: (appointment: AppointmentItem) => void;
}

function AppointmentStack({
  title,
  subtitle,
  appointments,
  empty,
  actionLabel,
  onOpenPhoto,
  onOpenPayment,
}: AppointmentStackProps) {
  return (
    <section className="ov-panel">
      <div className="ov-panel-head ov-panel-head--tight">
        <div className={!subtitle ? "ov-panel-head-copy ov-panel-head-copy--compact" : "ov-panel-head-copy"}>
          <h3>{title}</h3>
          {subtitle ? <p className="ov-panel-sub">{subtitle}</p> : null}
        </div>
        <span>{appointments.length}</span>
      </div>
      {appointments.length === 0 ? (
        <p className="ov-empty">{empty}</p>
      ) : (
        <div className="ov-spotlight-list">
          {appointments.map((appointment) => (
            <article key={appointment.id} className="ov-spotlight-row">
              <div className="ov-avatar">
                {(appointment.client?.name ?? "?").slice(0, 2).toUpperCase()}
              </div>
              <div className="ov-spotlight-copy">
                <div className="ov-spotlight-title">
                  <strong>{appointment.client?.name ?? "Sin nombre"}</strong>
                  <PreferredMark active={appointment.client?.isPreferred} />
                  {appointment.latestReferenceImageUrl && (
                    <button
                      type="button"
                      className="ov-photo-trigger"
                      onClick={() => onOpenPhoto(appointment)}
                      title="Ver foto de referencia"
                    >
                      <Camera size={14} />
                    </button>
                  )}
                </div>
                <span>
                  {formatTime(appointment.startTime)} · {appointment.service?.name ?? "Servicio"} · {appointment.professional?.name ?? "Sin asignar"}
                </span>
              </div>
              <div className="ov-spotlight-side">
                <span className="ov-check-price">${Number(appointment.pricePaid ?? appointment.service?.price ?? 0).toLocaleString("es-MX")}</span>
                {(appointment.status === "pending" || appointment.status === "confirmed") ? (
                  <button
                    type="button"
                    className="ov-pay-btn"
                    onClick={() => onOpenPayment(appointment)}
                  >
                    {actionLabel}
                  </button>
                ) : (
                  <span className="ov-paid-badge">Pagada</span>
                )}
              </div>
            </article>
          ))}
        </div>
      )}
    </section>
  );
}

export function OverviewDashboard({
  businessName,
  newClientsMonth,
  todayAppointments,
  notifications,
  notificationSeenAt,
  dailyCapacityMinutes,
  previousWeekRevenue,
  topServices,
}: OverviewDashboardProps) {
  const router = useRouter();
  const [notificationsOpen, setNotificationsOpen] = useState(false);
  const [lastSeenAt, setLastSeenAt] = useState<string | null>(notificationSeenAt);
  const [referenceImageOpen, setReferenceImageOpen] = useState<{ url: string; title: string } | null>(null);
  const [completingAppointment, setCompletingAppointment] = useState<AppointmentItem | null>(null);
  const [, startTransition] = useTransition();

  const activeToday = useMemo(
    () => todayAppointments.filter((appointment) => appointment.status !== "cancelled" && appointment.status !== "no_show"),
    [todayAppointments],
  );
  const cancelledToday = useMemo(
    () => todayAppointments.filter((appointment) => appointment.status === "cancelled").length,
    [todayAppointments],
  );
  const completedToday = useMemo(
    () => activeToday.filter((appointment) => appointment.status === "completed"),
    [activeToday],
  );
  const nowMinutes = nowMinutesInMexico();

  const currentAppointments = useMemo(
    () => activeToday.filter((appointment) => {
      const start = timeToMinutes(appointment.startTime);
      const end = timeToMinutes(appointment.endTime);
      return appointment.status !== "completed" && start <= nowMinutes && end > nowMinutes;
    }),
    [activeToday, nowMinutes],
  );

  const nextAppointments = useMemo(
    () => activeToday
      .filter((appointment) => {
        const start = timeToMinutes(appointment.startTime);
        return appointment.status !== "completed" && start > nowMinutes;
      })
      .sort((a, b) => a.startTime.localeCompare(b.startTime)),
    [activeToday, nowMinutes],
  );

  const currentSpotlight = currentAppointments.slice(0, 2);
  const nextSpotlight = nextAppointments.slice(0, 2);
  const currentOverflow = Math.max(0, currentAppointments.length - currentSpotlight.length);
  const nextOverflow = Math.max(0, nextAppointments.length - nextSpotlight.length);

  const confirmedIncome = completedToday.reduce(
    (sum, appointment) => sum + Number(appointment.pricePaid ?? appointment.service?.price ?? 0),
    0,
  );
  const ticketAverage = completedToday.length > 0 ? confirmedIncome / completedToday.length : 0;
  const occupancyMinutes = activeToday.reduce(
    (sum, appointment) => sum + Math.max(0, timeToMinutes(appointment.endTime) - timeToMinutes(appointment.startTime)),
    0,
  );
  const occupancyRate = dailyCapacityMinutes > 0 ? Math.min(100, Math.round((occupancyMinutes / dailyCapacityMinutes) * 100)) : 0;
  const revenueDelta = previousWeekRevenue > 0
    ? ((confirmedIncome - previousWeekRevenue) / previousWeekRevenue) * 100
    : null;
  const cancellationRate = todayAppointments.length > 0 ? Math.round((cancelledToday / todayAppointments.length) * 100) : 0;
  const unreadNotifications = useMemo(() => {
    if (!lastSeenAt) return notifications;
    const seenAtMs = new Date(lastSeenAt).getTime();
    return notifications.filter((item) => new Date(item.createdAt).getTime() > seenAtMs);
  }, [lastSeenAt, notifications]);
  const notificationHistory = useMemo(() => {
    if (!lastSeenAt) return [];
    const seenAtMs = new Date(lastSeenAt).getTime();
    return notifications.filter((item) => new Date(item.createdAt).getTime() <= seenAtMs);
  }, [lastSeenAt, notifications]);

  useEffect(() => {
    if (!notificationsOpen) return undefined;

    function handleEscape(event: KeyboardEvent) {
      if (event.key === "Escape") setNotificationsOpen(false);
    }

    window.addEventListener("keydown", handleEscape);
    return () => window.removeEventListener("keydown", handleEscape);
  }, [notificationsOpen]);

  async function openNotifications() {
    setNotificationsOpen(true);
    if (unreadNotifications.length === 0) return;

    const seenAt = new Date().toISOString();
    setLastSeenAt(seenAt);

    try {
      const res = await fetch("/api/dashboard/notifications/seen", { method: "POST" });
      if (!res.ok) throw new Error("No se pudo marcar como visto");
      const data = await res.json();
      if (typeof data.seenAt === "string") setLastSeenAt(data.seenAt);
    } catch {
      setLastSeenAt(notificationSeenAt);
    }
  }

  function openPhoto(appointment: AppointmentItem) {
    if (!appointment.latestReferenceImageUrl) return;
    setReferenceImageOpen({
      url: appointment.latestReferenceImageUrl,
      title: `Referencia de ${appointment.client?.name ?? "clienta"}`,
    });
  }

  return (
    <section className="ov-root">
      {completingAppointment && (
        <CompletePaymentModal
          appointmentId={completingAppointment.id}
          defaultAmount={completingAppointment.pricePaid ?? completingAppointment.service?.price ?? "0"}
          onClose={() => setCompletingAppointment(null)}
          onSuccess={() => startTransition(() => router.refresh())}
        />
      )}

      <div className="ov-hero">
        <div className="ov-hero-copy">
          <h2 className="ov-title">Hola, {businessName}</h2>
          <p className="ov-subtitle">
            {new Date().toLocaleDateString("es-MX", { weekday: "long", day: "numeric", month: "long" })}
          </p>
        </div>
        <button
          type="button"
          className="ov-notify-pill ov-icon-button"
          onClick={openNotifications}
          title="Ver notificaciones"
        >
          <Bell size={14} />
          <span>{unreadNotifications.length}</span>
        </button>
      </div>

      <div className="ov-top-grid">
        <section className="ov-income-card">
          <div className="ov-income-copy">
            <span className="ov-kpi-label ov-kpi-label--light">Ingresos de hoy</span>
            <strong>${confirmedIncome.toLocaleString("es-MX")}</strong>
            {revenueDelta === null ? (
              <p>Sin base comparable de la semana pasada.</p>
            ) : (
              <div className={`ov-trend-chip ${revenueDelta >= 0 ? "ov-trend-chip--up" : "ov-trend-chip--down"}`}>
                {revenueDelta >= 0 ? <TrendingUp size={13} /> : <TrendingDown size={13} />}
                <span>{`${revenueDelta >= 0 ? "+" : ""}${Math.round(revenueDelta)}% vs. semana pasada`}</span>
              </div>
            )}
          </div>
          <button
            type="button"
            className="ov-income-icon ov-icon-button"
            onClick={() => router.push("/reports")}
            title="Ir a reportes"
          >
            <CreditCard size={20} />
          </button>
        </section>

        <section className="ov-panel ov-occupancy-card">
          <div className="ov-panel-head ov-panel-head--tight">
            <div>
              <h3>Ocupación del día</h3>
              <p className="ov-panel-sub">Capacidad real con base en horario y citas agendadas.</p>
            </div>
          </div>
          <div className="ov-occupancy-body">
            <div
              className="ov-occupancy-ring"
              style={{ "--ov-progress": `${occupancyRate}%` } as React.CSSProperties}
            >
              <div className="ov-occupancy-ring-inner">
                <strong>{occupancyRate}%</strong>
              </div>
            </div>
            <div className="ov-occupancy-copy">
              <strong>{formatHours(occupancyMinutes)} ocupadas de {formatHours(dailyCapacityMinutes)} disponibles</strong>
              <span>
                {dailyCapacityMinutes > occupancyMinutes
                  ? `Quedan ${formatHours(dailyCapacityMinutes - occupancyMinutes)} libres hoy.`
                  : "El día ya está completamente ocupado."}
              </span>
              <div className="ov-occupancy-bar">
                <div className="ov-occupancy-bar-fill" style={{ width: `${occupancyRate}%` }} />
              </div>
            </div>
          </div>
        </section>
      </div>

      <div className="ov-kpi-grid ov-kpi-grid--four">
        <article className="ov-kpi-card">
          <span className="ov-kpi-label">Citas hoy</span>
          <strong className="ov-kpi-value">{activeToday.length}</strong>
          <p className="ov-kpi-sub">Activas para hoy</p>
        </article>
        <article className="ov-kpi-card">
          <span className="ov-kpi-label">Nuevos clientes</span>
          <strong className="ov-kpi-value">{newClientsMonth}</strong>
          <p className="ov-kpi-sub">Este mes</p>
        </article>
        <article className="ov-kpi-card">
          <span className="ov-kpi-label">Ticket promedio</span>
          <strong className="ov-kpi-value">${Math.round(ticketAverage).toLocaleString("es-MX")}</strong>
          <p className="ov-kpi-sub">{completedToday.length} cobradas hoy</p>
        </article>
        <article className="ov-kpi-card">
          <span className="ov-kpi-label">Cancelación</span>
          <strong className="ov-kpi-value">{cancelledToday}</strong>
          <p className="ov-kpi-sub">{cancellationRate}% del total del día</p>
        </article>
      </div>

      <div className="ov-spotlight-grid">
        <div>
          <AppointmentStack
            title="Atendiendo"
            appointments={currentSpotlight}
            empty="Sin citas en curso ahora mismo."
            actionLabel="Cobrar"
            onOpenPhoto={openPhoto}
            onOpenPayment={setCompletingAppointment}
          />
          {currentOverflow > 0 && <p className="ov-overflow-note">+{currentOverflow} cita(s) más en curso.</p>}
        </div>
        <div>
          <AppointmentStack
            title="Próxima cita"
            appointments={nextSpotlight}
            empty="No hay más citas programadas hoy."
            actionLabel="Cobrar"
            onOpenPhoto={openPhoto}
            onOpenPayment={setCompletingAppointment}
          />
          {nextOverflow > 0 && <p className="ov-overflow-note">+{nextOverflow} cita(s) más en cola.</p>}
        </div>
      </div>

      <div className="ov-bottom-grid">
        <section className="ov-panel">
          <div className="ov-panel-head">
            <div>
              <h3>Servicios más pedidos</h3>
              <p className="ov-panel-sub">Top 3 del mes actual.</p>
            </div>
          </div>
          <ServiceBars services={topServices} />
        </section>
      </div>

      {notificationsOpen && (
        <div className="apt-modal-backdrop" onClick={() => setNotificationsOpen(false)}>
          <div className="ov-notifications-modal" onClick={(event) => event.stopPropagation()}>
            <div className="ov-modal-head">
              <div>
                <h3>Notificaciones</h3>
                <p>{unreadNotifications.length} acción(es) nueva(s) · {notificationHistory.length} en historial.</p>
              </div>
              <button
                type="button"
                className="ov-modal-close ov-icon-button"
                onClick={() => setNotificationsOpen(false)}
                title="Cerrar"
              >
                <X size={16} />
              </button>
            </div>
            {notifications.length === 0 ? (
              <p className="ov-empty">No hay citas nuevas registradas aún.</p>
            ) : (
              <>
                {unreadNotifications.length > 0 && (
                  <div className="ov-notification-group">
                    <div className="ov-panel-head ov-panel-head--tight">
                      <div>
                        <h3>Nuevas</h3>
                        <p className="ov-panel-sub">Acciones no vistas todavía.</p>
                      </div>
                      <span>{unreadNotifications.length}</span>
                    </div>
                    <div className="ov-notice-list">
                      {unreadNotifications.map((item) => (
                        <article key={item.id} className="ov-notice-row ov-notice-row--fresh">
                          <div className="ov-notice-dot" />
                          <div className="ov-notice-copy">
                            <strong style={{ display: "inline-flex", alignItems: "center", gap: "6px", flexWrap: "wrap" }}>
                              <span>{formatNotificationCopy(item)}</span>
                              <PreferredMark active={item.isPreferred} />
                            </strong>
                            <span>{formatNotificationDate(item.appointmentDate)} · {formatTime(item.startTime)} · {item.professionalName}</span>
                            <span className="ov-notice-meta">{formatNotificationSection(item)}{item.reason ? ` · ${item.reason}` : ""}</span>
                          </div>
                        </article>
                      ))}
                    </div>
                  </div>
                )}
                {notificationHistory.length > 0 && (
                  <div className="ov-notification-group">
                    <div className="ov-panel-head ov-panel-head--tight">
                      <div>
                        <h3>Historial</h3>
                        <p className="ov-panel-sub">Acciones ya revisadas.</p>
                      </div>
                      <span>{notificationHistory.length}</span>
                    </div>
                    <div className="ov-notice-list">
                      {notificationHistory.map((item) => (
                        <article key={item.id} className="ov-notice-row">
                          <div className="ov-notice-dot" />
                          <div className="ov-notice-copy">
                            <strong style={{ display: "inline-flex", alignItems: "center", gap: "6px", flexWrap: "wrap" }}>
                              <span>{formatNotificationCopy(item)}</span>
                              <PreferredMark active={item.isPreferred} />
                            </strong>
                            <span>{formatNotificationDate(item.appointmentDate)} · {formatTime(item.startTime)} · {item.professionalName}</span>
                            <span className="ov-notice-meta">{formatNotificationSection(item)}{item.reason ? ` · ${item.reason}` : ""}</span>
                          </div>
                        </article>
                      ))}
                    </div>
                  </div>
                )}
              </>
            )}
          </div>
        </div>
      )}
      {referenceImageOpen && (
        <ReferenceImageModal
          imageUrl={referenceImageOpen.url}
          title={referenceImageOpen.title}
          onClose={() => setReferenceImageOpen(null)}
        />
      )}
    </section>
  );
}
