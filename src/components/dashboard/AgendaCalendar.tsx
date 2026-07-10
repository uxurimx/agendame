"use client";

import { useState, useEffect, useCallback, useRef } from "react";
import {
  ChevronLeft, ChevronRight, Plus, X, CheckCircle, XCircle,
  Clock, User, Scissors, Loader2, Ban, Calendar, CreditCard, RefreshCw,
} from "lucide-react";
import { formatTime, timeToMinutes, addMinutes } from "@/lib/time";

// ── Constants ──────────────────────────────────────────────────
const START_HOUR   = 7;
const END_HOUR     = 21;
const SLOT_H       = 52; // px por cada 30 min
const TOTAL_SLOTS  = (END_HOUR - START_HOUR) * 2;
const DAY_NAMES    = ["Lun", "Mar", "Mié", "Jue", "Vie", "Sáb", "Dom"];
const MONTH_SHORT  = ["Ene","Feb","Mar","Abr","May","Jun","Jul","Ago","Sep","Oct","Nov","Dic"];

const STATUS_COLOR: Record<string, string> = {
  pending:   "#E8631F",
  confirmed: "#6E2A96",
  completed: "#3E7C74",
  cancelled: "#9ca3af",
  no_show:   "#9ca3af",
};
const STATUS_LABEL: Record<string, string> = {
  pending:   "Pendiente",
  confirmed: "Confirmada",
  completed: "Completada",
  cancelled: "Cancelada",
  no_show:   "No asistió",
};
const PAY_LABELS: Record<string, string> = {
  cash: "Efectivo", card: "Tarjeta", transfer: "Transferencia",
};

// ── Types ──────────────────────────────────────────────────────
interface ProInfo { id: string; name: string; }
interface AptItem {
  id: string; date: string; startTime: string; endTime: string;
  status: string; pricePaid: string | null; paymentStatus: string;
  paymentMethod: string | null; notes: string | null;
  service:       { id: string; name: string; price: string; durationMin: number } | null;
  professional:  { id: string; name: string } | null;
  client:        { name: string; phone: string } | null;
}
interface BlockItem {
  id: string; date: string; startTime: string; endTime: string;
  reason: string | null;
  professional: { name: string } | null;
}
interface AgendaData { appointments: AptItem[]; blocks: BlockItem[]; }
export interface AgendaProps {
  businessId:    string;
  professionals: ProInfo[];
}

// ── Helpers ────────────────────────────────────────────────────
function getMonday(d: Date): Date {
  const r = new Date(d);
  const day = r.getDay();
  r.setDate(r.getDate() - (day === 0 ? 6 : day - 1));
  r.setHours(0, 0, 0, 0);
  return r;
}
function addDays(d: Date, n: number): Date {
  const r = new Date(d); r.setDate(r.getDate() + n); return r;
}
function toISO(d: Date): string {
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;
}
function isToday(iso: string): boolean {
  return toISO(new Date()) === iso;
}
function timeToY(t: string): number {
  return Math.max(0, (timeToMinutes(t) - START_HOUR * 60) / 30 * SLOT_H);
}
function durationToH(start: string, end: string): number {
  return Math.max(SLOT_H * 0.5, (timeToMinutes(end) - timeToMinutes(start)) / 30 * SLOT_H);
}

// ── Appointment detail modal ───────────────────────────────────
function AptModal({
  apt, professionals, onClose, onRefresh,
}: {
  apt: AptItem;
  professionals: ProInfo[];
  onClose: () => void;
  onRefresh: () => void;
}) {
  const [mode,      setMode]      = useState<"view"|"pay"|"reschedule">("view");
  const [payMethod, setPayMethod] = useState<"cash"|"card"|"transfer">("cash");
  const [loading,   setLoading]   = useState(false);
  const [error,     setError]     = useState("");

  async function patch(body: Record<string, unknown>) {
    setLoading(true); setError("");
    try {
      const res = await fetch(`/api/appointments/${apt.id}`, {
        method: "PATCH", headers: { "Content-Type": "application/json" },
        body: JSON.stringify(body),
      });
      const d = await res.json();
      if (!res.ok) throw new Error(d.error);
      onRefresh(); onClose();
    } catch (e: unknown) {
      setError(e instanceof Error ? e.message : "Error");
    } finally { setLoading(false); }
  }

  const canAct = apt.status === "pending" || apt.status === "confirmed";

  return (
    <div className="apt-modal-backdrop" onClick={onClose}>
      <div className="ag-apt-modal" onClick={(e) => e.stopPropagation()}>
        {/* Header */}
        <div className="ag-modal-header">
          <div>
            <span
              className="apt-badge"
              style={{ background: STATUS_COLOR[apt.status] + "22", color: STATUS_COLOR[apt.status] }}
            >
              {STATUS_LABEL[apt.status] ?? apt.status}
            </span>
            <h3 className="ag-modal-title">{apt.client?.name ?? "Cliente"}</h3>
            <p className="ag-modal-sub">{apt.client?.phone}</p>
          </div>
          <button type="button" onClick={onClose} className="svc-icon-btn"><X size={18} /></button>
        </div>

        {/* Info */}
        <div className="ag-modal-info">
          <div className="ag-modal-row"><Calendar size={14} /> {apt.date} · {formatTime(apt.startTime)} – {formatTime(apt.endTime)}</div>
          {apt.service && <div className="ag-modal-row"><Scissors size={14} /> {apt.service.name} · ${Number(apt.pricePaid ?? apt.service.price).toLocaleString("es-MX")} MXN</div>}
          {apt.professional && <div className="ag-modal-row"><User size={14} /> {apt.professional.name}</div>}
          {apt.paymentMethod && <div className="ag-modal-row"><CreditCard size={14} /> {PAY_LABELS[apt.paymentMethod] ?? apt.paymentMethod}</div>}
          {apt.notes && <p className="ag-modal-notes">"{apt.notes}"</p>}
        </div>

        {error && <p style={{ color: "#e53e3e", fontSize: ".8rem", margin: ".5rem 0" }}>{error}</p>}

        {/* Mode: pay */}
        {mode === "pay" && (
          <div>
            <p style={{ fontSize: ".82rem", fontWeight: 600, marginBottom: ".5rem" }}>Método de pago</p>
            <div className="apt-pay-options" style={{ marginBottom: ".75rem" }}>
              {(["cash","card","transfer"] as const).map((m) => (
                <button key={m} type="button" onClick={() => setPayMethod(m)} className={`apt-pay-opt${payMethod === m ? " apt-pay-opt--selected" : ""}`}>
                  {PAY_LABELS[m]}
                </button>
              ))}
            </div>
            <div className="apt-modal-actions">
              <button type="button" onClick={() => setMode("view")} className="apt-btn-ghost">Cancelar</button>
              <button type="button" disabled={loading} onClick={() => patch({ status: "completed", paymentStatus: "paid", paymentMethod: payMethod })} className="apt-btn-confirm">
                {loading && <Loader2 size={14} className="spin" />} Confirmar pago
              </button>
            </div>
          </div>
        )}

        {/* Mode: reschedule */}
        {mode === "reschedule" && (
          <ReschedulePanel
            apt={apt}
            onConfirm={(date, startTime, endTime) => patch({ date, startTime, endTime, status: "confirmed" })}
            onCancel={() => setMode("view")}
            loading={loading}
          />
        )}

        {/* Mode: view — action buttons */}
        {mode === "view" && (
          <div className="ag-modal-actions">
            {canAct && (
              <>
                <button type="button" onClick={() => setMode("reschedule")} className="ag-action-btn ag-action-btn--blue">
                  <RefreshCw size={14} /> Mover
                </button>
                {apt.status !== "confirmed" && (
                  <button type="button" disabled={loading} onClick={() => patch({ status: "confirmed" })} className="ag-action-btn ag-action-btn--purple">
                    <CheckCircle size={14} /> Confirmar
                  </button>
                )}
                <button type="button" onClick={() => setMode("pay")} className="ag-action-btn ag-action-btn--green">
                  <CreditCard size={14} /> Completar
                </button>
                <button type="button" disabled={loading} onClick={() => patch({ status: "cancelled" })} className="ag-action-btn ag-action-btn--red">
                  <XCircle size={14} /> Cancelar
                </button>
              </>
            )}
          </div>
        )}
      </div>
    </div>
  );
}

// ── Reschedule panel ───────────────────────────────────────────
function ReschedulePanel({
  apt, onConfirm, onCancel, loading,
}: {
  apt: AptItem;
  onConfirm: (date: string, startTime: string, endTime: string) => void;
  onCancel: () => void;
  loading: boolean;
}) {
  const [date,     setDate]     = useState(apt.date);
  const [slots,    setSlots]    = useState<string[]>([]);
  const [slot,     setSlot]     = useState("");
  const [fetching, setFetching] = useState(false);

  const fetchSlots = useCallback(async (d: string) => {
    if (!apt.service) return;
    setFetching(true); setSlots([]); setSlot("");
    const proId = apt.professional?.id ?? "any";
    const res = await fetch(
      `/api/book/slots?serviceId=${apt.service.id}&professionalId=${proId}` +
      `&date=${d}&durationMin=${apt.service.durationMin}&businessId=__from_session__`
    );
    const data = await res.json();
    // Filtrar el slot actual si es el mismo día
    const available = (data.slots ?? [])
      .map((s: { time: string }) => s.time)
      .filter((t: string) => !(d === apt.date && t === apt.startTime));
    setSlots(available);
    setFetching(false);
  }, [apt]);

  useEffect(() => { fetchSlots(date); }, [date, fetchSlots]);

  function confirm() {
    if (!slot || !apt.service) return;
    const endTime = addMinutes(slot, apt.service.durationMin);
    onConfirm(date, slot, endTime);
  }

  return (
    <div>
      <p style={{ fontSize: ".82rem", fontWeight: 700, marginBottom: ".5rem", color: "var(--fg)" }}>Mover cita</p>
      <label className="svc-label" style={{ marginBottom: ".75rem" }}>
        Nueva fecha
        <input type="date" className="svc-input" value={date} min={new Date().toISOString().split("T")[0]} onChange={(e) => setDate(e.target.value)} />
      </label>
      {fetching && <div className="bk-slots-loading"><Loader2 size={14} className="spin" /> Buscando horarios…</div>}
      {!fetching && slots.length === 0 && date && (
        <p style={{ fontSize: ".8rem", color: "var(--fg-muted)", marginBottom: ".75rem" }}>Sin disponibilidad para este día.</p>
      )}
      {!fetching && slots.length > 0 && (
        <div className="bk-slots-grid" style={{ marginBottom: ".75rem" }}>
          {slots.map((t) => (
            <button key={t} type="button" onClick={() => setSlot(t)} className={`bk-slot${slot === t ? " bk-slot--selected" : ""}`}>
              {formatTime(t)}
            </button>
          ))}
        </div>
      )}
      <div className="apt-modal-actions">
        <button type="button" onClick={onCancel} className="apt-btn-ghost">Cancelar</button>
        <button type="button" disabled={!slot || loading} onClick={confirm} className="apt-btn-confirm">
          {loading && <Loader2 size={14} className="spin" />} Confirmar cambio
        </button>
      </div>
    </div>
  );
}

// ── Block modal ────────────────────────────────────────────────
function BlockModal({
  date: defaultDate, startTime: defaultStart,
  professionals, onClose, onRefresh,
}: {
  date?: string;
  startTime?: string;
  professionals: ProInfo[];
  onClose: () => void;
  onRefresh: () => void;
}) {
  const [date,    setDate]    = useState(defaultDate ?? toISO(new Date()));
  const [start,   setStart]   = useState(defaultStart ?? "09:00");
  const [end,     setEnd]     = useState(defaultStart ? addMinutes(defaultStart, 60) : "10:00");
  const [reason,  setReason]  = useState("");
  const [proId,   setProId]   = useState("");
  const [loading, setLoading] = useState(false);
  const [error,   setError]   = useState("");

  const REASONS = ["Descanso", "Vacaciones", "Cita personal", "Sin personal", "Mantenimiento"];

  async function save() {
    setLoading(true); setError("");
    try {
      const res = await fetch("/api/blocks", {
        method: "POST", headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ date, startTime: start, endTime: end, reason: reason || undefined, professionalId: proId || undefined }),
      });
      const d = await res.json();
      if (!res.ok) throw new Error(d.error);
      onRefresh(); onClose();
    } catch (e: unknown) {
      setError(e instanceof Error ? e.message : "Error");
    } finally { setLoading(false); }
  }

  return (
    <div className="apt-modal-backdrop" onClick={onClose}>
      <div className="ag-apt-modal" onClick={(e) => e.stopPropagation()}>
        <div className="ag-modal-header">
          <h3 className="ag-modal-title" style={{ marginBottom: 0 }}>Bloquear tiempo</h3>
          <button type="button" onClick={onClose} className="svc-icon-btn"><X size={18} /></button>
        </div>
        <div className="svc-form" style={{ marginBottom: "1rem" }}>
          <label className="svc-label">
            Fecha
            <input type="date" className="svc-input" value={date} onChange={(e) => setDate(e.target.value)} />
          </label>
          <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: ".75rem" }}>
            <label className="svc-label">
              Desde
              <input type="time" className="svc-input" value={start} onChange={(e) => setStart(e.target.value)} />
            </label>
            <label className="svc-label">
              Hasta
              <input type="time" className="svc-input" value={end} onChange={(e) => setEnd(e.target.value)} />
            </label>
          </div>
          <label className="svc-label">
            Motivo
            <div style={{ display: "flex", gap: ".375rem", flexWrap: "wrap" }}>
              {REASONS.map((r) => (
                <button key={r} type="button" onClick={() => setReason(r)} className={`apt-pay-opt${reason === r ? " apt-pay-opt--selected" : ""}`} style={{ flex: "none", padding: ".35rem .75rem" }}>
                  {r}
                </button>
              ))}
            </div>
            <input className="svc-input" style={{ marginTop: ".5rem" }} value={reason} onChange={(e) => setReason(e.target.value)} placeholder="O escribe el motivo…" />
          </label>
          {professionals.length > 1 && (
            <label className="svc-label">
              Profesional
              <select className="svc-input" value={proId} onChange={(e) => setProId(e.target.value)}>
                <option value="">Todos</option>
                {professionals.map((p) => <option key={p.id} value={p.id}>{p.name}</option>)}
              </select>
            </label>
          )}
          {error && <p style={{ color: "#e53e3e", fontSize: ".8rem" }}>{error}</p>}
        </div>
        <div className="apt-modal-actions">
          <button type="button" onClick={onClose} className="apt-btn-ghost">Cancelar</button>
          <button type="button" onClick={save} disabled={loading} className="apt-btn-confirm" style={{ background: "#374151" }}>
            {loading && <Loader2 size={14} className="spin" />}
            <Ban size={14} /> Bloquear
          </button>
        </div>
      </div>
    </div>
  );
}

// ── Week column ────────────────────────────────────────────────
function DayColumn({
  iso, dayApts, dayBlocks, onAptClick, onSlotClick,
}: {
  iso: string;
  dayApts: AptItem[];
  dayBlocks: BlockItem[];
  onAptClick: (a: AptItem) => void;
  onSlotClick: (date: string, time: string) => void;
}) {
  return (
    <div className="ag-day-col">
      {/* Time blocks */}
      {dayBlocks.map((b) => {
        const top = timeToY(b.startTime);
        const h   = durationToH(b.startTime, b.endTime);
        return (
          <div key={b.id} className="ag-block" style={{ top, height: h }}>
            <Ban size={10} style={{ flexShrink: 0 }} />
            <span>{b.reason ?? "Bloqueado"}</span>
          </div>
        );
      })}
      {/* Appointments */}
      {dayApts.map((a) => {
        const top   = timeToY(a.startTime);
        const h     = durationToH(a.startTime, a.endTime);
        const color = STATUS_COLOR[a.status] ?? "#6E2A96";
        return (
          <button
            key={a.id}
            type="button"
            onClick={() => onAptClick(a)}
            className="ag-apt-block"
            style={{ top, height: h, borderColor: color, background: color + "18" }}
          >
            <span className="ag-apt-time">{formatTime(a.startTime)}</span>
            <span className="ag-apt-name">{a.client?.name ?? "—"}</span>
            <span className="ag-apt-svc">{a.service?.name ?? ""}</span>
            {h > 60 && a.professional && (
              <span className="ag-apt-pro">{a.professional.name}</span>
            )}
            <span className="ag-apt-dot" style={{ background: color }} />
          </button>
        );
      })}
      {/* Clickable slots for blocking */}
      {Array.from({ length: TOTAL_SLOTS }, (_, i) => {
        const hour = START_HOUR + Math.floor(i / 2);
        const min  = i % 2 === 0 ? "00" : "30";
        const time = `${String(hour).padStart(2,"0")}:${min}`;
        return (
          <div
            key={time}
            className="ag-empty-slot"
            style={{ top: i * SLOT_H, height: SLOT_H }}
            onClick={() => onSlotClick(iso, time)}
          />
        );
      })}
    </div>
  );
}

// ── Main AgendaCalendar ────────────────────────────────────────
export function AgendaCalendar({ businessId, professionals }: AgendaProps) {
  const [weekStart,    setWeekStart]    = useState(() => getMonday(new Date()));
  const [data,         setData]         = useState<AgendaData>({ appointments: [], blocks: [] });
  const [loading,      setLoading]      = useState(true);
  const [selectedApt,  setSelectedApt]  = useState<AptItem | null>(null);
  const [blockDate,    setBlockDate]    = useState<string | null>(null);
  const [blockTime,    setBlockTime]    = useState<string | undefined>(undefined);
  const scrollRef = useRef<HTMLDivElement>(null);

  const weekDays = Array.from({ length: 7 }, (_, i) => addDays(weekStart, i));
  const from = toISO(weekDays[0]);
  const to   = toISO(weekDays[6]);

  const fetchData = useCallback(async () => {
    setLoading(true);
    const res = await fetch(`/api/agenda?from=${from}&to=${to}`);
    const json = await res.json();
    setData(json);
    setLoading(false);
  }, [from, to]);

  useEffect(() => { fetchData(); }, [fetchData]);

  // Scroll a las 8am al montar
  useEffect(() => {
    if (scrollRef.current) {
      scrollRef.current.scrollTop = SLOT_H * 2; // 7am + 1h = 8am
    }
  }, []);

  function prevWeek() { setWeekStart((w) => addDays(w, -7)); }
  function nextWeek() { setWeekStart((w) => addDays(w, 7)); }
  function goToday()  { setWeekStart(getMonday(new Date())); }

  function aptsByDay(iso: string) {
    return data.appointments.filter((a) => a.date === iso);
  }
  function blocksByDay(iso: string) {
    return data.blocks.filter((b) => b.date === iso);
  }

  const weekLabel = (() => {
    const s = weekDays[0]; const e = weekDays[6];
    if (s.getMonth() === e.getMonth())
      return `${s.getDate()} – ${e.getDate()} ${MONTH_SHORT[e.getMonth()]} ${e.getFullYear()}`;
    return `${s.getDate()} ${MONTH_SHORT[s.getMonth()]} – ${e.getDate()} ${MONTH_SHORT[e.getMonth()]} ${e.getFullYear()}`;
  })();

  const totalThisWeek = data.appointments.filter((a) => a.status !== "cancelled").length;

  return (
    <div className="ag-root">
      {/* Modals */}
      {selectedApt && (
        <AptModal
          apt={selectedApt}
          professionals={professionals}
          onClose={() => setSelectedApt(null)}
          onRefresh={() => { setSelectedApt(null); fetchData(); }}
        />
      )}
      {blockDate !== null && (
        <BlockModal
          date={blockDate}
          startTime={blockTime}
          professionals={professionals}
          onClose={() => { setBlockDate(null); setBlockTime(undefined); }}
          onRefresh={() => { setBlockDate(null); fetchData(); }}
        />
      )}

      {/* Header */}
      <div className="ag-header">
        <div className="ag-header-left">
          <button type="button" onClick={prevWeek} className="cal-nav-btn"><ChevronLeft size={16} /></button>
          <div>
            <p className="ag-week-label">{weekLabel}</p>
            <p className="ag-week-sub">{totalThisWeek} cita{totalThisWeek !== 1 ? "s" : ""} esta semana</p>
          </div>
          <button type="button" onClick={nextWeek} className="cal-nav-btn"><ChevronRight size={16} /></button>
        </div>
        <div className="ag-header-right">
          <button type="button" onClick={goToday} className="ag-today-btn">Hoy</button>
          <button type="button" onClick={() => setBlockDate(toISO(new Date()))} className="ag-block-btn">
            <Ban size={14} /> Bloquear tiempo
          </button>
        </div>
      </div>

      {/* Calendar grid */}
      <div className="ag-calendar">
        {/* Day headers */}
        <div className="ag-header-row">
          <div className="ag-time-gutter" />
          {weekDays.map((d, i) => (
            <div key={i} className={`ag-day-header${isToday(toISO(d)) ? " ag-day-header--today" : ""}`}>
              <span className="ag-day-name">{DAY_NAMES[i]}</span>
              <span className="ag-day-num">{d.getDate()}</span>
            </div>
          ))}
        </div>

        {/* Scrollable body */}
        <div className="ag-body" ref={scrollRef}>
          {/* Time axis */}
          <div className="ag-time-axis">
            {Array.from({ length: END_HOUR - START_HOUR }, (_, i) => (
              <div key={i} className="ag-time-label" style={{ top: i * SLOT_H * 2 }}>
                {`${String(START_HOUR + i).padStart(2,"0")}:00`}
              </div>
            ))}
          </div>

          {/* Grid lines */}
          <div className="ag-grid-lines">
            {Array.from({ length: TOTAL_SLOTS }, (_, i) => (
              <div key={i} className={`ag-grid-line${i % 2 === 0 ? " ag-grid-line--hour" : ""}`} style={{ top: i * SLOT_H }} />
            ))}
          </div>

          {/* Day columns */}
          <div className="ag-cols">
            {weekDays.map((d, i) => {
              const iso = toISO(d);
              return (
                <DayColumn
                  key={iso}
                  iso={iso}
                  dayApts={aptsByDay(iso)}
                  dayBlocks={blocksByDay(iso)}
                  onAptClick={setSelectedApt}
                  onSlotClick={(date, time) => { setBlockDate(date); setBlockTime(time); }}
                />
              );
            })}
          </div>

          {/* Loading overlay */}
          {loading && (
            <div className="ag-loading">
              <Loader2 size={24} className="spin" />
            </div>
          )}
        </div>
      </div>

      {/* Legend */}
      <div className="ag-legend">
        {Object.entries(STATUS_LABEL).map(([k, v]) => (
          <span key={k} className="ag-legend-item">
            <span className="ag-legend-dot" style={{ background: STATUS_COLOR[k] }} />
            {v}
          </span>
        ))}
        <span className="ag-legend-item">
          <span className="ag-legend-dot" style={{ background: "#374151", borderRadius: 2 }} />
          Bloqueado
        </span>
      </div>
    </div>
  );
}
