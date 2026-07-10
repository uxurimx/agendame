"use client";

import { useState, useEffect, useCallback } from "react";
import { useRouter } from "next/navigation";
import { slugify } from "@/lib/slugify";

// ── Constantes ────────────────────────────────────────────────
const BUSINESS_TYPES = [
  { value: "manicura",   label: "Manicurista / Nailista" },
  { value: "lashista",   label: "Lashista / Cejas" },
  { value: "barberia",   label: "Barbería" },
  { value: "estetica",   label: "Estética / Salón" },
  { value: "estilista",  label: "Estilista" },
  { value: "otro",       label: "Otro tipo de negocio" },
];

const DURATIONS = [
  { value: 15,  label: "15 min" },
  { value: 30,  label: "30 min" },
  { value: 45,  label: "45 min" },
  { value: 60,  label: "1 hora" },
  { value: 90,  label: "1:30 hrs" },
  { value: 120, label: "2 horas" },
  { value: 150, label: "2:30 hrs" },
  { value: 180, label: "3 horas" },
];

const DAYS = [
  { key: "mon", label: "Lunes" },
  { key: "tue", label: "Martes" },
  { key: "wed", label: "Miércoles" },
  { key: "thu", label: "Jueves" },
  { key: "fri", label: "Viernes" },
  { key: "sat", label: "Sábado" },
  { key: "sun", label: "Domingo" },
];

function timeslots() {
  const slots: string[] = [];
  for (let h = 6; h <= 22; h++) {
    slots.push(`${String(h).padStart(2, "0")}:00`);
    if (h < 22) slots.push(`${String(h).padStart(2, "0")}:30`);
  }
  return slots;
}
const TIME_SLOTS = timeslots();

const DEFAULT_SCHEDULE = {
  mon: { open: "09:00", close: "19:00", closed: false },
  tue: { open: "09:00", close: "19:00", closed: false },
  wed: { open: "09:00", close: "19:00", closed: false },
  thu: { open: "09:00", close: "19:00", closed: false },
  fri: { open: "09:00", close: "19:00", closed: false },
  sat: { open: "09:00", close: "15:00", closed: false },
  sun: { open: "09:00", close: "15:00", closed: true },
};

// ── Types ─────────────────────────────────────────────────────
type ServiceRow = { name: string; price: string; durationMin: number };
type DaySchedule = { open: string; close: string; closed: boolean };
type Schedule = Record<string, DaySchedule>;

// ── Shared styles ─────────────────────────────────────────────
const input =
  "w-full px-4 py-3 rounded-xl border text-sm outline-none transition-all bg-white";
const inputStyle = { borderColor: "#e0d9e8", color: "#1A1420" };
const focusStyle = { borderColor: "#6E2A96", boxShadow: "0 0 0 3px rgba(110,42,150,0.12)" };

function Input({ label, error, ...props }: React.InputHTMLAttributes<HTMLInputElement> & { label: string; error?: string }) {
  const [focused, setFocused] = useState(false);
  return (
    <div className="flex flex-col gap-1">
      <label className="text-sm font-medium" style={{ color: "#1A1420" }}>{label}</label>
      <input
        className={input}
        style={{ ...(focused ? focusStyle : inputStyle) }}
        onFocus={() => setFocused(true)}
        onBlur={() => setFocused(false)}
        {...props}
      />
      {error && <p className="text-xs" style={{ color: "#dc2626" }}>{error}</p>}
    </div>
  );
}

// ── Progress bar ──────────────────────────────────────────────
function Progress({ step }: { step: number }) {
  const steps = ["Tu negocio", "Servicios", "Horario", "¡Listo!"];
  return (
    <div className="mb-8">
      <div className="flex items-center justify-between mb-3">
        {steps.map((s, i) => (
          <div key={s} className="flex items-center gap-2 flex-1 last:flex-none">
            <div
              className="w-8 h-8 rounded-full flex items-center justify-center text-xs font-bold transition-all duration-300 flex-shrink-0"
              style={
                i < step
                  ? { background: "linear-gradient(135deg,#6E2A96,#E8631F)", color: "#fff" }
                  : i === step
                  ? { background: "#6E2A96", color: "#fff", boxShadow: "0 0 0 4px rgba(110,42,150,0.2)" }
                  : { background: "#EFE6F5", color: "#6b6270" }
              }
            >
              {i < step ? "✓" : i + 1}
            </div>
            <span className="text-xs hidden sm:block font-medium" style={{ color: i <= step ? "#6E2A96" : "#6b6270" }}>
              {s}
            </span>
            {i < steps.length - 1 && (
              <div
                className="flex-1 h-0.5 mx-2 rounded transition-all duration-300"
                style={{ background: i < step ? "linear-gradient(to right,#6E2A96,#E8631F)" : "#EFE6F5" }}
              />
            )}
          </div>
        ))}
      </div>
    </div>
  );
}

// ── Botón primario ─────────────────────────────────────────────
function BtnPrimary({ children, loading, ...props }: React.ButtonHTMLAttributes<HTMLButtonElement> & { loading?: boolean }) {
  return (
    <button
      className="w-full py-3.5 rounded-xl font-semibold text-white transition-all text-sm"
      style={{ background: "linear-gradient(135deg,#6E2A96,#E8631F)", opacity: loading ? 0.7 : 1 }}
      disabled={loading}
      {...props}
    >
      {loading ? "Guardando..." : children}
    </button>
  );
}

// ── STEP 1: Negocio ───────────────────────────────────────────
function Step1({
  onNext,
}: {
  onNext: (businessId: string, slug: string) => void;
}) {
  const [name, setName]     = useState("");
  const [type, setType]     = useState("manicura");
  const [slug, setSlug]     = useState("");
  const [phone, setPhone]   = useState("");
  const [slugOk, setSlugOk] = useState<boolean | null>(null);
  const [error, setError]   = useState("");
  const [loading, setLoading] = useState(false);

  // Auto-generar slug desde el nombre
  useEffect(() => {
    if (name) setSlug(slugify(name));
  }, [name]);

  // Verificar disponibilidad del slug con debounce
  const checkSlug = useCallback(async (s: string) => {
    if (!s || s.length < 3) { setSlugOk(null); return; }
    const res = await fetch(`/api/onboarding/check-slug?slug=${encodeURIComponent(s)}`);
    const { available } = await res.json();
    setSlugOk(available);
  }, []);

  useEffect(() => {
    setSlugOk(null);
    const id = setTimeout(() => checkSlug(slug), 500);
    return () => clearTimeout(id);
  }, [slug, checkSlug]);

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    setError("");
    if (!name.trim()) { setError("El nombre es requerido"); return; }
    if (slugOk === false) { setError("Ese link ya está en uso, elige otro"); return; }

    setLoading(true);
    const res = await fetch("/api/onboarding/business", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ name, type, slug, phone }),
    });
    const json = await res.json();
    setLoading(false);

    if (!res.ok) {
      setError(json.error === "slug_taken" ? "Ese link ya está en uso" : json.error ?? "Error al guardar");
      return;
    }
    onNext(json.businessId, json.slug);
  }

  const slugStatus = slug.length < 3 ? null : slugOk === null ? "checking" : slugOk ? "ok" : "taken";

  return (
    <form onSubmit={submit} className="flex flex-col gap-5">
      <Input
        label="Nombre de tu negocio"
        placeholder="Ej: Nails by Sofía"
        value={name}
        onChange={(e) => setName(e.target.value)}
        required
      />

      <div className="flex flex-col gap-1">
        <label className="text-sm font-medium" style={{ color: "#1A1420" }}>¿Qué tipo de negocio es?</label>
        <select
          className={input + " cursor-pointer"}
          style={inputStyle}
          value={type}
          onChange={(e) => setType(e.target.value)}
        >
          {BUSINESS_TYPES.map((t) => (
            <option key={t.value} value={t.value}>{t.label}</option>
          ))}
        </select>
      </div>

      <div className="flex flex-col gap-1">
        <label className="text-sm font-medium" style={{ color: "#1A1420" }}>Tu link de reservas</label>
        <div className="flex items-center rounded-xl border overflow-hidden" style={{ borderColor: "#e0d9e8" }}>
          <span className="px-3 py-3 text-sm flex-shrink-0" style={{ background: "#EFE6F5", color: "#6b6270" }}>
            agendame.mx/book/
          </span>
          <input
            className="flex-1 px-3 py-3 text-sm outline-none bg-white font-mono"
            style={{ color: "#6E2A96" }}
            value={slug}
            onChange={(e) => setSlug(slugify(e.target.value))}
            placeholder="tu-negocio"
          />
          <span className="px-3 text-lg">
            {slugStatus === "ok"       && "✓"}
            {slugStatus === "taken"    && "✗"}
            {slugStatus === "checking" && "…"}
          </span>
        </div>
        {slugStatus === "ok"    && <p className="text-xs" style={{ color: "#3E7C74" }}>¡Disponible!</p>}
        {slugStatus === "taken" && <p className="text-xs" style={{ color: "#dc2626" }}>Ya está en uso, elige otro</p>}
      </div>

      <Input
        label="Teléfono (opcional)"
        placeholder="+52 55 1234 5678"
        type="tel"
        value={phone}
        onChange={(e) => setPhone(e.target.value)}
      />

      {error && <p className="text-sm text-center" style={{ color: "#dc2626" }}>{error}</p>}
      <BtnPrimary loading={loading}>Siguiente →</BtnPrimary>
    </form>
  );
}

// ── STEP 2: Servicios ─────────────────────────────────────────
function Step2({
  businessId,
  onNext,
  onBack,
}: {
  businessId: string;
  onNext: () => void;
  onBack: () => void;
}) {
  const [rows, setRows] = useState<ServiceRow[]>([
    { name: "", price: "", durationMin: 60 },
  ]);
  const [error, setError]     = useState("");
  const [loading, setLoading] = useState(false);

  function updateRow(i: number, field: keyof ServiceRow, value: string | number) {
    setRows((prev) => prev.map((r, idx) => idx === i ? { ...r, [field]: value } : r));
  }

  function addRow() {
    setRows((prev) => [...prev, { name: "", price: "", durationMin: 60 }]);
  }

  function removeRow(i: number) {
    if (rows.length === 1) return;
    setRows((prev) => prev.filter((_, idx) => idx !== i));
  }

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    setError("");
    const valid = rows.filter((r) => r.name.trim() && parseFloat(r.price) >= 0);
    if (!valid.length) { setError("Agrega al menos un servicio"); return; }

    setLoading(true);
    const res = await fetch("/api/onboarding/services", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        businessId,
        services: valid.map((r) => ({
          name:        r.name.trim(),
          price:       parseFloat(r.price),
          durationMin: r.durationMin,
        })),
      }),
    });
    setLoading(false);
    if (!res.ok) { setError("Error al guardar los servicios"); return; }
    onNext();
  }

  return (
    <form onSubmit={submit} className="flex flex-col gap-4">
      <p className="text-sm" style={{ color: "#6b6270" }}>
        Agrega los servicios que ofreces. Puedes agregar más desde el panel después.
      </p>

      <div className="flex flex-col gap-3">
        {rows.map((row, i) => (
          <div key={i} className="flex gap-2 items-start p-3 rounded-xl" style={{ background: "#EFE6F5" }}>
            <div className="flex-1 flex flex-col gap-2">
              <input
                className="w-full px-3 py-2 rounded-lg border text-sm bg-white outline-none"
                style={{ borderColor: "#e0d9e8" }}
                placeholder="Nombre del servicio"
                value={row.name}
                onChange={(e) => updateRow(i, "name", e.target.value)}
              />
              <div className="flex gap-2">
                <div className="relative flex-1">
                  <span className="absolute left-3 top-1/2 -translate-y-1/2 text-sm" style={{ color: "#6b6270" }}>$</span>
                  <input
                    className="w-full pl-7 pr-3 py-2 rounded-lg border text-sm bg-white outline-none"
                    style={{ borderColor: "#e0d9e8" }}
                    placeholder="Precio MXN"
                    type="number"
                    min="0"
                    value={row.price}
                    onChange={(e) => updateRow(i, "price", e.target.value)}
                  />
                </div>
                <select
                  className="px-2 py-2 rounded-lg border text-sm bg-white outline-none cursor-pointer"
                  style={{ borderColor: "#e0d9e8" }}
                  value={row.durationMin}
                  onChange={(e) => updateRow(i, "durationMin", Number(e.target.value))}
                >
                  {DURATIONS.map((d) => (
                    <option key={d.value} value={d.value}>{d.label}</option>
                  ))}
                </select>
              </div>
            </div>
            {rows.length > 1 && (
              <button
                type="button"
                onClick={() => removeRow(i)}
                className="mt-1 text-lg leading-none"
                style={{ color: "#6b6270" }}
              >
                ×
              </button>
            )}
          </div>
        ))}
      </div>

      <button
        type="button"
        onClick={addRow}
        className="text-sm font-medium py-2 rounded-xl border border-dashed transition-colors"
        style={{ borderColor: "#6E2A96", color: "#6E2A96" }}
      >
        + Agregar otro servicio
      </button>

      {error && <p className="text-sm text-center" style={{ color: "#dc2626" }}>{error}</p>}

      <div className="flex gap-3 mt-2">
        <button
          type="button"
          onClick={onBack}
          className="flex-1 py-3 rounded-xl border text-sm font-medium"
          style={{ borderColor: "#e0d9e8", color: "#6b6270" }}
        >
          ← Atrás
        </button>
        <div className="flex-1">
          <BtnPrimary loading={loading}>Siguiente →</BtnPrimary>
        </div>
      </div>
    </form>
  );
}

// ── STEP 3: Horario ───────────────────────────────────────────
function Step3({
  businessId,
  onNext,
  onBack,
}: {
  businessId: string;
  onNext: () => void;
  onBack: () => void;
}) {
  const [schedule, setSchedule] = useState<Schedule>(DEFAULT_SCHEDULE);
  const [loading, setLoading]   = useState(false);
  const [error, setError]       = useState("");

  function updateDay(day: string, field: keyof DaySchedule, value: string | boolean) {
    setSchedule((prev) => ({ ...prev, [day]: { ...prev[day], [field]: value } }));
  }

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    setLoading(true);
    const res = await fetch("/api/onboarding/schedule", {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ businessId, schedule }),
    });
    setLoading(false);
    if (!res.ok) { setError("Error al guardar el horario"); return; }
    onNext();
  }

  return (
    <form onSubmit={submit} className="flex flex-col gap-4">
      <p className="text-sm" style={{ color: "#6b6270" }}>
        Define cuándo atiendes. Puedes modificarlo después desde ajustes.
      </p>

      <div className="flex flex-col gap-2">
        {DAYS.map(({ key, label }) => {
          const day = schedule[key];
          return (
            <div
              key={key}
              className="flex items-center gap-3 px-3 py-2.5 rounded-xl"
              style={{ background: day.closed ? "#f5f5fa" : "#EFE6F5" }}
            >
              {/* Toggle */}
              <button
                type="button"
                onClick={() => updateDay(key, "closed", !day.closed)}
                className="w-10 h-5 rounded-full transition-all flex-shrink-0 relative"
                style={{ background: day.closed ? "#e0d9e8" : "#6E2A96" }}
              >
                <span
                  className="absolute top-0.5 w-4 h-4 rounded-full bg-white transition-all"
                  style={{ left: day.closed ? "2px" : "22px" }}
                />
              </button>

              {/* Día */}
              <span
                className="w-24 text-sm font-medium flex-shrink-0"
                style={{ color: day.closed ? "#6b6270" : "#1A1420" }}
              >
                {label}
              </span>

              {day.closed ? (
                <span className="text-xs" style={{ color: "#6b6270" }}>Cerrado</span>
              ) : (
                <div className="flex items-center gap-2 flex-1">
                  <select
                    className="flex-1 px-2 py-1 rounded-lg border text-xs bg-white outline-none cursor-pointer"
                    style={{ borderColor: "#e0d9e8" }}
                    value={day.open}
                    onChange={(e) => updateDay(key, "open", e.target.value)}
                  >
                    {TIME_SLOTS.map((t) => <option key={t} value={t}>{t}</option>)}
                  </select>
                  <span className="text-xs" style={{ color: "#6b6270" }}>a</span>
                  <select
                    className="flex-1 px-2 py-1 rounded-lg border text-xs bg-white outline-none cursor-pointer"
                    style={{ borderColor: "#e0d9e8" }}
                    value={day.close}
                    onChange={(e) => updateDay(key, "close", e.target.value)}
                  >
                    {TIME_SLOTS.map((t) => <option key={t} value={t}>{t}</option>)}
                  </select>
                </div>
              )}
            </div>
          );
        })}
      </div>

      {error && <p className="text-sm text-center" style={{ color: "#dc2626" }}>{error}</p>}

      <div className="flex gap-3 mt-2">
        <button
          type="button"
          onClick={onBack}
          className="flex-1 py-3 rounded-xl border text-sm font-medium"
          style={{ borderColor: "#e0d9e8", color: "#6b6270" }}
        >
          ← Atrás
        </button>
        <div className="flex-1">
          <BtnPrimary loading={loading}>Terminar →</BtnPrimary>
        </div>
      </div>
    </form>
  );
}

// ── STEP 4: Done ──────────────────────────────────────────────
function Step4({ slug }: { slug: string }) {
  const router  = useRouter();
  const link    = `agendame.mx/book/${slug}`;
  const [copied, setCopied] = useState(false);

  function copy() {
    navigator.clipboard.writeText(`https://${link}`);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  }

  return (
    <div className="flex flex-col items-center gap-6 text-center">
      {/* Ticket decorativo */}
      <div
        className="w-16 h-16 rounded-full flex items-center justify-center text-3xl"
        style={{ background: "linear-gradient(135deg,#6E2A96,#E8631F)" }}
      >
        🎉
      </div>

      <div>
        <h2 className="text-xl font-semibold" style={{ fontFamily: "var(--font-fraunces), Georgia, serif", color: "#1A1420" }}>
          ¡Tu negocio está listo!
        </h2>
        <p className="text-sm mt-2" style={{ color: "#6b6270" }}>
          Ya tienes tu link de reservas. Compártelo en tus redes y empieza a recibir citas.
        </p>
      </div>

      {/* Link */}
      <div
        className="w-full px-4 py-3 rounded-xl flex items-center justify-between gap-3"
        style={{ background: "#EFE6F5", border: "1px solid #e0d9e8" }}
      >
        <span className="text-sm font-mono font-medium truncate" style={{ color: "#6E2A96" }}>
          {link}
        </span>
        <button
          onClick={copy}
          className="text-xs font-semibold px-3 py-1.5 rounded-lg flex-shrink-0 transition-colors"
          style={{ background: copied ? "#3E7C74" : "#6E2A96", color: "#fff" }}
        >
          {copied ? "¡Copiado!" : "Copiar"}
        </button>
      </div>

      <button
        onClick={() => router.push("/overview")}
        className="w-full py-3.5 rounded-xl font-semibold text-white text-sm"
        style={{ background: "linear-gradient(135deg,#6E2A96,#E8631F)" }}
      >
        Ir a mi panel →
      </button>
    </div>
  );
}

// ── Flow principal ────────────────────────────────────────────
export default function OnboardingFlow() {
  const [step, setStep]           = useState(0);
  const [businessId, setBusinessId] = useState("");
  const [slug, setSlug]           = useState("");

  const titles = ["Cuéntanos de tu negocio", "¿Qué servicios ofreces?", "¿Cuándo atiendes?", "¡Todo listo!"];

  return (
    <div className="w-full max-w-lg">
      {/* Card */}
      <div
        className="rounded-2xl shadow-lg p-8"
        style={{ background: "#fff", boxShadow: "0 24px 48px rgba(36,26,34,0.10)" }}
      >
        <Progress step={step} />

        <h1
          className="text-2xl font-semibold mb-6"
          style={{ fontFamily: "var(--font-fraunces), Georgia, serif", color: "#1A1420" }}
        >
          {titles[step]}
        </h1>

        {step === 0 && (
          <Step1
            onNext={(id, s) => { setBusinessId(id); setSlug(s); setStep(1); }}
          />
        )}
        {step === 1 && (
          <Step2
            businessId={businessId}
            onNext={() => setStep(2)}
            onBack={() => setStep(0)}
          />
        )}
        {step === 2 && (
          <Step3
            businessId={businessId}
            onNext={() => setStep(3)}
            onBack={() => setStep(1)}
          />
        )}
        {step === 3 && <Step4 slug={slug} />}
      </div>

      {step < 3 && (
        <p className="text-center text-xs mt-4" style={{ color: "#6b6270" }}>
          Paso {step + 1} de 3 · Puedes completar el resto desde tu panel
        </p>
      )}
    </div>
  );
}
