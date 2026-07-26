"use client";

import { useState, type ChangeEvent } from "react";
import { Check, Copy, Image as ImageIcon, Loader2, X } from "lucide-react";
import { normalizeReferenceImageDataUrl } from "@/lib/reference-image";

interface BusinessSettingsCardProps {
  businessName: string;
  businessType: string;
  plan: string;
  planStatus: string;
  trialEndsAt: string | null;
  logoUrl: string | null;
  bookingUrl: string;
}

export function BusinessSettingsCard({
  businessName,
  businessType,
  plan,
  planStatus,
  trialEndsAt,
  logoUrl,
  bookingUrl,
}: BusinessSettingsCardProps) {
  const [copied, setCopied] = useState(false);
  const [saving, setSaving] = useState(false);
  const [logoPreview, setLogoPreview] = useState<string | null>(logoUrl);
  const [error, setError] = useState("");
  const [saved, setSaved] = useState(false);

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
              (trial hasta {new Date(trialEndsAt).toLocaleDateString("es-MX")})
            </span>
          )}
        </span>
      </div>
    </div>
  );
}
