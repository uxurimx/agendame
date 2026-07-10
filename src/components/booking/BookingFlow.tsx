"use client";

import { useState, useEffect, useCallback } from "react";
import { formatTime, addMinutes } from "@/lib/time";
import {
  Calendar, Clock, ChevronLeft, ChevronRight,
  CheckCircle, User, Scissors, Phone, Mail, Loader2,
} from "lucide-react";

// ── Types ─────────────────────────────────────────────────────
interface ServiceInfo {
  id:          string;
  name:        string;
  price:       number;
  durationMin: number;
  description?: string;
  category?:   string;
}
interface ProInfo {
  id:       string;
  name:     string;
  avatarUrl?: string;
}
interface BusinessInfo {
  id:       string;
  name:     string;
  slug:     string;
  type:     string;
  phone?:   string;
  logoUrl?: string;
  schedule: Record<string, { open: string; close: string; closed: boolean }> | null;
}
interface SlotItem {
  time:             string;
  professionalIds:  string[];
}
interface BookingFlowProps {
  business:      BusinessInfo;
  professionals: ProInfo[];
  services:      ServiceInfo[];
}

const STEPS = ["Servicio", "Profesional", "Fecha", "Tus datos"];
const DAY_LABELS = ["Dom", "Lun", "Mar", "Mié", "Jue", "Vie", "Sáb"];
const DAY_KEYS   = ["sun", "mon", "tue", "wed", "thu", "fri", "sat"];
const MONTH_NAMES = [
  "Enero", "Febrero", "Marzo", "Abril", "Mayo", "Junio",
  "Julio", "Agosto", "Septiembre", "Octubre", "Noviembre", "Diciembre",
];

function formatDateDisplay(dateStr: string): string {
  const d = new Date(dateStr + "T12:00:00");
  return `${DAY_LABELS[d.getDay()]} ${d.getDate()} de ${MONTH_NAMES[d.getMonth()]}`;
}

// ── Calendar ──────────────────────────────────────────────────
function BookingCalendar({
  schedule,
  selected,
  onSelect,
}: {
  schedule: BusinessInfo["schedule"];
  selected?: string;
  onSelect: (d: string) => void;
}) {
  const [viewDate, setViewDate] = useState(() => new Date());
  const today = new Date();
  today.setHours(0, 0, 0, 0);

  const year  = viewDate.getFullYear();
  const month = viewDate.getMonth();
  const firstDay = new Date(year, month, 1).getDay();
  const daysInMonth = new Date(year, month + 1, 0).getDate();

  function isDisabled(day: number): boolean {
    const d = new Date(year, month, day);
    if (d < today) return true;
    const dayKey = DAY_KEYS[d.getDay()];
    const s = schedule?.[dayKey];
    return !s || s.closed;
  }

  function toISO(day: number): string {
    return `${year}-${String(month + 1).padStart(2, "0")}-${String(day).padStart(2, "0")}`;
  }

  function prevMonth() {
    setViewDate(new Date(year, month - 1, 1));
  }
  function nextMonth() {
    setViewDate(new Date(year, month + 1, 1));
  }

  return (
    <div className="calendar-wrap">
      <div className="cal-header">
        <button type="button" onClick={prevMonth} className="cal-nav-btn"><ChevronLeft size={16} /></button>
        <span className="cal-month-label">{MONTH_NAMES[month]} {year}</span>
        <button type="button" onClick={nextMonth} className="cal-nav-btn"><ChevronRight size={16} /></button>
      </div>
      <div className="cal-grid-header">
        {DAY_LABELS.map((l) => <span key={l}>{l}</span>)}
      </div>
      <div className="cal-grid">
        {Array.from({ length: firstDay }, (_, i) => <span key={`e${i}`} />)}
        {Array.from({ length: daysInMonth }, (_, i) => {
          const day     = i + 1;
          const iso     = toISO(day);
          const disabled = isDisabled(day);
          const isSelected = selected === iso;
          return (
            <button
              key={day}
              type="button"
              disabled={disabled}
              onClick={() => onSelect(iso)}
              className={`cal-day${disabled ? " cal-day--off" : ""}${isSelected ? " cal-day--selected" : ""}`}
            >
              {day}
            </button>
          );
        })}
      </div>
    </div>
  );
}

// ── Confirmation Ticket ───────────────────────────────────────
function ConfirmationTicket({
  business,
  service,
  professional,
  date,
  startTime,
  clientName,
  clientPhone,
  onNew,
}: {
  business:     BusinessInfo;
  service:      ServiceInfo;
  professional: ProInfo | null;
  date:         string;
  startTime:    string;
  clientName:   string;
  clientPhone:  string;
  onNew: () => void;
}) {
  const endTime = addMinutes(startTime, service.durationMin);
  return (
    <div className="bk-ticket-wrap">
      <div className="bk-ticket">
        <div className="bk-ticket-top">
          <CheckCircle size={40} color="#6E2A96" />
          <h2 className="bk-ticket-title">¡Cita confirmada!</h2>
          <p className="bk-ticket-sub">{business.name}</p>
        </div>
        <div className="bk-ticket-perf" />
        <div className="bk-ticket-body">
          <Row label="Servicio"       value={service.name} />
          <Row label="Con"            value={professional?.name ?? "Cualquier profesional"} />
          <Row label="Fecha"          value={formatDateDisplay(date)} />
          <Row label="Hora"           value={`${formatTime(startTime)} – ${formatTime(endTime)}`} />
          <Row label="Precio"         value={`$${service.price.toLocaleString("es-MX")} MXN`} />
          <Row label="Nombre"         value={clientName} />
          <Row label="Teléfono"       value={clientPhone} />
        </div>
        <div className="bk-ticket-footer">
          <p>Se te avisará por WhatsApp si hubo algún cambio.</p>
        </div>
      </div>
      <button type="button" className="bk-btn-ghost" onClick={onNew}>
        Agendar otra cita
      </button>
    </div>
  );
}

function Row({ label, value }: { label: string; value: string }) {
  return (
    <div className="bk-ticket-row">
      <span className="bk-ticket-label">{label}</span>
      <span className="bk-ticket-value">{value}</span>
    </div>
  );
}

// ── Main Component ────────────────────────────────────────────
export function BookingFlow({ business, professionals, services }: BookingFlowProps) {
  const [step,            setStep]            = useState(0);
  const [selectedService, setSelectedService] = useState<ServiceInfo | null>(null);
  const [selectedPro,     setSelectedPro]     = useState<ProInfo | null | "any">(null); // null=sin elegir, "any"=cualquiera
  const [selectedDate,    setSelectedDate]    = useState<string>("");
  const [selectedSlot,    setSelectedSlot]    = useState<string>("");
  const [slots,           setSlots]           = useState<SlotItem[]>([]);
  const [loadingSlots,    setLoadingSlots]    = useState(false);
  const [slotsClosed,     setSlotsClosed]     = useState(false);
  const [confirmed,       setConfirmed]       = useState(false);
  const [confirmedPro,    setConfirmedPro]    = useState<ProInfo | null>(null);
  const [submitting,      setSubmitting]      = useState(false);
  const [error,           setError]           = useState<string>("");

  // Form fields
  const [clientName,  setClientName]  = useState("");
  const [clientPhone, setClientPhone] = useState("");
  const [clientEmail, setClientEmail] = useState("");
  const [notes,       setNotes]       = useState("");
  const [_hp,         setHp]          = useState(""); // honeypot: humanos nunca lo llenan

  // Cargar slots cuando fecha / profesional cambian
  const loadSlots = useCallback(async () => {
    if (!selectedDate || !selectedService) return;
    setLoadingSlots(true);
    setSlots([]);
    setSelectedSlot("");
    setSlotsClosed(false);
    try {
      const proParam = selectedPro === "any" || selectedPro === null ? "any" : selectedPro.id;
      const res = await fetch(
        `/api/book/slots?businessId=${business.id}&serviceId=${selectedService.id}` +
        `&professionalId=${proParam}&date=${selectedDate}&durationMin=${selectedService.durationMin}`
      );
      const data = await res.json();
      if (data.closed) {
        setSlotsClosed(true);
      } else {
        setSlots(data.slots ?? []);
      }
    } finally {
      setLoadingSlots(false);
    }
  }, [selectedDate, selectedService, selectedPro, business.id]);

  useEffect(() => {
    if (step === 2 && selectedDate) loadSlots();
  }, [step, selectedDate, loadSlots]);

  async function handleSubmit() {
    if (!selectedService || !selectedDate || !selectedSlot) return;
    setSubmitting(true);
    setError("");
    try {
      const proId = selectedPro === "any" || selectedPro === null ? "any" : selectedPro.id;
      const res = await fetch("/api/book/appointment", {
        method:  "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          businessId:     business.id,
          professionalId: proId,
          serviceId:      selectedService.id,
          date:           selectedDate,
          startTime:      selectedSlot,
          clientName:     clientName.trim(),
          clientPhone:    clientPhone.trim(),
          clientEmail:    clientEmail.trim(),
          notes:          notes.trim(),
          _hp,
        }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error ?? "Error al confirmar");
      // Resolver profesional para el ticket
      const assignedPro = professionals.find((p) => p.id === data.professionalId) ?? null;
      setConfirmedPro(assignedPro);
      setConfirmed(true);
    } catch (e: unknown) {
      setError(e instanceof Error ? e.message : "Error al confirmar la cita");
    } finally {
      setSubmitting(false);
    }
  }

  function reset() {
    setStep(0);
    setSelectedService(null);
    setSelectedPro(null);
    setSelectedDate("");
    setSelectedSlot("");
    setSlots([]);
    setClientName("");
    setClientPhone("");
    setClientEmail("");
    setNotes("");
    setError("");
    setConfirmed(false);
  }

  if (confirmed && selectedService && selectedDate && selectedSlot) {
    return (
      <ConfirmationTicket
        business={business}
        service={selectedService}
        professional={confirmedPro}
        date={selectedDate}
        startTime={selectedSlot}
        clientName={clientName}
        clientPhone={clientPhone}
        onNew={reset}
      />
    );
  }

  const canNext =
    (step === 0 && !!selectedService) ||
    (step === 1 && selectedPro !== null) ||
    (step === 2 && !!selectedSlot) ||
    step === 3;

  return (
    <div className="bk-root">
      {/* Header */}
      <header className="bk-header">
        {business.logoUrl ? (
          <img src={business.logoUrl} alt={business.name} className="bk-logo" />
        ) : (
          <div className="bk-logo-placeholder"><Scissors size={22} /></div>
        )}
        <div>
          <h1 className="bk-biz-name">{business.name}</h1>
          <p className="bk-biz-type">{business.type}</p>
        </div>
      </header>

      {/* Progress */}
      <div className="bk-progress">
        {STEPS.map((label, i) => (
          <div key={i} className={`bk-step${i <= step ? " bk-step--done" : ""}`}>
            <div className="bk-step-dot">{i < step ? "✓" : i + 1}</div>
            <span className="bk-step-label">{label}</span>
          </div>
        ))}
      </div>

      {/* Content */}
      <div className="bk-card">
        {/* Step 0: Servicios */}
        {step === 0 && (
          <div>
            <h2 className="bk-section-title"><Scissors size={18} /> Elige un servicio</h2>
            <div className="bk-service-list">
              {services.map((svc) => (
                <button
                  key={svc.id}
                  type="button"
                  onClick={() => setSelectedService(svc)}
                  className={`bk-service-item${selectedService?.id === svc.id ? " bk-service-item--selected" : ""}`}
                >
                  <div className="bk-service-info">
                    <span className="bk-service-name">{svc.name}</span>
                    {svc.description && <span className="bk-service-desc">{svc.description}</span>}
                  </div>
                  <div className="bk-service-meta">
                    <span className="bk-service-price">${svc.price.toLocaleString("es-MX")}</span>
                    <span className="bk-service-dur">{svc.durationMin} min</span>
                  </div>
                </button>
              ))}
            </div>
          </div>
        )}

        {/* Step 1: Profesional */}
        {step === 1 && (
          <div>
            <h2 className="bk-section-title"><User size={18} /> ¿Con quién?</h2>
            <div className="bk-pro-list">
              <button
                type="button"
                onClick={() => setSelectedPro("any")}
                className={`bk-pro-item${selectedPro === "any" ? " bk-pro-item--selected" : ""}`}
              >
                <div className="bk-pro-avatar bk-pro-avatar--any">✨</div>
                <div>
                  <p className="bk-pro-name">Cualquier profesional</p>
                  <p className="bk-pro-sub">El primero disponible</p>
                </div>
              </button>
              {professionals.map((pro) => (
                <button
                  key={pro.id}
                  type="button"
                  onClick={() => setSelectedPro(pro)}
                  className={`bk-pro-item${
                    (selectedPro as ProInfo)?.id === pro.id ? " bk-pro-item--selected" : ""
                  }`}
                >
                  <div className="bk-pro-avatar">
                    {pro.avatarUrl
                      ? <img src={pro.avatarUrl} alt={pro.name} />
                      : pro.name.charAt(0).toUpperCase()}
                  </div>
                  <p className="bk-pro-name">{pro.name}</p>
                </button>
              ))}
            </div>
          </div>
        )}

        {/* Step 2: Fecha y hora */}
        {step === 2 && (
          <div>
            <h2 className="bk-section-title"><Calendar size={18} /> Selecciona fecha</h2>
            <BookingCalendar
              schedule={business.schedule}
              selected={selectedDate}
              onSelect={(d) => { setSelectedDate(d); setSelectedSlot(""); }}
            />

            {selectedDate && (
              <div className="bk-slots-section">
                <h3 className="bk-slots-title">
                  <Clock size={16} /> Horarios disponibles · {formatDateDisplay(selectedDate)}
                </h3>
                {loadingSlots && (
                  <div className="bk-slots-loading"><Loader2 size={20} className="spin" /> Cargando…</div>
                )}
                {!loadingSlots && slotsClosed && (
                  <p className="bk-slots-empty">Cerrado este día.</p>
                )}
                {!loadingSlots && !slotsClosed && slots.length === 0 && (
                  <p className="bk-slots-empty">Sin disponibilidad para este día.</p>
                )}
                {!loadingSlots && slots.length > 0 && (
                  <div className="bk-slots-grid">
                    {slots.map(({ time }) => (
                      <button
                        key={time}
                        type="button"
                        onClick={() => setSelectedSlot(time)}
                        className={`bk-slot${selectedSlot === time ? " bk-slot--selected" : ""}`}
                      >
                        {formatTime(time)}
                      </button>
                    ))}
                  </div>
                )}
              </div>
            )}
          </div>
        )}

        {/* Step 3: Datos del cliente */}
        {step === 3 && (
          <div>
            <h2 className="bk-section-title"><Phone size={18} /> Tus datos</h2>
            <div className="bk-summary-pill">
              <strong>{selectedService?.name}</strong> · {selectedDate && formatDateDisplay(selectedDate)} · {selectedSlot && formatTime(selectedSlot)}
            </div>
            <div className="bk-form">
              <label className="bk-label">
                Nombre <span className="bk-required">*</span>
                <input
                  type="text"
                  value={clientName}
                  onChange={(e) => setClientName(e.target.value)}
                  placeholder="Tu nombre completo"
                  className="bk-input"
                  required
                />
              </label>
              <label className="bk-label">
                Teléfono <span className="bk-required">*</span>
                <input
                  type="tel"
                  value={clientPhone}
                  onChange={(e) => setClientPhone(e.target.value)}
                  placeholder="Ej: 5551234567"
                  className="bk-input"
                  required
                />
              </label>
              <label className="bk-label">
                Email <span className="bk-optional">(opcional)</span>
                <input
                  type="email"
                  value={clientEmail}
                  onChange={(e) => setClientEmail(e.target.value)}
                  placeholder="tu@email.com"
                  className="bk-input"
                />
              </label>
              <label className="bk-label">
                Notas <span className="bk-optional">(opcional)</span>
                <textarea
                  value={notes}
                  onChange={(e) => setNotes(e.target.value)}
                  placeholder="Referencias, alergias, preferencias…"
                  className="bk-textarea"
                  rows={3}
                />
              </label>
              {/* honeypot: invisible para humanos, atrae bots */}
              <div aria-hidden="true" style={{ position: "absolute", left: "-9999px", width: 0, height: 0, overflow: "hidden" }}>
                <input tabIndex={-1} autoComplete="off" value={_hp} onChange={(e) => setHp(e.target.value)} />
              </div>
            </div>
            {error && <p className="bk-error">{error}</p>}
          </div>
        )}
      </div>

      {/* Navigation */}
      <div className="bk-nav">
        {step > 0 && (
          <button type="button" onClick={() => setStep(step - 1)} className="bk-btn-back">
            <ChevronLeft size={18} /> Atrás
          </button>
        )}
        <div style={{ flex: 1 }} />
        {step < 3 ? (
          <button
            type="button"
            disabled={!canNext}
            onClick={() => setStep(step + 1)}
            className="bk-btn-next"
          >
            Siguiente <ChevronRight size={18} />
          </button>
        ) : (
          <button
            type="button"
            disabled={submitting || !clientName.trim() || !clientPhone.trim()}
            onClick={handleSubmit}
            className="bk-btn-confirm"
          >
            {submitting ? <><Loader2 size={16} className="spin" /> Confirmando…</> : "Confirmar cita"}
          </button>
        )}
      </div>
    </div>
  );
}
