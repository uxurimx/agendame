"use client";

// src/components/dashboard/BillingCard.tsx
import { useState } from "react";
import { CreditCard, Loader2, ExternalLink, CheckCircle2, AlertCircle, XCircle, Clock } from "lucide-react";
import { getTrialDaysRemaining } from "@/lib/trial";

const PLAN_LABELS: Record<string, string> = {
  basico:        "Básico",
  pro:           "Pro",
  multisucursal: "Multisucursal",
};

const PLAN_PRICES: Record<string, number> = {
  basico:        299,
  pro:           399,
  multisucursal: 749,
};

const PLAN_OPTIONS = [
  { id: "basico", label: "Básico", enabled: true },
  { id: "pro", label: "Pro", enabled: false },
  { id: "multisucursal", label: "Multisucursal", enabled: false },
] as const;

interface BillingCardProps {
  plan: string;
  planStatus: string;
  trialEndsAt: string | null;
  createdAt?: string | null;
  stripeCustomerId: string | null;
}

function StatusBadge({ status }: { status: string }) {
  const config = {
    active:    { icon: CheckCircle2, label: "Activo",    bg: "#dcfce7", color: "#15803d" },
    trial:     { icon: Clock,        label: "Prueba",    bg: "#fef3c7", color: "#92400e" },
    suspended: { icon: AlertCircle,  label: "Pago fallido", bg: "#fee2e2", color: "#991b1b" },
    cancelled: { icon: XCircle,      label: "Cancelado", bg: "#f3f4f6", color: "#6b7280" },
  }[status] ?? { icon: Clock, label: status, bg: "#f3f4f6", color: "#6b7280" };

  const Icon = config.icon;
  return (
    <span
      style={{
        display: "inline-flex",
        alignItems: "center",
        gap: "4px",
        padding: "2px 8px",
        borderRadius: "999px",
        fontSize: "0.72rem",
        fontWeight: 600,
        background: config.bg,
        color: config.color,
      }}
    >
      <Icon style={{ width: 11, height: 11 }} />
      {config.label}
    </span>
  );
}

export default function BillingCard({ plan, planStatus, trialEndsAt, createdAt, stripeCustomerId }: BillingCardProps) {
  const [loading, setLoading] = useState(false);
  const [selectedPlan, setSelectedPlan] = useState(plan);
  const [message, setMessage] = useState("");

  async function openPortal() {
    setLoading(true);
    try {
      const res  = await fetch("/api/billing/portal", { method: "POST" });
      const data = await res.json();
      if (data.url) window.location.assign(data.url);
    } finally {
      setLoading(false);
    }
  }

  async function submitPlanChange() {
    setLoading(true);
    setMessage("");
    try {
      const res = await fetch("/api/billing/checkout", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ plan: selectedPlan }),
      });
      const data = await res.json();
      if (data.url) {
        window.location.assign(data.url);
        return;
      }
      if (data.updated) {
        setMessage(data.message ?? "Plan actualizado.");
        return;
      }
      setMessage(data.error ?? "No pude actualizar el plan.");
    } finally {
      setLoading(false);
    }
  }

  const planLabel  = PLAN_LABELS[plan] ?? plan;
  const planPrice  = PLAN_PRICES[plan];
  const hasStripe  = !!stripeCustomerId;
  const remaining  = trialEndsAt ? getTrialDaysRemaining(trialEndsAt, createdAt) : null;

  return (
    <div className="settings-card" style={{ marginBottom: "1.5rem" }}>
      <div style={{ display: "flex", alignItems: "center", gap: "0.5rem", marginBottom: "1.25rem" }}>
        <CreditCard style={{ width: 16, height: 16, color: "var(--accent)" }} />
        <h3 className="settings-section-label" style={{ margin: 0 }}>Suscripción</h3>
      </div>

      {/* Plan actual */}
      <div
        style={{
          display: "flex",
          alignItems: "flex-start",
          justifyContent: "space-between",
          padding: "0.875rem 1rem",
          borderRadius: "0.75rem",
          background: "var(--surface-2)",
          marginBottom: "1rem",
          flexWrap: "wrap",
          gap: "0.5rem",
        }}
      >
        <div>
          <p style={{ fontWeight: 700, fontSize: "0.95rem", color: "var(--fg)" }}>
            Plan {planLabel}
            {planPrice && (
              <span style={{ fontWeight: 400, fontSize: "0.82rem", color: "var(--fg-muted)", marginLeft: "0.4rem" }}>
                ${planPrice} MXN/mes
              </span>
            )}
          </p>
          {planStatus === "trial" && remaining !== null && (
            <p style={{ fontSize: "0.78rem", color: "var(--fg-muted)", marginTop: "2px" }}>
              {remaining === 0 ? "Termina hoy" : `${remaining} ${remaining === 1 ? "día" : "días"} de prueba restantes`}
            </p>
          )}
        </div>
        <div style={{ display: "flex", flexDirection: "column", alignItems: "flex-end", gap: ".55rem", minWidth: 170 }}>
          <StatusBadge status={planStatus} />
          <select
            value={selectedPlan}
            onChange={(event) => setSelectedPlan(event.target.value)}
            className="settings-plan-select"
            aria-label="Seleccionar plan"
          >
            {PLAN_OPTIONS.map((option) => (
              <option key={option.id} value={option.id} disabled={!option.enabled}>
                {option.label}{option.enabled ? "" : " (En construcción)"}
              </option>
            ))}
          </select>
        </div>
      </div>

      <div style={{ display: "flex", flexWrap: "wrap", gap: ".75rem", alignItems: "center" }}>
        <button
          type="button"
          onClick={submitPlanChange}
          disabled={loading || selectedPlan !== "basico"}
          style={{
            display: "inline-flex",
            alignItems: "center",
            gap: "0.4rem",
            padding: "0.6rem 1.1rem",
            borderRadius: "0.625rem",
            border: "none",
            background: "linear-gradient(135deg, #6E2A96, #E8631F)",
            color: "white",
            fontSize: "0.83rem",
            fontWeight: 600,
            cursor: loading || selectedPlan !== "basico" ? "not-allowed" : "pointer",
            boxShadow: "0 4px 14px rgba(110,42,150,0.25)",
            opacity: loading || selectedPlan !== "basico" ? 0.65 : 1,
          }}
        >
          {loading && <Loader2 style={{ width: 14, height: 14, animation: "spin 1s linear infinite" }} />}
          {planStatus === "active" ? "Cambiar plan" : planStatus === "cancelled" ? "Reactivar plan" : "Elegir plan"}
        </button>

        {planStatus === "active" && hasStripe && (
          <button
            onClick={openPortal}
            disabled={loading}
            style={{
              display: "inline-flex",
              alignItems: "center",
              gap: "0.4rem",
              padding: "0.6rem 1rem",
              borderRadius: "0.625rem",
              border: "1px solid var(--border)",
              background: "var(--surface)",
              color: "var(--fg)",
              fontSize: "0.83rem",
              fontWeight: 500,
              cursor: loading ? "not-allowed" : "pointer",
              transition: "background 0.15s",
            }}
          >
            {loading
              ? <Loader2 style={{ width: 14, height: 14, animation: "spin 1s linear infinite" }} />
              : <ExternalLink style={{ width: 13, height: 13 }} />}
            Gestionar suscripción
          </button>
        )}
      </div>

      {planStatus === "suspended" && hasStripe && (
        <div style={{ display: "flex", flexDirection: "column", gap: "0.5rem", marginTop: ".8rem" }}>
          <p style={{ fontSize: "0.8rem", color: "#dc2626" }}>
            Tu último pago falló. Actualiza tu método de pago para reactivar tu cuenta.
          </p>
          <button
            onClick={openPortal}
            disabled={loading}
            style={{
              display: "flex",
              alignItems: "center",
              gap: "0.4rem",
              padding: "0.6rem 1rem",
              borderRadius: "0.625rem",
              border: "none",
              background: "#dc2626",
              color: "white",
              fontSize: "0.83rem",
              fontWeight: 600,
              cursor: loading ? "not-allowed" : "pointer",
              width: "fit-content",
            }}
          >
            {loading
              ? <Loader2 style={{ width: 14, height: 14, animation: "spin 1s linear infinite" }} />
              : <ExternalLink style={{ width: 13, height: 13 }} />}
            Actualizar método de pago
          </button>
        </div>
      )}

      {message && (
        <p style={{ fontSize: ".78rem", color: message.includes("No pude") ? "#b91c1c" : "var(--l-sage)", marginTop: ".8rem" }}>
          {message}
        </p>
      )}

      <style>{`@keyframes spin { to { transform: rotate(360deg); } }`}</style>
    </div>
  );
}
