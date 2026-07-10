"use client";

import { useState, useEffect, useCallback } from "react";
import { ChevronLeft, ChevronRight, Loader2, TrendingUp, CreditCard, Users, Calendar } from "lucide-react";
import { formatTime } from "@/lib/time";

interface AptItem {
  id:              string;
  date:            string;
  startTime:       string;
  status:          string;
  pricePaid:       string | null;
  commissionAmount:string | null;
  paymentMethod:   string | null;
  paymentStatus:   string;
  service:         { name: string; price: string } | null;
  professional:    { name: string } | null;
  client:          { name: string; phone: string } | null;
}

const STATUS_LABELS: Record<string, string> = {
  pending:   "Pendiente",
  confirmed: "Confirmada",
  completed: "Completada",
  cancelled: "Cancelada",
  no_show:   "No asistió",
};
const PAY_LABELS: Record<string, string> = {
  cash:     "Efectivo",
  card:     "Tarjeta",
  transfer: "Transferencia",
};

function toISO(d: Date) {
  return d.toISOString().split("T")[0];
}
function fmtDate(iso: string) {
  const d = new Date(iso + "T12:00:00");
  return d.toLocaleDateString("es-MX", { weekday: "long", day: "numeric", month: "long" });
}

export function DailyReport() {
  const [date,    setDate]    = useState(() => toISO(new Date()));
  const [apts,    setApts]    = useState<AptItem[]>([]);
  const [loading, setLoading] = useState(true);

  const load = useCallback(async (d: string) => {
    setLoading(true);
    const res = await fetch(`/api/appointments?date=${d}`);
    const data = await res.json();
    setApts(Array.isArray(data) ? data : []);
    setLoading(false);
  }, []);

  useEffect(() => { load(date); }, [date, load]);

  function prevDay() { const d = new Date(date + "T12:00:00"); d.setDate(d.getDate() - 1); setDate(toISO(d)); }
  function nextDay() { const d = new Date(date + "T12:00:00"); d.setDate(d.getDate() + 1); setDate(toISO(d)); }

  const completed  = apts.filter((a) => a.status === "completed");
  const revenue    = completed.reduce((s, a) => s + Number(a.pricePaid ?? a.service?.price ?? 0), 0);
  const commission = completed.reduce((s, a) => s + Number(a.commissionAmount ?? 0), 0);
  const net        = revenue - commission;

  // Desglose por profesional
  const byPro = Object.values(
    completed.reduce<Record<string, { name: string; count: number; revenue: number; commission: number }>>((acc, a) => {
      const name = a.professional?.name ?? "Sin asignar";
      if (!acc[name]) acc[name] = { name, count: 0, revenue: 0, commission: 0 };
      acc[name].count++;
      acc[name].revenue    += Number(a.pricePaid ?? a.service?.price ?? 0);
      acc[name].commission += Number(a.commissionAmount ?? 0);
      return acc;
    }, {})
  );

  return (
    <div>
      {/* Date nav */}
      <div className="rpt-date-nav">
        <button type="button" onClick={prevDay} className="cal-nav-btn"><ChevronLeft size={16} /></button>
        <div style={{ textAlign: "center" }}>
          <input
            type="date"
            value={date}
            onChange={(e) => setDate(e.target.value)}
            className="rpt-date-input"
          />
          <p className="rpt-date-label">{fmtDate(date)}</p>
        </div>
        <button type="button" onClick={nextDay} className="cal-nav-btn"><ChevronRight size={16} /></button>
      </div>

      {loading ? (
        <div className="bk-slots-loading" style={{ justifyContent: "center", padding: "2rem" }}>
          <Loader2 size={20} className="spin" /> Cargando…
        </div>
      ) : (
        <>
          {/* KPI cards */}
          <div className="rpt-kpi-grid">
            <div className="rpt-kpi">
              <div className="rpt-kpi-icon" style={{ background: "#6E2A9620" }}><Calendar size={18} style={{ color: "#6E2A96" }} /></div>
              <div>
                <p className="rpt-kpi-val">{apts.length}</p>
                <p className="rpt-kpi-label">Total citas</p>
              </div>
            </div>
            <div className="rpt-kpi">
              <div className="rpt-kpi-icon" style={{ background: "#3E7C7420" }}><TrendingUp size={18} style={{ color: "#3E7C74" }} /></div>
              <div>
                <p className="rpt-kpi-val">${revenue.toLocaleString("es-MX")}</p>
                <p className="rpt-kpi-label">Ingresos brutos</p>
              </div>
            </div>
            <div className="rpt-kpi">
              <div className="rpt-kpi-icon" style={{ background: "#E8631F20" }}><CreditCard size={18} style={{ color: "#E8631F" }} /></div>
              <div>
                <p className="rpt-kpi-val">${commission.toLocaleString("es-MX")}</p>
                <p className="rpt-kpi-label">Comisiones</p>
              </div>
            </div>
            <div className="rpt-kpi" style={{ background: "#6E2A96", color: "#fff" }}>
              <div className="rpt-kpi-icon" style={{ background: "rgba(255,255,255,.15)" }}><Users size={18} style={{ color: "#fff" }} /></div>
              <div>
                <p className="rpt-kpi-val" style={{ color: "#fff" }}>${net.toLocaleString("es-MX")}</p>
                <p className="rpt-kpi-label" style={{ color: "rgba(255,255,255,.75)" }}>Ingreso neto</p>
              </div>
            </div>
          </div>

          {/* Desglose por profesional */}
          {byPro.length > 0 && (
            <div className="rpt-section">
              <h3 className="rpt-section-title">Por profesional</h3>
              <div className="rpt-pro-list">
                {byPro.map((p) => (
                  <div key={p.name} className="rpt-pro-row">
                    <div className="bk-pro-avatar" style={{ width: 32, height: 32, fontSize: ".8rem", background: "#6E2A96" }}>
                      {p.name.charAt(0).toUpperCase()}
                    </div>
                    <span className="rpt-pro-name">{p.name}</span>
                    <span className="rpt-pro-count">{p.count} cita{p.count !== 1 ? "s" : ""}</span>
                    <span className="rpt-pro-rev">${p.revenue.toLocaleString("es-MX")}</span>
                    <span className="rpt-pro-comm">-${p.commission.toLocaleString("es-MX")}</span>
                    <span className="rpt-pro-net">${(p.revenue - p.commission).toLocaleString("es-MX")}</span>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Appointment table */}
          <div className="rpt-section">
            <h3 className="rpt-section-title">Citas del día</h3>
            {apts.length === 0 ? (
              <div className="apt-empty"><p>Sin citas para este día</p></div>
            ) : (
              <div className="rpt-apt-list">
                {apts.map((a) => (
                  <div key={a.id} className="rpt-apt-row">
                    <span className="rpt-apt-time">{formatTime(a.startTime)}</span>
                    <div className="rpt-apt-info">
                      <span className="rpt-apt-client">{a.client?.name ?? "—"}</span>
                      <span className="rpt-apt-svc">{a.service?.name ?? "—"} · {a.professional?.name ?? "—"}</span>
                    </div>
                    <div style={{ textAlign: "right", flexShrink: 0 }}>
                      <p className="rpt-apt-price">${Number(a.pricePaid ?? a.service?.price ?? 0).toLocaleString("es-MX")}</p>
                      {a.paymentMethod && (
                        <p className="rpt-apt-pay">{PAY_LABELS[a.paymentMethod] ?? a.paymentMethod}</p>
                      )}
                    </div>
                    <span className={`apt-badge apt-badge--${a.status}`} style={{ minWidth: 80, textAlign: "center" }}>
                      {STATUS_LABELS[a.status] ?? a.status}
                    </span>
                  </div>
                ))}
              </div>
            )}
          </div>
        </>
      )}
    </div>
  );
}
