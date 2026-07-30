"use client";

import { useState, type ChangeEvent } from "react";
import { Check, Copy, Image as ImageIcon, Loader2, Pencil, X } from "lucide-react";
import { normalizeReferenceImageDataUrl } from "@/lib/reference-image";
import { getEffectiveTrialEndsAt } from "@/lib/trial";

type DayKey = "mon" | "tue" | "wed" | "thu" | "fri" | "sat" | "sun";
type ScheduleDay = { open: string; close: string; closed: boolean };
type BusinessSchedule = Record<string, ScheduleDay>;

const DAYS: Array<{ key: DayKey; label: string; short: string }> = [
  { key: "mon", label: "Lunes", short: "LUN" },
  { key: "tue", label: "Martes", short: "MAR" },
  { key: "wed", label: "Miércoles", short: "MIE" },
  { key: "thu", label: "Jueves", short: "JUE" },
  { key: "fri", label: "Viernes", short: "VIE" },
  { key: "sat", label: "Sábado", short: "SAB" },
  { key: "sun", label: "Domingo", short: "DOM" },
];

const DEFAULT_SCHEDULE: Record<DayKey, ScheduleDay> = {
  mon: { open: "09:00", close: "19:00", closed: false },
  tue: { open: "09:00", close: "19:00", closed: false },
  wed: { open: "09:00", close: "19:00", closed: false },
  thu: { open: "09:00", close: "19:00", closed: false },
  fri: { open: "09:00", close: "19:00", closed: false },
  sat: { open: "09:00", close: "15:00", closed: false },
  sun: { open: "09:00", close: "15:00", closed: true },
};

interface BusinessSettingsCardProps {
  businessName: string;
  businessType: string;
  plan: string;
  planStatus: string;
  trialEndsAt: string | null;
  createdAt?: string | null;
  logoUrl: string | null;
  bookingUrl: string;
  schedule: BusinessSchedule | null;
}

function to12HourLabel(time: string) {
  const [hourRaw, minuteRaw] = time.split(":");
  const hour = Number(hourRaw);
  const minute = Number(minuteRaw);
  const normalizedHour = hour % 12 || 12;
  const minuteLabel = String(minute).padStart(2, "0");
  return `${normalizedHour}:${minuteLabel}`;
}

function normalizeSchedule(schedule: BusinessSchedule | null): Record<DayKey, ScheduleDay> {
  return DAYS.reduce((acc, day) => {
    acc[day.key] = schedule?.[day.key] ?? DEFAULT_SCHEDULE[day.key];
    return acc;
  }, {} as Record<DayKey, ScheduleDay>);
}

function buildScheduleSummary(schedule: Record<DayKey, ScheduleDay>) {
  const openDays = DAYS.filter((day) => !schedule[day.key].closed);
  if (openDays.length === 0) return ["Sin horario configurado"];

  const grouped: Array<{ start: string; end: string; value: string }> = [];
  for (const day of openDays) {
    const current = schedule[day.key];
    const value = `${to12HourLabel(current.open)} - ${to12HourLabel(current.close)}`;
    const last = grouped[grouped.length - 1];
    if (last && last.value === value) {
      last.end = day.short;
    } else {
      grouped.push({ start: day.short, end: day.short, value });
    }
  }

  return grouped.map((group) => `${group.start}${group.start === group.end ? "" : ` - ${group.end}`} ${group.value}`);
}

export function BusinessSettingsCard({
  businessName,
  businessType,
  plan,
  planStatus,
  trialEndsAt,
  createdAt,
  logoUrl,
  bookingUrl,
  schedule,
}: BusinessSettingsCardProps) {
  const [copied, setCopied] = useState(false);
  const [saving, setSaving] = useState(false);
  const [logoPreview, setLogoPreview] = useState<string | null>(logoUrl);
  const [error, setError] = useState("");
  const [saved, setSaved] = useState(false);
  const [savedSchedule, setSavedSchedule] = useState<Record<DayKey, ScheduleDay>>(() => normalizeSchedule(schedule));
  const [scheduleDraft, setScheduleDraft] = useState<Record<DayKey, ScheduleDay>>(() => normalizeSchedule(schedule));
  const [editingSchedule, setEditingSchedule] = useState(false);
  const effectiveTrialEndsAt = getEffectiveTrialEndsAt(createdAt, trialEndsAt);

  const scheduleSummary = buildScheduleSummary(scheduleDraft);

  async function handleCopy() {
    await navigator.clipboard.writeText(bookingUrl);
    setCopied(true);
    setTimeout(() => setCopied(false), 1800);
  }

  async function persistLogo(nextLogo: string | null) {
    setSaving(true);
    setError("");
    setSaved(false);
    try {
      const res = await fetch("/api/business", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ logoDataUrl: nextLogo }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error ?? "No pude guardar el logo.");
      setLogoPreview(data.logoUrl ?? null);
      setSaved(true);
      setTimeout(() => setSaved(false), 1800);
    } catch (saveError) {
      setError(saveError instanceof Error ? saveError.message : "No pude guardar el logo.");
    } finally {
      setSaving(false);
    }
  }

  async function persistSchedule(nextSchedule: Record<DayKey, ScheduleDay>) {
    setSaving(true);
    setError("");
    setSaved(false);
    try {
      const res = await fetch("/api/business", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ schedule: nextSchedule }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error ?? "No pude guardar el horario.");
      const normalized = normalizeSchedule(data.schedule ?? nextSchedule);
      setSavedSchedule(normalized);
      setScheduleDraft(normalized);
      setEditingSchedule(false);
      setSaved(true);
      setTimeout(() => setSaved(false), 1800);
    } catch (saveError) {
      setError(saveError instanceof Error ? saveError.message : "No pude guardar el horario.");
    } finally {
      setSaving(false);
    }
  }

  async function handleLogoChange(event: ChangeEvent<HTMLInputElement>) {
    const file = event.target.files?.[0];
    if (!file) return;

    setError("");
    try {
      const dataUrl = await new Promise<string>((resolve, reject) => {
        const reader = new FileReader();
        reader.onload = () => resolve(String(reader.result ?? ""));
        reader.onerror = () => reject(new Error("No pude leer la imagen."));
        reader.readAsDataURL(file);
      });
      const normalized = normalizeReferenceImageDataUrl(dataUrl);
      setLogoPreview(normalized);
      await persistLogo(normalized);
    } catch (logoError) {
      setError(logoError instanceof Error ? logoError.message : "No pude cargar el logo.");
    } finally {
      event.target.value = "";
    }
  }

  async function handleRemoveLogo() {
    setLogoPreview(null);
    await persistLogo(null);
  }

  function updateDay(day: DayKey, patch: Partial<ScheduleDay>) {
    setScheduleDraft((current) => ({
      ...current,
      [day]: { ...current[day], ...patch },
    }));
  }

  function resetScheduleEdit() {
    setScheduleDraft(savedSchedule);
    setEditingSchedule(false);
    setError("");
  }

  return (
    <div className="settings-card" style={{ marginBottom: "1.5rem" }}>
      <h3 className="settings-section-label">Tu negocio</h3>
      <div className="settings-logo-block">
        <label className={`settings-logo-frame settings-logo-upload${saving ? " is-saving" : ""}`}>
          {logoPreview ? (
            <img src={logoPreview} alt={businessName} className="settings-logo-image" />
          ) : (
            <div className="settings-logo-empty">
              {saving ? <Loader2 size={20} className="spin" /> : <ImageIcon size={20} />}
            </div>
          )}
          <input type="file" accept="image/png,image/jpeg,image/webp" onChange={handleLogoChange} hidden disabled={saving} />
          {logoPreview && (
            <button
              type="button"
              className="settings-logo-remove"
              onClick={handleRemoveLogo}
              disabled={saving}
              aria-label="Quitar logo"
              title="Quitar logo"
            >
              <X size={14} />
            </button>
          )}
        </label>
        <div className="settings-logo-copy">
          <p className="settings-logo-title">{businessName}</p>
          <p className="settings-logo-sub">Se muestra en la página pública de reservas.</p>
          {saved && <span className="settings-saved"><Check size={14} /> Guardado</span>}
          <p className="settings-hint">JPG, PNG o WEBP. Máximo 900 KB.</p>
          {error && <p className="bk-error">{error}</p>}
        </div>
      </div>
      <div className="settings-row">
        <span className="settings-key">Nombre</span>
        <span className="settings-val">{businessName}</span>
      </div>
      <div className="settings-row">
        <span className="settings-key">Tipo</span>
        <span className="settings-val" style={{ textTransform: "capitalize" }}>{businessType}</span>
      </div>
      <div className="settings-row">
        <span className="settings-key">Horario</span>
        <div style={{ display: "flex", flexDirection: "column", alignItems: "flex-end", gap: ".45rem", flex: 1 }}>
          {!editingSchedule ? (
            <>
              <div style={{ display: "flex", alignItems: "flex-start", gap: ".5rem", width: "100%", justifyContent: "flex-end" }}>
                <div style={{ display: "flex", flexDirection: "column", gap: ".2rem", alignItems: "flex-end" }}>
                  {scheduleSummary.map((line) => (
                    <span key={line} className="settings-val">{line}</span>
                  ))}
                </div>
                <button
                  type="button"
                  className="dash-btn-secondary settings-inline-btn settings-copy-icon-btn"
                  onClick={() => setEditingSchedule(true)}
                  title="Editar horario"
                  aria-label="Editar horario"
                >
                  <Pencil size={14} />
                </button>
              </div>
            </>
          ) : (
            <div style={{ width: "100%", display: "flex", flexDirection: "column", gap: ".75rem" }}>
              {DAYS.map((day) => {
                const daySchedule = scheduleDraft[day.key];
                return (
                  <div
                    key={day.key}
                    style={{
                      display: "grid",
                      gridTemplateColumns: "88px 1fr 1fr auto",
                      gap: ".5rem",
                      alignItems: "center",
                    }}
                  >
                    <span style={{ fontSize: ".82rem", fontWeight: 600, color: "var(--fg)" }}>{day.label}</span>
                    <input
                      type="time"
                      className="svc-input"
                      value={daySchedule.open}
                      onChange={(event) => updateDay(day.key, { open: event.target.value })}
                      disabled={daySchedule.closed || saving}
                      style={{ minWidth: 0 }}
                    />
                    <input
                      type="time"
                      className="svc-input"
                      value={daySchedule.close}
                      onChange={(event) => updateDay(day.key, { close: event.target.value })}
                      disabled={daySchedule.closed || saving}
                      style={{ minWidth: 0 }}
                    />
                    <label style={{ display: "flex", alignItems: "center", gap: ".35rem", fontSize: ".78rem", color: "var(--fg-muted)" }}>
                      <input
                        type="checkbox"
                        checked={daySchedule.closed}
                        onChange={(event) => updateDay(day.key, { closed: event.target.checked })}
                        disabled={saving}
                      />
                      Cerrar
                    </label>
                  </div>
                );
              })}
              <div style={{ display: "flex", justifyContent: "flex-end", gap: ".5rem" }}>
                <button type="button" className="apt-btn-ghost" onClick={resetScheduleEdit} disabled={saving}>
                  Cancelar
                </button>
                <button type="button" className="apt-btn-confirm" onClick={() => persistSchedule(scheduleDraft)} disabled={saving}>
                  {saving && <Loader2 size={14} className="spin" />} Guardar horario
                </button>
              </div>
            </div>
          )}
        </div>
      </div>
      <div className="settings-row">
        <span className="settings-key">Link de reservas</span>
        <div className="settings-link-actions">
          <a
            href={bookingUrl}
            target="_blank"
            rel="noopener noreferrer"
            className="settings-val settings-link-text settings-link-anchor"
          >
            {bookingUrl.replace(/^https?:\/\//, "")}
          </a>
          <button
            type="button"
            className="dash-btn-secondary settings-inline-btn settings-copy-icon-btn"
            onClick={handleCopy}
            title={copied ? "Copiado" : "Copiar link"}
            aria-label={copied ? "Copiado" : "Copiar link"}
          >
            {copied ? <Check size={14} /> : <Copy size={14} />}
          </button>
        </div>
      </div>
      <div className="settings-row" style={{ border: "none" }}>
        <span className="settings-key">Plan</span>
        <span className="settings-val" style={{ textTransform: "capitalize" }}>
          {plan} · {planStatus}
          {trialEndsAt && planStatus === "trial" && (
            <span style={{ color: "#E8631F", marginLeft: ".5rem", fontSize: ".75rem" }}>
              (trial hasta {effectiveTrialEndsAt?.toLocaleDateString("es-MX")})
            </span>
          )}
        </span>
      </div>
    </div>
  );
}
