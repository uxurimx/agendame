"use client";

// src/app/pricing/PricingCards.tsx
import { useState } from "react";
import { useRouter } from "next/navigation";
import { Check, Loader2, Zap } from "lucide-react";

const PLANS = [
  {
    id: "basico",
    name: "Básico",
    price: 299,
    description: "Para emprendedoras que empiezan",
    features: [
      "1 profesional",
      "Agenda de citas ilimitada",
      "Página de reservas pública",
      "Gestión de clientes",
      "Horarios personalizados",
      "Anti-spam y rate limit",
    ],
    highlight: false,
  },
  {
    id: "pro",
    name: "Pro",
    price: 399,
    description: "Para negocios en crecimiento",
    features: [
      "Hasta 5 profesionales",
      "Todo lo del plan Básico",
      "Fotos del historial de clientes",
      "Reportes y corte de caja",
      "Bloqueo de tiempo por profesional",
      "Soporte prioritario",
    ],
    highlight: true,
  },
  {
    id: "multisucursal",
    name: "Multisucursal",
    price: 749,
    description: "Para estéticas con equipo grande",
    features: [
      "Profesionales ilimitados",
      "Todo lo del plan Pro",
      "Múltiples sucursales",
      "Analytics de negocio",
      "Comisiones por profesional",
      "Onboarding personalizado",
    ],
    highlight: false,
  },
] as const;

type PlanId = (typeof PLANS)[number]["id"];

interface PricingCardsProps {
  isAuthenticated: boolean;
  currentPlan?: string | null;
  currentStatus?: string | null;
}

export default function PricingCards({
  isAuthenticated,
  currentPlan,
  currentStatus,
}: PricingCardsProps) {
  const router = useRouter();
  const [loading, setLoading] = useState<PlanId | null>(null);

  const isActive = currentStatus === "active";

  async function handleSelect(planId: PlanId) {
    if (!isAuthenticated) {
      router.push(`/sign-up?redirect_url=/pricing`);
      return;
    }

    setLoading(planId);
    try {
      const res = await fetch("/api/billing/checkout", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ plan: planId }),
      });
      const data = await res.json();
      if (data.url) {
        window.location.href = data.url;
      } else {
        console.error("Sin URL de checkout:", data);
        setLoading(null);
      }
    } catch (err) {
      console.error(err);
      setLoading(null);
    }
  }

  return (
    <div
      style={{
        display: "grid",
        gridTemplateColumns: "repeat(auto-fit, minmax(280px, 1fr))",
        gap: "1.5rem",
        maxWidth: "1000px",
        margin: "0 auto",
        padding: "0 1rem",
      }}
    >
      {PLANS.map((plan) => {
        const isCurrent = isActive && currentPlan === plan.id;
        const isLoading = loading === plan.id;

        return (
          <div
            key={plan.id}
            style={{
              background: plan.highlight ? "linear-gradient(145deg, #6E2A96 0%, #4B1D68 100%)" : "var(--l-white)",
              borderRadius: "1.25rem",
              padding: plan.highlight ? "2px" : "0",
              boxShadow: plan.highlight
                ? "0 20px 60px rgba(110,42,150,0.35)"
                : "0 4px 24px rgba(0,0,0,0.08)",
              position: "relative",
            }}
          >
            {plan.highlight && (
              <div
                style={{
                  position: "absolute",
                  top: "-14px",
                  left: "50%",
                  transform: "translateX(-50%)",
                  background: "linear-gradient(90deg, #E8631F, #f59e0b)",
                  color: "white",
                  fontSize: "0.7rem",
                  fontWeight: 700,
                  letterSpacing: "0.08em",
                  textTransform: "uppercase",
                  padding: "4px 14px",
                  borderRadius: "999px",
                  whiteSpace: "nowrap",
                  display: "flex",
                  alignItems: "center",
                  gap: "4px",
                }}
              >
                <Zap style={{ width: 11, height: 11 }} /> Más popular
              </div>
            )}

            <div
              style={{
                background: plan.highlight ? "#1a0a2e" : "transparent",
                borderRadius: "calc(1.25rem - 2px)",
                padding: "2rem 1.75rem",
              }}
            >
              <p
                style={{
                  fontSize: "0.75rem",
                  fontWeight: 600,
                  letterSpacing: "0.08em",
                  textTransform: "uppercase",
                  color: plan.highlight ? "rgba(200,160,255,0.8)" : "var(--l-berry)",
                  marginBottom: "0.5rem",
                }}
              >
                {plan.name}
              </p>
              <div style={{ display: "flex", alignItems: "baseline", gap: "4px", marginBottom: "0.35rem" }}>
                <span
                  style={{
                    fontSize: "2.5rem",
                    fontWeight: 800,
                    color: plan.highlight ? "#fff" : "var(--l-ink)",
                    lineHeight: 1,
                  }}
                >
                  ${plan.price}
                </span>
                <span
                  style={{
                    fontSize: "0.85rem",
                    color: plan.highlight ? "rgba(255,255,255,0.5)" : "var(--l-ink-soft)",
                  }}
                >
                  MXN/mes
                </span>
              </div>
              <p
                style={{
                  fontSize: "0.82rem",
                  color: plan.highlight ? "rgba(255,255,255,0.6)" : "var(--l-ink-soft)",
                  marginBottom: "1.5rem",
                }}
              >
                {plan.description}
              </p>

              <ul style={{ listStyle: "none", padding: 0, margin: "0 0 1.75rem 0", display: "flex", flexDirection: "column", gap: "0.6rem" }}>
                {plan.features.map((f) => (
                  <li key={f} style={{ display: "flex", alignItems: "flex-start", gap: "0.5rem" }}>
                    <Check
                      style={{
                        width: 15,
                        height: 15,
                        flexShrink: 0,
                        marginTop: 2,
                        color: plan.highlight ? "#a78bfa" : "#6E2A96",
                      }}
                    />
                    <span
                      style={{
                        fontSize: "0.83rem",
                        color: plan.highlight ? "rgba(255,255,255,0.8)" : "var(--l-ink)",
                      }}
                    >
                      {f}
                    </span>
                  </li>
                ))}
              </ul>

              {isCurrent ? (
                <div
                  style={{
                    width: "100%",
                    padding: "0.75rem",
                    borderRadius: "0.75rem",
                    border: "1.5px solid",
                    borderColor: plan.highlight ? "rgba(255,255,255,0.2)" : "#6E2A96",
                    textAlign: "center",
                    fontSize: "0.85rem",
                    fontWeight: 600,
                    color: plan.highlight ? "rgba(255,255,255,0.6)" : "#6E2A96",
                  }}
                >
                  Plan actual
                </div>
              ) : (
                <button
                  onClick={() => handleSelect(plan.id)}
                  disabled={!!loading}
                  style={{
                    width: "100%",
                    padding: "0.75rem",
                    borderRadius: "0.75rem",
                    border: "none",
                    cursor: loading ? "not-allowed" : "pointer",
                    fontWeight: 700,
                    fontSize: "0.88rem",
                    display: "flex",
                    alignItems: "center",
                    justifyContent: "center",
                    gap: "0.4rem",
                    transition: "opacity 0.15s, transform 0.1s",
                    background: plan.highlight
                      ? "linear-gradient(90deg, #E8631F, #f59e0b)"
                      : "linear-gradient(135deg, #6E2A96, #E8631F)",
                    color: "white",
                    opacity: loading && !isLoading ? 0.5 : 1,
                    boxShadow: plan.highlight
                      ? "0 4px 16px rgba(232,99,31,0.4)"
                      : "0 4px 16px rgba(110,42,150,0.3)",
                  }}
                  onMouseEnter={(e) => { (e.currentTarget as HTMLButtonElement).style.transform = "translateY(-1px)"; }}
                  onMouseLeave={(e) => { (e.currentTarget as HTMLButtonElement).style.transform = "translateY(0)"; }}
                >
                  {isLoading && <Loader2 style={{ width: 14, height: 14, animation: "spin 1s linear infinite" }} />}
                  {!isAuthenticated ? "Crear cuenta gratis" : "Elegir este plan"}
                </button>
              )}
            </div>
          </div>
        );
      })}

      <style>{`@keyframes spin { to { transform: rotate(360deg); } }`}</style>
    </div>
  );
}
