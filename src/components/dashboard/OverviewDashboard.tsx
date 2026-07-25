"use client";

import { useEffect, useMemo, useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import {
  Bell,
  Check,
  CreditCard,
  ExternalLink,
  Image,
  Loader2,
  Users,
  X,
} from "lucide-react";
import { formatTime } from "@/lib/time";
import { ReferenceImageModal } from "@/components/dashboard/ReferenceImageModal";

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
  client: { name: string; phone: string | null } | null;
  latestReferenceImageUrl: string | null;
}

interface OverviewDashboardProps {
  businessName: string;
  bookingUrl: string;
  newClientsMonth: number;
  todayAppointments: AppointmentItem[];
  recentAppointments: AppointmentItem[];
}

function formatNotificationDate(iso: string) {
  return new Date(`${iso}T12:00:00`).toLocaleDateString("es-MX", {
    day: "2-digit",
    month: "short",
  });
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

export function OverviewDashboard({
  businessName,
  bookingUrl,
  newClientsMonth,
  todayAppointments,
  recentAppointments,
}: OverviewDashboardProps) {
  const router = useRouter();
  const [checkingId, setCheckingId] = useState<string | null>(null);
  const [notificationsOpen, setNotificationsOpen] = useState(false);
  const [referenceImageOpen, setReferenceImageOpen] = useState<{ url: string; title: string } | null>(null);
  const [, startTransition] = useTransition();

  const activeToday = useMemo(
    () => todayAppointments.filter((appointment) => appointment.status !== "cancelled" && appointment.status !== "no_show"),
    [todayAppointments],
  );

  const pendingToday = useMemo(
    () => activeToday.filter((appointment) => appointment.status === "pending"),
    [activeToday],
  );

  const completedToday = useMemo(
    () => activeToday.filter((appointment) => appointment.status === "completed"),
    [activeToday],
  );

  const nowMinutes = nowMinutesInMexico();
  const currentAppointment = activeToday.find((appointment) => {
    const start = Number(appointment.startTime.slice(0, 2)) * 60 + Number(appointment.startTime.slice(3, 5));
    const end = Number(appointment.endTime.slice(0, 2)) * 60 + Number(appointment.endTime.slice(3, 5));
    return appointment.status !== "completed" && start <= nowMinutes && end > nowMinutes;
  }) ?? null;

  const nextAppointments = activeToday
    .filter((appointment) => {
      const start = Number(appointment.startTime.slice(0, 2)) * 60 + Number(appointment.startTime.slice(3, 5));
      return appointment.status !== "completed" && start > nowMinutes;
    })
    .sort((a, b) => a.startTime.localeCompare(b.startTime));

  const nextAppointment = nextAppointments[0] ?? null;

  const confirmedIncome = completedToday.reduce(
    (sum, appointment) => sum + Number(appointment.pricePaid ?? appointment.service?.price ?? 0),
    0,
  );

  const notifications = useMemo(() => recentAppointments.slice(0, 5), [recentAppointments]);

  useEffect(() => {
    if (!notificationsOpen) return undefined;

    function handleEscape(event: KeyboardEvent) {
      if (event.key === "Escape") setNotificationsOpen(false);
    }

    window.addEventListener("keydown", handleEscape);
    return () => window.removeEventListener("keydown", handleEscape);
  }, [notificationsOpen]);
  async function markArrived(id: string) {
    setCheckingId(id);
    try {
      await fetch(`/api/appointments/${id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ status: "completed" }),
      });
      startTransition(() => router.refresh());
    } finally {
      setCheckingId(null);
    }
  }

  function AppointmentHighlight({
    label,
    appointment,
    empty,
  }: {
    label: string;
    appointment: AppointmentItem | null;
    empty: string;
  }) {
    return (
      <article className="ov-kpi-card ov-kpi-card--wide">
        <span className="ov-kpi-label">{label}</span>
        {appointment ? (
          <div className="ov-kpi-inline-wrap">
            <strong className="ov-kpi-inline">{`${appointment.client?.name ?? "—"} · ${formatTime(appointment.startTime)}`}</strong>
            {appointment.latestReferenceImageUrl && (
              <button
                type="button"
                className="ov-photo-trigger"
                onClick={() => setReferenceImageOpen({
                  url: appointment.latestReferenceImageUrl!,
                  title: `Referencia de ${appointment.client?.name ?? "clienta"}`,
                })}
                title="Ver imagen de referencia"
              >
                <Image size={14} />
              </button>
            )}
          </div>
        ) : (
          <strong className="ov-kpi-inline">{empty}</strong>
        )}
      </article>
    );
  }

  return (
    <section className="ov-root">
      <div className="ov-hero">
        <div className="ov-hero-copy">
          <h2 className="ov-title">Hola, {businessName}</h2>
          <p className="ov-subtitle">
            {new Date().toLocaleDateString("es-MX", { weekday: "long", day: "numeric", month: "long" })}
          </p>
        </div>
        <div style={{ display: "flex", alignItems: "center", gap: "8px" }}>
          <a
            href={bookingUrl}
            target="_blank"
            rel="noopener noreferrer"
            className="dash-btn-secondary"
            style={{ fontSize: "13px" }}
          >
            <ExternalLink size={14} /> Ver mi página
          </a>
          <button
            type="button"
            className="ov-notify-pill ov-icon-button"
            onClick={() => setNotificationsOpen(true)}
            title="Ver notificaciones"
          >
            <Bell size={14} />
            <span>{notifications.length}</span>
          </button>
        </div>
      </div>

      <div className="ov-kpi-grid">
        <article className="ov-kpi-card">
          <span className="ov-kpi-label">Citas hoy</span>
          <strong className="ov-kpi-value">{activeToday.length}</strong>
        </article>
        <article className="ov-kpi-card">
          <span className="ov-kpi-label">Por confirmar</span>
          <strong className="ov-kpi-value">{pendingToday.length}</strong>
        </article>
        <article className="ov-kpi-card">
          <span className="ov-kpi-label">Nuevas clientas este mes</span>
          <strong className="ov-kpi-value" style={{ display: "flex", alignItems: "center", gap: "6px" }}>
            <Users size={16} style={{ opacity: 0.6 }} />{newClientsMonth}
          </strong>
        </article>
        <AppointmentHighlight label="Cliente actual" appointment={currentAppointment} empty="Sin cita en curso" />
        <AppointmentHighlight label="Próxima cita" appointment={nextAppointment} empty="No hay más citas hoy" />
      </div>

      <div className="ov-grid">
        <section className="ov-panel">
          <div className="ov-panel-head">
            <h3>Por confirmar</h3>
            <span>{pendingToday.length}</span>
          </div>
          {pendingToday.length === 0 ? (
            <p className="ov-empty">No hay clientas pendientes por confirmar hoy.</p>
          ) : (
            <div className="ov-check-list">
              {pendingToday.map((appointment) => (
                <article key={appointment.id} className="ov-check-row">
                  <div className="ov-avatar">
                    {(appointment.client?.name ?? "?").slice(0, 2).toUpperCase()}
                  </div>
                  <div className="ov-check-copy">
                    <strong>{appointment.client?.name ?? "Sin nombre"}</strong>
                    <span>{appointment.service?.name ?? "Servicio"} · {formatTime(appointment.startTime)}</span>
                  </div>
                  <div className="ov-check-price">
                    ${Number(appointment.pricePaid ?? appointment.service?.price ?? 0).toLocaleString("es-MX")}
                    {appointment.paymentMethod && (
                      <span style={{ fontSize: "10px", opacity: 0.65, display: "block" }}>
                        {appointment.paymentMethod}
                      </span>
                    )}
                  </div>
                  <button
                    type="button"
                    className="ov-check-btn"
                    onClick={() => markArrived(appointment.id)}
                    disabled={checkingId === appointment.id}
                    title="Confirmar llegada"
                  >
                    {checkingId === appointment.id ? <Loader2 size={16} className="spin" /> : <Check size={16} />}
                  </button>
                </article>
              ))}
            </div>
          )}
        </section>

        <section className="ov-income-card">
          <div className="ov-income-copy">
            <span className="ov-kpi-label">Ingresos del día</span>
            <strong>$</strong>
            <p>{confirmedIncome.toLocaleString("es-MX")} confirmados hoy.</p>
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

        <section className="ov-panel">
          <div className="ov-panel-head">
            <h3>Notificaciones</h3>
            <button
              type="button"
              className="ov-panel-link"
              onClick={() => setNotificationsOpen(true)}
            >
              Ver todas
            </button>
          </div>
          {notifications.length === 0 ? (
            <p className="ov-empty">No hay citas nuevas registradas aún.</p>
          ) : (
            <div className="ov-notice-list">
              {notifications.map((appointment) => (
                <article key={appointment.id} className="ov-notice-row">
                  <div className="ov-notice-dot" />
                  <div className="ov-notice-copy">
                    <strong>{appointment.client?.name ?? "Cliente"} agendó {appointment.service?.name ?? "servicio"}</strong>
                    <span>{formatNotificationDate(appointment.date)} · {formatTime(appointment.startTime)} · {appointment.professional?.name ?? "Sin asignar"}</span>
                  </div>
                </article>
              ))}
            </div>
          )}
        </section>
      </div>

      {notificationsOpen && (
        <div className="apt-modal-backdrop" onClick={() => setNotificationsOpen(false)}>
          <div className="ov-notifications-modal" onClick={(event) => event.stopPropagation()}>
            <div className="ov-modal-head">
              <div>
                <h3>Notificaciones</h3>
                <p>Últimas 5 citas registradas.</p>
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
              <div className="ov-notice-list">
                {notifications.map((appointment) => (
                  <article key={appointment.id} className="ov-notice-row">
                    <div className="ov-notice-dot" />
                    <div className="ov-notice-copy">
                      <strong>{appointment.client?.name ?? "Cliente"} agendó {appointment.service?.name ?? "servicio"}</strong>
                      <span>{formatNotificationDate(appointment.date)} · {formatTime(appointment.startTime)} · {appointment.professional?.name ?? "Sin asignar"}</span>
                    </div>
                  </article>
                ))}
              </div>
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
