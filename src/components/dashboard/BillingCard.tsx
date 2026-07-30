"use client";

// src/components/dashboard/BillingCard.tsx
import { useState } from "react";
import Link from "next/link";
import { CreditCard, Loader2, ExternalLink, CheckCircle2, AlertCircle, XCircle, Clock } from "lucide-react";

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

interface BillingCardProps {
  plan: string;
  planStatus: string;
  trialEndsAt: string | null;
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

function daysLeft(iso: string): number {
  return Math.max(0, Math.ceil((new Date(iso).getTime() - Date.now()) / (1000 * 60 * 60 * 24)));
}

export default function BillingCard({ plan, planStatus, trialEndsAt, stripeCustomerId }: BillingCardProps) {
  const [loading, setLoading] = useState(false);

  async function openPortal() {
    setLoading(true);
    try {
      const res  = await fetch("/api/billing/portal", { method: "POST" });
      const data = await res.json();
      if (data.url) window.location.href = data.url;
    } finally {
      setLoading(false);
    }
  }

  const planLabel  = PLAN_LABELS[plan] ?? plan;
  const planPrice  = PLAN_PRICES[plan];
  const hasStripe  = !!stripeCustomerId;
  const remaining  = trialEndsAt ? daysLeft(trialEndsAt) : null;

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
          alignItems: "center",
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
        <StatusBadge status={planStatus} />
      </div>

      {/* Acciones según estado */}
      {planStatus === "active" && hasStripe && (
        <button
          onClick={openPortal}
          disabled={loading}
          style={{
            display: "flex",
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

      {planStatus === "suspended" && hasStripe && (
        <div style={{ display: "flex", flexDirection: "column", gap: "0.5rem" }}>
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

      {(planStatus === "trial" || planStatus === "cancelled") && (
        <Link
          href="/pricing"
          style={{
            display: "inline-flex",
            alignItems: "center",
            gap: "0.4rem",
            padding: "0.6rem 1.25rem",
            borderRadius: "0.625rem",
            border: "none",
            background: "linear-gradient(135deg, #6E2A96, #E8631F)",
            color: "white",
            fontSize: "0.83rem",
            fontWeight: 600,
            textDecoration: "none",
            boxShadow: "0 4px 14px rgba(110,42,150,0.25)",
          }}
        >
          {planStatus === "cancelled" ? "Reactivar plan" : "Elegir un plan"}
        </Link>
      )}

      <style>{`@keyframes spin { to { transform: rotate(360deg); } }`}</style>
    </div>
  );
}
