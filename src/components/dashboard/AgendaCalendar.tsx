"use client";

import { useState, useEffect, useCallback, useRef } from "react";
import {
  ChevronLeft, ChevronRight, X, CheckCircle, XCircle,
  User, Scissors, Loader2, Ban, Calendar, CreditCard, RefreshCw, Plus,
} from "lucide-react";
import { formatTime, timeToMinutes, addMinutes, generateSlots } from "@/lib/time";

const SLOT_H = 40;
const DEFAULT_START_HOUR = 7;
const DEFAULT_END_HOUR = 21;
const DAY_NAMES = ["Lun", "Mar", "Mie", "Jue", "Vie", "Sab", "Dom"];
const MONTH_SHORT = ["Ene","Feb","Mar","Abr","May","Jun","Jul","Ago","Sep","Oct","Nov","Dic"];
const DAY_KEYS = ["sun", "mon", "tue", "wed", "thu", "fri", "sat"] as const;
const AVAILABLE_BG = "#FFFFFF";
const BLOCKED_BG = "#E5E7EB";
const COMPLETED_BG = "#3E7C74";
const DEFAULT_PASTELS = ["#F7C8D0", "#F9DCC4", "#FAEDCB", "#C9E4DE", "#CDE7F0", "#E4C1F9"];

type DayKey = typeof DAY_KEYS[number];
type ViewMode = "week" | "month";

interface ScheduleDay {
  open: string;
  close: string;
  closed: boolean;
}

interface BusinessSchedule {
  [key: string]: ScheduleDay;
}

interface ProInfo {
  id: string;
  name: string;
  colorHex?: string | null;
}

interface ServiceInfo {
  id: string;
  name: string;
  description?: string;
  price: string;
  durationMin: number;
}

interface AptItem {
  id: string;
  date: string;
  startTime: string;
  endTime: string;
  status: string;
  pricePaid: string | null;
  paymentStatus: string;
  paymentMethod: string | null;
  notes: string | null;
  service: { id: string; name: string; price: string; durationMin: number } | null;
  professional: { id: string; name: string } | null;
  client: { name: string; phone: string } | null;
}

interface BlockItem {
  id: string;
  date: string;
  startTime: string;
  endTime: string;
  reason: string | null;
  professional: { id?: string; name: string } | null;
}

interface AgendaData {
  appointments: AptItem[];
  blocks: BlockItem[];
  schedule: BusinessSchedule | null;
}

export interface AgendaProps {
  businessId: string;
  professionals: ProInfo[];
  services: ServiceInfo[];
}

interface SlotOption {
  time: string;
  professionalIds: string[];
}

interface ClientLookupItem {
  id: string;
  name: string;
  phone: string;
  email: string | null;
  notes: string | null;
  totalAppointments?: number;
}

const PAY_LABELS: Record<string, string> = {
  cash: "Efectivo",
  card: "Tarjeta",
  transfer: "Transferencia",
};

function getMonday(d: Date): Date {
  const r = new Date(d);
  const day = r.getDay();
  r.setDate(r.getDate() - (day === 0 ? 6 : day - 1));
  r.setHours(0, 0, 0, 0);
  return r;
}

function addDays(d: Date, n: number): Date {
  const r = new Date(d);
  r.setDate(r.getDate() + n);
  return r;
}

function toISO(d: Date): string {
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;
}

function isToday(iso: string): boolean {
  return toISO(new Date()) === iso;
}

function getDayKey(iso: string): DayKey {
  return DAY_KEYS[new Date(`${iso}T12:00:00`).getDay()];
}

function startOfMonth(d: Date): Date {
  return new Date(d.getFullYear(), d.getMonth(), 1);
}

function getMonthGridStart(d: Date): Date {
  return getMonday(startOfMonth(d));
}

function getMonthGridDays(d: Date): Date[] {
  const start = getMonthGridStart(d);
  return Array.from({ length: 42 }, (_, i) => addDays(start, i));
}

function hexToRgba(hex: string, alpha: number): string {
  const clean = hex.replace("#", "");
  const safe = clean.length === 6 ? clean : "F7C8D0";
  const r = parseInt(safe.slice(0, 2), 16);
  const g = parseInt(safe.slice(2, 4), 16);
  const b = parseInt(safe.slice(4, 6), 16);
  return `rgba(${r}, ${g}, ${b}, ${alpha})`;
}

function timeToY(t: string, startHour: number): number {
  return Math.max(0, (timeToMinutes(t) - startHour * 60) / 30 * SLOT_H);
}

function durationToH(start: string, end: string): number {
  return Math.max(SLOT_H * 0.7, (timeToMinutes(end) - timeToMinutes(start)) / 30 * SLOT_H);
}

function getProfessionalColor(professionalId: string | undefined, professionals: ProInfo[]): string {
  if (!professionalId) return DEFAULT_PASTELS[0];
  const found = professionals.find((pro) => pro.id === professionalId);
  return found?.colorHex ?? DEFAULT_PASTELS[Math.abs(hashCode(professionalId)) % DEFAULT_PASTELS.length];
}

function hashCode(value: string) {
  let hash = 0;
  for (let i = 0; i < value.length; i += 1) {
    hash = ((hash << 5) - hash) + value.charCodeAt(i);
    hash |= 0;
  }
  return hash;
}

function getVisibleHours(days: string[], schedule: BusinessSchedule | null) {
  const opens: number[] = [];
  const closes: number[] = [];

  for (const iso of days) {
    const daySchedule = schedule?.[getDayKey(iso)];
    if (!daySchedule || daySchedule.closed) continue;
    opens.push(timeToMinutes(daySchedule.open));
    closes.push(timeToMinutes(daySchedule.close));
  }

  if (opens.length === 0 || closes.length === 0) {
    return { startHour: DEFAULT_START_HOUR, endHour: DEFAULT_END_HOUR };
  }

  return {
    startHour: Math.floor(Math.min(...opens) / 60),
    endHour: Math.ceil(Math.max(...closes) / 60),
  };
}

function formatRangeLabel(viewMode: ViewMode, weekDays: Date[], monthCursor: Date) {
  if (viewMode === "month") {
    return `${MONTH_SHORT[monthCursor.getMonth()]} ${monthCursor.getFullYear()}`;
  }

  const s = weekDays[0];
  const e = weekDays[weekDays.length - 1];
  if (s.getMonth() === e.getMonth()) {
    return `${s.getDate()} - ${e.getDate()} ${MONTH_SHORT[e.getMonth()]} ${e.getFullYear()}`;
  }
  return `${s.getDate()} ${MONTH_SHORT[s.getMonth()]} - ${e.getDate()} ${MONTH_SHORT[e.getMonth()]} ${e.getFullYear()}`;
}

function getBookedRanges(
  iso: string,
  professionalId: string,
  appointments: AptItem[],
  blocks: BlockItem[],
) {
  const aptRanges = appointments
    .filter((apt) => apt.date === iso && apt.professional?.id === professionalId && apt.status !== "cancelled" && apt.status !== "no_show")
    .map((apt) => ({ startTime: apt.startTime, endTime: apt.endTime }));

  const blockRanges = blocks
    .filter((block) => block.date === iso)
    .filter((block) => !block.professional?.id || block.professional.id === professionalId)
    .map((block) => ({ startTime: block.startTime, endTime: block.endTime }));

  return [...aptRanges, ...blockRanges];
}

function getAvailableSlotsForDay(
  iso: string,
  selectedProId: string,
  appointments: AptItem[],
  blocks: BlockItem[],
  professionals: ProInfo[],
  schedule: BusinessSchedule | null,
) {
  const daySchedule = schedule?.[getDayKey(iso)];
  if (!daySchedule || daySchedule.closed) return [];

  const candidatePros = selectedProId
    ? professionals.filter((pro) => pro.id === selectedProId)
    : professionals;

  const slots = new Set<string>();
  for (const professional of candidatePros) {
    const booked = getBookedRanges(iso, professional.id, appointments, blocks);
    const freeSlots = generateSlots(daySchedule.open, daySchedule.close, 30, booked);
    for (const slot of freeSlots) slots.add(slot);
  }

  return Array.from(slots).sort((a, b) => a.localeCompare(b));
}

function MonthCell({
  date,
  currentMonth,
  availableCount,
  bookedCount,
  completedCount,
  onOpenWeek,
  availableOnly,
}: {
  date: Date;
  currentMonth: number;
  availableCount: number;
  bookedCount: number;
  completedCount: number;
  onOpenWeek: (date: Date) => void;
  availableOnly: boolean;
}) {
  const iso = toISO(date);
  const isCurrentMonth = date.getMonth() === currentMonth;

  return (
    <button
      type="button"
      onClick={() => onOpenWeek(date)}
      className={`ag-month-cell${isToday(iso) ? " ag-month-cell--today" : ""}${!isCurrentMonth ? " ag-month-cell--muted" : ""}`}
    >
      <span className="ag-month-date">{date.getDate()}</span>
      {availableOnly ? (
        <span className="ag-month-kpi">{availableCount} libres</span>
      ) : (
        <>
          <span className="ag-month-kpi">{bookedCount} agenda</span>
          <span className="ag-month-kpi ag-month-kpi--done">{completedCount} comp.</span>
          <span className="ag-month-kpi ag-month-kpi--avail">{availableCount} libres</span>
        </>
      )}
    </button>
  );
}

function AptModal({
  apt, onClose, onRefresh,
}: {
  apt: AptItem;
  onClose: () => void;
  onRefresh: () => void;
}) {
  const [mode, setMode] = useState<"view" | "pay" | "reschedule">("view");
  const [payMethod, setPayMethod] = useState<"cash" | "card" | "transfer">("cash");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  async function patch(body: Record<string, unknown>) {
    setLoading(true);
    setError("");
    try {
      const res = await fetch(`/api/appointments/${apt.id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(body),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error);
      onRefresh();
      onClose();
    } catch (e: unknown) {
      setError(e instanceof Error ? e.message : "Error");
    } finally {
      setLoading(false);
    }
  }

  const canAct = apt.status === "pending" || apt.status === "confirmed";

  return (
    <div className="apt-modal-backdrop" onClick={onClose}>
      <div className="ag-apt-modal" onClick={(e) => e.stopPropagation()}>
        <div className="ag-modal-header">
          <div>
            <span className="apt-badge" style={{ background: apt.status === "completed" ? "#3E7C7422" : "#6E2A9614", color: apt.status === "completed" ? COMPLETED_BG : "#6E2A96" }}>
              {apt.status === "completed" ? "Completada" : "Agendada"}
            </span>
            <h3 className="ag-modal-title">{apt.client?.name ?? "Cliente"}</h3>
            <p className="ag-modal-sub">{apt.client?.phone}</p>
          </div>
          <button type="button" onClick={onClose} className="svc-icon-btn"><X size={18} /></button>
        </div>

        <div className="ag-modal-info">
          <div className="ag-modal-row"><Calendar size={14} /> {apt.date} · {formatTime(apt.startTime)} - {formatTime(apt.endTime)}</div>
          {apt.service && <div className="ag-modal-row"><Scissors size={14} /> {apt.service.name} · ${Number(apt.pricePaid ?? apt.service.price).toLocaleString("es-MX")} MXN</div>}
          {apt.professional && <div className="ag-modal-row"><User size={14} /> {apt.professional.name}</div>}
          {apt.paymentMethod && <div className="ag-modal-row"><CreditCard size={14} /> {PAY_LABELS[apt.paymentMethod] ?? apt.paymentMethod}</div>}
          {apt.notes && <p className="ag-modal-notes">&quot;{apt.notes}&quot;</p>}
        </div>

        {error && <p style={{ color: "#e53e3e", fontSize: ".8rem", margin: ".5rem 0" }}>{error}</p>}

        {mode === "pay" && (
          <div>
            <p style={{ fontSize: ".82rem", fontWeight: 600, marginBottom: ".5rem" }}>Metodo de pago</p>
            <div className="apt-pay-options" style={{ marginBottom: ".75rem" }}>
              {(["cash", "card", "transfer"] as const).map((m) => (
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

        {mode === "reschedule" && (
          <ReschedulePanel
            apt={apt}
            onConfirm={(date, startTime, endTime) => patch({ date, startTime, endTime, status: "confirmed" })}
            onCancel={() => setMode("view")}
            loading={loading}
          />
        )}

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

function ReschedulePanel({
  apt, onConfirm, onCancel, loading,
}: {
  apt: AptItem;
  onConfirm: (date: string, startTime: string, endTime: string) => void;
  onCancel: () => void;
  loading: boolean;
}) {
  const [date, setDate] = useState(apt.date);
  const [slots, setSlots] = useState<string[]>([]);
  const [slot, setSlot] = useState("");
  const [fetching, setFetching] = useState(false);

  const fetchSlots = useCallback(async (selectedDate: string) => {
    if (!apt.service) return;
    setFetching(true);
    setSlots([]);
    setSlot("");
    const proId = apt.professional?.id ?? "any";
    const res = await fetch(
      `/api/book/slots?serviceId=${apt.service.id}&professionalId=${proId}` +
      `&date=${selectedDate}&durationMin=${apt.service.durationMin}&businessId=__from_session__`
    );
    const data = await res.json();
    const available = (data.slots ?? [])
      .map((item: { time: string }) => item.time)
      .filter((time: string) => !(selectedDate === apt.date && time === apt.startTime));
    setSlots(available);
    setFetching(false);
  }, [apt]);

  useEffect(() => {
    const timer = setTimeout(() => {
      void fetchSlots(date);
    }, 0);
    return () => clearTimeout(timer);
  }, [date, fetchSlots]);

  function confirm() {
    if (!slot || !apt.service) return;
    onConfirm(date, slot, addMinutes(slot, apt.service.durationMin));
  }

  return (
    <div>
      <p style={{ fontSize: ".82rem", fontWeight: 700, marginBottom: ".5rem", color: "var(--fg)" }}>Mover cita</p>
      <label className="svc-label" style={{ marginBottom: ".75rem" }}>
        Nueva fecha
        <input type="date" className="svc-input" value={date} min={toISO(new Date())} onChange={(e) => setDate(e.target.value)} />
      </label>
      {fetching && <div className="bk-slots-loading"><Loader2 size={14} className="spin" /> Buscando horarios…</div>}
      {!fetching && slots.length === 0 && <p style={{ fontSize: ".8rem", color: "var(--fg-muted)", marginBottom: ".75rem" }}>Sin disponibilidad para este día.</p>}
      {!fetching && slots.length > 0 && (
        <div className="bk-slots-grid" style={{ marginBottom: ".75rem" }}>
          {slots.map((time) => (
            <button key={time} type="button" onClick={() => setSlot(time)} className={`bk-slot${slot === time ? " bk-slot--selected" : ""}`}>
              {formatTime(time)}
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

function ActionModal({
  businessId,
  date: defaultDate,
  startTime: defaultStart,
  initialTab = "agendar",
  defaultProfessionalId,
  professionals,
  services,
  onClose,
  onRefresh,
}: {
  businessId: string;
  date?: string;
  startTime?: string;
  initialTab?: "agendar" | "bloqueo";
  defaultProfessionalId?: string;
  professionals: ProInfo[];
  services: ServiceInfo[];
  onClose: () => void;
  onRefresh: () => void;
}) {
  const [tab, setTab] = useState<"agendar" | "bloqueo">(initialTab);
  const [date, setDate] = useState(defaultDate ?? toISO(new Date()));
  const [serviceId, setServiceId] = useState("");
  const [slot, setSlot] = useState(defaultStart ?? "");
  const [slots, setSlots] = useState<SlotOption[]>([]);
  const [slotError, setSlotError] = useState("");
  const [slotsLoading, setSlotsLoading] = useState(false);
  const [professionalId, setProfessionalId] = useState(defaultProfessionalId ?? "");
  const [clientPhone, setClientPhone] = useState("");
  const [clientName, setClientName] = useState("");
  const [clientEmail, setClientEmail] = useState("");
  const [notes, setNotes] = useState("");
  const [matchedClient, setMatchedClient] = useState<ClientLookupItem | null>(null);
  const [clientLoading, setClientLoading] = useState(false);
  const [savingAppointment, setSavingAppointment] = useState(false);
  const [appointmentError, setAppointmentError] = useState("");
  const [start, setStart] = useState(defaultStart ?? "09:00");
  const [end, setEnd] = useState(defaultStart ? addMinutes(defaultStart, 60) : "10:00");
  const [reason, setReason] = useState("");
  const [proId, setProId] = useState(defaultProfessionalId ?? "");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const reasons = ["Descanso", "Vacaciones", "Cita personal", "Sin personal", "Mantenimiento"];
  const selectedService = services.find((service) => service.id === serviceId) ?? null;
  const selectedSlot = slots.find((entry) => entry.time === slot) ?? null;
  const availableProfessionals = selectedSlot
    ? professionals.filter((professional) => selectedSlot.professionalIds.includes(professional.id))
    : [];

  useEffect(() => {
    if (!serviceId || !date) {
      setSlots([]);
      setSlotError("");
      return;
    }

    let cancelled = false;

    async function loadSlots() {
      setSlotsLoading(true);
      setSlotError("");
      try {
        const res = await fetch(
          `/api/book/slots?businessId=${businessId}&serviceId=${serviceId}&professionalId=any&date=${date}`,
          { cache: "no-store" },
        );
        const data = await res.json();
        if (cancelled) return;

        const nextSlots = Array.isArray(data.slots) ? data.slots as SlotOption[] : [];
        setSlots(nextSlots);

        if (defaultStart && !slot) {
          const preset = nextSlots.find((entry) => entry.time === defaultStart);
          if (preset) {
            setSlot(defaultStart);
          } else {
            setSlotError("Ese horario no está disponible para el servicio seleccionado.");
          }
        } else if (!slot && nextSlots.length > 0) {
          setSlot(nextSlots[0].time);
        }

        if (slot) {
          const current = nextSlots.find((entry) => entry.time === slot);
          if (!current) {
            setProfessionalId("");
            setSlotError("El horario seleccionado ya no está disponible para este servicio.");
          }
        }
      } catch {
        if (!cancelled) {
          setSlots([]);
          setSlotError("No pude cargar horarios disponibles.");
        }
      } finally {
        if (!cancelled) setSlotsLoading(false);
      }
    }

    void loadSlots();
    return () => { cancelled = true; };
  }, [businessId, date, defaultStart, serviceId, slot]);

  useEffect(() => {
    if (!slot) return;

    const current = slots.find((entry) => entry.time === slot);
    if (!current) return;

    if (defaultProfessionalId && current.professionalIds.includes(defaultProfessionalId)) {
      setProfessionalId(defaultProfessionalId);
      return;
    }

    if (!professionalId || !current.professionalIds.includes(professionalId)) {
      setProfessionalId(current.professionalIds[0] ?? "");
    }
  }, [defaultProfessionalId, professionalId, slot, slots]);

  useEffect(() => {
    const search = clientPhone.trim();
    if (search.length < 8) {
      setMatchedClient(null);
      setClientLoading(false);
      return;
    }

    let cancelled = false;
    setClientLoading(true);

    async function lookupClient() {
      try {
        const res = await fetch(`/api/clients?search=${encodeURIComponent(search)}`, { cache: "no-store" });
        const data = await res.json();
        if (cancelled || !Array.isArray(data)) return;
        const digits = search.replace(/\D/g, "");
        const match = data.find((client: ClientLookupItem) => client.phone.replace(/\D/g, "") === digits) ?? null;
        setMatchedClient(match);
        if (match) {
          setClientName(match.name ?? "");
          setClientEmail(match.email ?? "");
        }
      } catch {
        if (!cancelled) setMatchedClient(null);
      } finally {
        if (!cancelled) setClientLoading(false);
      }
    }

    const timer = setTimeout(() => {
      void lookupClient();
    }, 250);

    return () => {
      cancelled = true;
      clearTimeout(timer);
    };
  }, [clientPhone]);

  async function save() {
    setLoading(true);
    setError("");
    try {
      const res = await fetch("/api/blocks", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ date, startTime: start, endTime: end, reason: reason || undefined, professionalId: proId || undefined }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error);
      onRefresh();
      onClose();
    } catch (e: unknown) {
      setError(e instanceof Error ? e.message : "Error");
    } finally {
      setLoading(false);
    }
  }

  async function saveAppointment() {
    if (!selectedService || !slot || !professionalId) return;

    setSavingAppointment(true);
    setAppointmentError("");
    try {
      const res = await fetch("/api/appointments", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          serviceId: selectedService.id,
          professionalId,
          date,
          startTime: slot,
          clientName: clientName.trim(),
          clientPhone: clientPhone.trim(),
          clientEmail: clientEmail.trim(),
          notes: notes.trim(),
        }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error ?? "No pude agendar la cita");
      onRefresh();
      onClose();
    } catch (e: unknown) {
      setAppointmentError(e instanceof Error ? e.message : "No pude agendar la cita");
    } finally {
      setSavingAppointment(false);
    }
  }

  return (
    <div className="apt-modal-backdrop" onClick={onClose}>
      <div className="ag-apt-modal" onClick={(e) => e.stopPropagation()}>
        <div className="ag-modal-header">
          <div>
            <h3 className="ag-modal-title" style={{ marginBottom: 0 }}>Acción sobre horario</h3>
            <p style={{ fontSize: ".8rem", color: "var(--fg-muted)", marginTop: ".2rem" }}>
              {date}{slot ? ` · ${formatTime(slot)}` : ""}
            </p>
          </div>
          <button type="button" onClick={onClose} className="svc-icon-btn"><X size={18} /></button>
        </div>
        <div className="ag-toggle-group" style={{ marginBottom: "1rem" }}>
          <button type="button" onClick={() => setTab("agendar")} className={`ag-toggle-btn${tab === "agendar" ? " ag-toggle-btn--active" : ""}`}>Agendar</button>
          <button type="button" onClick={() => setTab("bloqueo")} className={`ag-toggle-btn${tab === "bloqueo" ? " ag-toggle-btn--active" : ""}`}>Bloqueo</button>
        </div>

        {tab === "agendar" ? (
          <>
            <div className="svc-form" style={{ marginBottom: "1rem" }}>
              <label className="svc-label">
                Servicio
                <select className="svc-input" value={serviceId} onChange={(e) => setServiceId(e.target.value)}>
                  <option value="">Selecciona un servicio</option>
                  {services.map((service) => (
                    <option key={service.id} value={service.id}>
                      {service.name} · {service.durationMin} min · ${Number(service.price).toLocaleString("es-MX")}
                    </option>
                  ))}
                </select>
              </label>
              <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: ".75rem" }}>
                <label className="svc-label">
                  Fecha
                  <input type="date" className="svc-input" value={date} onChange={(e) => setDate(e.target.value)} />
                </label>
                <label className="svc-label">
                  Hora
                  <select className="svc-input" value={slot} onChange={(e) => setSlot(e.target.value)} disabled={!serviceId || slotsLoading || slots.length === 0}>
                    <option value="">{slotsLoading ? "Cargando..." : "Selecciona un horario"}</option>
                    {slots.map((entry) => (
                      <option key={entry.time} value={entry.time}>{formatTime(entry.time)}</option>
                    ))}
                  </select>
                </label>
              </div>
              {selectedService && (
                <p style={{ fontSize: ".78rem", color: "var(--fg-muted)", marginTop: "-.25rem" }}>
                  Duración: {selectedService.durationMin} min
                </p>
              )}
              {slotError && <p style={{ color: "#b45309", fontSize: ".8rem" }}>{slotError}</p>}
              <label className="svc-label">
                Trabajadora disponible
                <select className="svc-input" value={professionalId} onChange={(e) => setProfessionalId(e.target.value)} disabled={!slot || availableProfessionals.length === 0}>
                  <option value="">{slot ? "Selecciona trabajadora" : "Primero elige horario"}</option>
                  {availableProfessionals.map((professional) => (
                    <option key={professional.id} value={professional.id}>{professional.name}</option>
                  ))}
                </select>
              </label>
              <label className="svc-label">
                Teléfono
                <input className="svc-input" value={clientPhone} onChange={(e) => setClientPhone(e.target.value)} placeholder="Ej. 5512345678" />
              </label>
              {clientLoading && <p style={{ fontSize: ".78rem", color: "var(--fg-muted)" }}>Buscando clienta…</p>}
              {matchedClient && (
                <div style={{ background: "#eff6ff", border: "1px solid #bfdbfe", borderRadius: 12, padding: ".75rem" }}>
                  <p style={{ fontSize: ".8rem", fontWeight: 700, color: "#1d4ed8", marginBottom: ".2rem" }}>Clienta encontrada</p>
                  <p style={{ fontSize: ".8rem", color: "#1e3a8a" }}>
                    {matchedClient.name} · {matchedClient.totalAppointments ?? 0} citas registradas
                  </p>
                </div>
              )}
              <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: ".75rem" }}>
                <label className="svc-label">
                  Nombre
                  <input className="svc-input" value={clientName} onChange={(e) => setClientName(e.target.value)} placeholder="Nombre completo" />
                </label>
                <label className="svc-label">
                  Correo
                  <input className="svc-input" type="email" value={clientEmail} onChange={(e) => setClientEmail(e.target.value)} placeholder="correo@dominio.com" />
                </label>
              </div>
              <label className="svc-label">
                Notas
                <textarea className="svc-input" value={notes} onChange={(e) => setNotes(e.target.value)} placeholder="Notas de la cita o la clienta" rows={4} />
              </label>
              {appointmentError && <p style={{ color: "#e53e3e", fontSize: ".8rem" }}>{appointmentError}</p>}
            </div>
            <div className="apt-modal-actions">
              <button type="button" onClick={onClose} className="apt-btn-ghost">Cancelar</button>
              <button
                type="button"
                onClick={saveAppointment}
                disabled={!selectedService || !slot || !professionalId || clientName.trim().length < 2 || clientPhone.trim().length < 8 || savingAppointment}
                className="apt-btn-confirm"
              >
                {savingAppointment && <Loader2 size={14} className="spin" />}
                <CheckCircle size={14} /> Agendar
              </button>
            </div>
          </>
        ) : (
          <>
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
                  {reasons.map((reasonItem) => (
                    <button key={reasonItem} type="button" onClick={() => setReason(reasonItem)} className={`apt-pay-opt${reason === reasonItem ? " apt-pay-opt--selected" : ""}`} style={{ flex: "none", padding: ".35rem .75rem" }}>
                      {reasonItem}
                    </button>
                  ))}
                </div>
                <input className="svc-input" style={{ marginTop: ".5rem" }} value={reason} onChange={(e) => setReason(e.target.value)} placeholder="O escribe el motivo..." />
              </label>
              {professionals.length > 1 && (
                <label className="svc-label">
                  Profesional
                  <select className="svc-input" value={proId} onChange={(e) => setProId(e.target.value)}>
                    <option value="">Todos</option>
                    {professionals.map((professional) => <option key={professional.id} value={professional.id}>{professional.name}</option>)}
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
          </>
        )}
      </div>
    </div>
  );
}

function DayColumn({
  iso,
  dayAppointments,
  dayBlocks,
  onAptClick,
  onSlotClick,
  startHour,
  totalSlots,
  professionals,
}: {
  iso: string;
  dayAppointments: AptItem[];
  dayBlocks: BlockItem[];
  onAptClick: (apt: AptItem) => void;
  onSlotClick: (date: string, time: string) => void;
  startHour: number;
  totalSlots: number;
  professionals: ProInfo[];
}) {
  return (
    <div className="ag-day-col" style={{ minHeight: totalSlots * SLOT_H }}>
      {dayBlocks.map((block) => {
        const top = timeToY(block.startTime, startHour);
        const height = durationToH(block.startTime, block.endTime);
        return (
          <div key={block.id} className="ag-block" style={{ top, height, background: BLOCKED_BG }}>
            <Ban size={10} style={{ flexShrink: 0 }} />
            <span>{block.reason ?? "Bloqueado"}</span>
          </div>
        );
      })}
      {dayAppointments.map((apt) => {
        const top = timeToY(apt.startTime, startHour);
        const height = durationToH(apt.startTime, apt.endTime);
        const isCompleted = apt.status === "completed";
        const color = isCompleted ? COMPLETED_BG : getProfessionalColor(apt.professional?.id, professionals);
        const background = isCompleted ? COMPLETED_BG : hexToRgba(color, 0.72);
        return (
          <button
            key={apt.id}
            type="button"
            onClick={() => onAptClick(apt)}
            className="ag-apt-block"
            style={{ top, height, borderColor: color, background, color: isCompleted ? "#fff" : "var(--fg)" }}
          >
            <span className="ag-apt-time" style={{ color: isCompleted ? "rgba(255,255,255,.84)" : "var(--fg-muted)" }}>{formatTime(apt.startTime)}</span>
            <span className="ag-apt-name" style={{ color: isCompleted ? "#fff" : "var(--fg)" }}>{apt.client?.name ?? "-"}</span>
            <span className="ag-apt-svc" style={{ color: isCompleted ? "rgba(255,255,255,.9)" : "var(--fg-muted)" }}>{apt.service?.name ?? ""}</span>
            {height > 62 && apt.professional && (
              <span className="ag-apt-pro" style={{ color: isCompleted ? "rgba(255,255,255,.82)" : "var(--fg-muted)" }}>{apt.professional.name}</span>
            )}
            <span className="ag-apt-dot" style={{ background: isCompleted ? "#fff" : color }} />
          </button>
        );
      })}
      {Array.from({ length: totalSlots }, (_, i) => {
        const totalMinutes = (startHour * 60) + (i * 30);
        const hour = Math.floor(totalMinutes / 60);
        const min = totalMinutes % 60;
        const time = `${String(hour).padStart(2, "0")}:${String(min).padStart(2, "0")}`;
        return (
          <div
            key={time}
            className="ag-empty-slot"
            style={{ top: i * SLOT_H, height: SLOT_H, background: AVAILABLE_BG }}
            onClick={() => onSlotClick(iso, time)}
          />
        );
      })}
    </div>
  );
}

export function AgendaCalendar({ businessId, professionals, services }: AgendaProps) {
  const [viewMode, setViewMode] = useState<ViewMode>("week");
  const [weekStart, setWeekStart] = useState(() => getMonday(new Date()));
  const [monthCursor, setMonthCursor] = useState(() => startOfMonth(new Date()));
  const [data, setData] = useState<AgendaData>({ appointments: [], blocks: [], schedule: null });
  const [loading, setLoading] = useState(true);
  const [selectedApt, setSelectedApt] = useState<AptItem | null>(null);
  const [actionDate, setActionDate] = useState<string | null>(null);
  const [actionTime, setActionTime] = useState<string | undefined>(undefined);
  const [actionTab, setActionTab] = useState<"agendar" | "bloqueo">("agendar");
  const [selectedProId, setSelectedProId] = useState("");
  const [availableOnly, setAvailableOnly] = useState(false);
  const scrollRef = useRef<HTMLDivElement>(null);

  const weekDays = Array.from({ length: 7 }, (_, i) => addDays(weekStart, i));
  const visibleDays = viewMode === "week" ? weekDays : getMonthGridDays(monthCursor);
  const visibleIsoDays = visibleDays.map(toISO);
  const rangeFrom = visibleIsoDays[0];
  const rangeTo = visibleIsoDays[visibleIsoDays.length - 1];

  const fetchData = useCallback(async () => {
    setLoading(true);
    const res = await fetch(`/api/agenda?from=${rangeFrom}&to=${rangeTo}`);
    const json = await res.json();
    setData(json);
    setLoading(false);
  }, [rangeFrom, rangeTo]);

  useEffect(() => {
    const timer = setTimeout(() => {
      void fetchData();
    }, 0);
    return () => clearTimeout(timer);
  }, [fetchData]);

  useEffect(() => {
    if (scrollRef.current && viewMode === "week" && !availableOnly) {
      scrollRef.current.scrollTop = SLOT_H;
    }
  }, [viewMode, availableOnly, rangeFrom]);

  function prevPeriod() {
    if (viewMode === "week") setWeekStart((current) => addDays(current, -7));
    else setMonthCursor((current) => new Date(current.getFullYear(), current.getMonth() - 1, 1));
  }

  function nextPeriod() {
    if (viewMode === "week") setWeekStart((current) => addDays(current, 7));
    else setMonthCursor((current) => new Date(current.getFullYear(), current.getMonth() + 1, 1));
  }

  function goToday() {
    setWeekStart(getMonday(new Date()));
    setMonthCursor(startOfMonth(new Date()));
  }

  function openWeekFromMonth(date: Date) {
    setWeekStart(getMonday(date));
    setViewMode("week");
  }

  const visibleAppointments = data.appointments
    .filter((apt) => apt.status !== "cancelled" && apt.status !== "no_show")
    .filter((apt) => !selectedProId || apt.professional?.id === selectedProId);

  const visibleBlocks = data.blocks.filter((block) => !selectedProId || !block.professional?.id || block.professional.id === selectedProId);

  const { startHour, endHour } = getVisibleHours(viewMode === "week" ? visibleIsoDays : visibleIsoDays.filter((iso) => new Date(`${iso}T12:00:00`).getMonth() === monthCursor.getMonth()), data.schedule);
  const totalSlots = (endHour - startHour) * 2;

  const totalThisWeek = viewMode === "week"
    ? visibleAppointments.length
    : visibleAppointments.filter((apt) => apt.date >= rangeFrom && apt.date <= rangeTo).length;

  const totalAvailable = viewMode === "week"
    ? visibleIsoDays.reduce((acc, iso) => acc + getAvailableSlotsForDay(iso, selectedProId, data.appointments, data.blocks, professionals, data.schedule).length, 0)
    : visibleIsoDays
      .filter((iso) => new Date(`${iso}T12:00:00`).getMonth() === monthCursor.getMonth())
      .reduce((acc, iso) => acc + getAvailableSlotsForDay(iso, selectedProId, data.appointments, data.blocks, professionals, data.schedule).length, 0);

  return (
    <div className="ag-root">
      {selectedApt && (
        <AptModal
          apt={selectedApt}
          onClose={() => setSelectedApt(null)}
          onRefresh={() => { setSelectedApt(null); fetchData(); }}
        />
      )}
      {actionDate !== null && (
        <ActionModal
          businessId={businessId}
          date={actionDate}
          startTime={actionTime}
          initialTab={actionTab}
          defaultProfessionalId={selectedProId || undefined}
          professionals={professionals}
          services={services}
          onClose={() => { setActionDate(null); setActionTime(undefined); setActionTab("agendar"); }}
          onRefresh={() => { setActionDate(null); setActionTime(undefined); setActionTab("agendar"); fetchData(); }}
        />
      )}

      <div className="ag-header">
        <div className="ag-header-left">
          <button type="button" onClick={prevPeriod} className="cal-nav-btn"><ChevronLeft size={16} /></button>
          <div>
            <p className="ag-week-label">{formatRangeLabel(viewMode, weekDays, monthCursor)}</p>
            <p className="ag-week-sub">
              {availableOnly ? `${totalAvailable} horarios libres` : `${totalThisWeek} citas visibles`}
            </p>
          </div>
          <button type="button" onClick={nextPeriod} className="cal-nav-btn"><ChevronRight size={16} /></button>
        </div>
        <div className="ag-header-right">
          <button type="button" onClick={goToday} className="ag-today-btn">Hoy</button>
          <button type="button" onClick={() => { setActionTab("agendar"); setActionDate(toISO(new Date())); setActionTime(undefined); }} className="ag-today-btn">
            <Plus size={14} /> Agendar
          </button>
          <button type="button" onClick={() => { setActionTab("bloqueo"); setActionDate(toISO(new Date())); setActionTime(undefined); }} className="ag-block-btn">
            <Ban size={14} /> Bloquear tiempo
          </button>
        </div>
      </div>

      <div className="ag-filters">
        <div className="ag-toggle-group">
          <button type="button" onClick={() => setViewMode("week")} className={`ag-toggle-btn${viewMode === "week" ? " ag-toggle-btn--active" : ""}`}>Semanal</button>
          <button type="button" onClick={() => setViewMode("month")} className={`ag-toggle-btn${viewMode === "month" ? " ag-toggle-btn--active" : ""}`}>Mensual</button>
        </div>

        <select className="ag-select" value={selectedProId} onChange={(e) => setSelectedProId(e.target.value)}>
          <option value="">Todos los trabajadores</option>
          {professionals.map((professional) => (
            <option key={professional.id} value={professional.id}>{professional.name}</option>
          ))}
        </select>

        <button
          type="button"
          onClick={() => setAvailableOnly((current) => !current)}
          className={`ag-filter-chip${availableOnly ? " ag-filter-chip--active" : ""}`}
        >
          Solo disponibles
        </button>
      </div>

      {viewMode === "month" ? (
        <div className="ag-month">
          <div className="ag-month-head">
            {DAY_NAMES.map((day) => <span key={day}>{day}</span>)}
          </div>
          <div className="ag-month-grid">
            {getMonthGridDays(monthCursor).map((date) => {
              const iso = toISO(date);
              const dayApts = visibleAppointments.filter((apt) => apt.date === iso);
              const availableCount = getAvailableSlotsForDay(iso, selectedProId, data.appointments, data.blocks, professionals, data.schedule).length;
              return (
                <MonthCell
                  key={iso}
                  date={date}
                  currentMonth={monthCursor.getMonth()}
                  availableCount={availableCount}
                  bookedCount={dayApts.filter((apt) => apt.status !== "completed").length}
                  completedCount={dayApts.filter((apt) => apt.status === "completed").length}
                  onOpenWeek={openWeekFromMonth}
                  availableOnly={availableOnly}
                />
              );
            })}
          </div>
        </div>
      ) : availableOnly ? (
        <div className="ag-available-wrap">
          {visibleIsoDays.map((iso, index) => {
            const slots = getAvailableSlotsForDay(iso, selectedProId, data.appointments, data.blocks, professionals, data.schedule);
            return (
              <div key={iso} className={`ag-available-card${isToday(iso) ? " ag-available-card--today" : ""}`}>
                <div className="ag-available-head">
                  <span>{DAY_NAMES[index]}</span>
                  <strong>{new Date(`${iso}T12:00:00`).getDate()}</strong>
                </div>
                {slots.length === 0 ? (
                  <p className="ag-available-empty">Sin horarios libres</p>
                ) : (
                  <div className="ag-slot-pills">
                    {slots.map((slot) => <span key={slot} className="ag-slot-pill">{formatTime(slot)}</span>)}
                  </div>
                )}
              </div>
            );
          })}
        </div>
      ) : (
        <div className="ag-calendar">
          <div className="ag-header-row">
            <div className="ag-time-gutter" />
            {weekDays.map((day, index) => (
              <div key={toISO(day)} className={`ag-day-header${isToday(toISO(day)) ? " ag-day-header--today" : ""}`}>
                <span className="ag-day-name">{DAY_NAMES[index]}</span>
                <span className="ag-day-num">{day.getDate()}</span>
              </div>
            ))}
          </div>

          <div className="ag-body" ref={scrollRef}>
            <div className="ag-time-axis">
              {Array.from({ length: endHour - startHour }, (_, i) => (
                <div key={i} className="ag-time-label" style={{ top: i * SLOT_H * 2 }}>
                  {`${String(startHour + i).padStart(2, "0")}:00`}
                </div>
              ))}
            </div>
            <div className="ag-grid-lines">
              {Array.from({ length: totalSlots }, (_, i) => (
                <div key={i} className={`ag-grid-line${i % 2 === 0 ? " ag-grid-line--hour" : ""}`} style={{ top: i * SLOT_H }} />
              ))}
            </div>
            <div className="ag-cols">
              {visibleIsoDays.map((iso) => (
                <DayColumn
                  key={iso}
                  iso={iso}
                  dayAppointments={visibleAppointments.filter((apt) => apt.date === iso)}
                  dayBlocks={visibleBlocks.filter((block) => block.date === iso)}
                  onAptClick={setSelectedApt}
                  onSlotClick={(date, time) => { setActionTab("agendar"); setActionDate(date); setActionTime(time); }}
                  startHour={startHour}
                  totalSlots={totalSlots}
                  professionals={professionals}
                />
              ))}
            </div>
            {loading && (
              <div className="ag-loading">
                <Loader2 size={24} className="spin" />
              </div>
            )}
          </div>
        </div>
      )}

      <div className="ag-legend">
        <span className="ag-legend-item"><span className="ag-legend-dot" style={{ background: AVAILABLE_BG, border: "1px solid #CBD5E1" }} />Disponible</span>
        <span className="ag-legend-item"><span className="ag-legend-dot" style={{ background: DEFAULT_PASTELS[0] }} />Agendado</span>
        <span className="ag-legend-item"><span className="ag-legend-dot" style={{ background: COMPLETED_BG }} />Completado</span>
        <span className="ag-legend-item"><span className="ag-legend-dot" style={{ background: BLOCKED_BG, borderRadius: 2 }} />Bloqueado</span>
      </div>
    </div>
  );
}
