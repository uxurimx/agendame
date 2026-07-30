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
    description: "Para comenzar.",
    features: [
      "2 Profesionales",
      "Agenda de citas ilimitada",
      "Página de reservas pública",
      "Gestión de clientes e historial",
      "Cortes de caja",
      "Anti-spam y Soporte",
    ],
    highlight: false,
    badge: "El más popular",
    buttonLabel: "Elegir este plan",
    buttonDisabledLabel: "Elegir este plan",
  },
  {
    id: "pro",
    name: "Pro",
    price: 399,
    description: "Para negocios en crecimiento",
    features: [
      "3-5 Profesionales",
      "Todo lo del plan Básico",
      "Reportes y corte de caja",
      "Bloqueo de tiempo por profesional",
      "Anti-spam y Soporte Online",
      "Fidelización",
    ],
    highlight: true,
    badge: "Recomendado",
    buttonLabel: "Proximamente",
    buttonDisabledLabel: "Proximamente",
  },
  {
    id: "multisucursal",
    name: "Multisucursal",
    price: 749,
    description: "Para equipos en expansión.",
    features: [
      "+5 Profesionales",
      "Todo lo del plan Pro",
      "Múltiples sucursales",
      "Analytics",
      "Comisiones por profesional",
      "Pagos en línea",
      "Y más...",
    ],
    highlight: false,
    badge: "",
    buttonLabel: "En construcción",
    buttonDisabledLabel: "En construcción",
  },
] as const;

type PlanId = (typeof PLANS)[number]["id"];

interface PricingCardsProps {
  isAuthenticated: boolean;
  currentPlan?: string | null;
  currentStatus?: string | null;
  variant?: "landing" | "pricing";
}

export default function PricingCards({
  isAuthenticated,
  currentPlan,
  currentStatus,
  variant = "pricing",
}: PricingCardsProps) {
  const router = useRouter();
  const [loading, setLoading] = useState<PlanId | null>(null);

  const isActive = currentStatus === "active";
  const isLanding = variant === "landing";

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
        padding: "1.4rem 1rem 0",
        alignItems: "stretch",
      }}
    >
      {PLANS.map((plan) => {
        const isCurrent = isActive && currentPlan === plan.id;
        const isLoading = loading === plan.id;
        const isLockedPlan = plan.id === "pro" || plan.id === "multisucursal";
        const forceConstructionButton = isLanding && plan.id === "multisucursal";
        const showCurrentPlan = isCurrent && !forceConstructionButton;
        const isDisabledButton = !!loading || isLockedPlan;
        const buttonText = showCurrentPlan
          ? "Plan actual"
          : forceConstructionButton
            ? "EN CONSTRUCCION"
            : isLockedPlan
              ? plan.buttonDisabledLabel
              : isLanding && plan.id === "basico"
                ? "Prueba 3 días"
                : !isAuthenticated
                  ? "Crear cuenta gratis"
                  : plan.buttonLabel;
        const useStandardButtonStyle = !plan.highlight || forceConstructionButton;

        return (
          <div
            key={plan.id}
            style={{
              background: plan.highlight
                ? "linear-gradient(180deg, #2d0d45 0%, #190924 100%)"
                : "linear-gradient(180deg, #ffffff 0%, #fffdfd 100%)",
              borderRadius: "1.4rem",
              padding: plan.highlight ? "2px" : "0",
              boxShadow: plan.highlight
                ? "0 22px 58px rgba(88, 28, 135, 0.34)"
                : "0 14px 40px rgba(64, 36, 91, 0.10)",
              position: "relative",
              border: plan.highlight ? "1px solid rgba(139, 92, 246, 0.5)" : "1px solid rgba(118, 83, 159, 0.08)",
              overflow: "visible",
              display: "flex",
            }}
          >
            {plan.badge && (
              <div
                style={{
                  position: "absolute",
                  top: "-13px",
                  left: "50%",
                  transform: "translateX(-50%)",
                  background: plan.highlight
                    ? "linear-gradient(90deg, #E8631F, #f59e0b)"
                    : "linear-gradient(90deg, #2f7f74, #4f9f90)",
                  color: "white",
                  fontSize: "0.7rem",
                  fontWeight: 700,
                  letterSpacing: "0.08em",
                  textTransform: "uppercase",
                  padding: "7px 18px",
                  borderRadius: "999px",
                  whiteSpace: "nowrap",
                  display: "flex",
                  alignItems: "center",
                  gap: "4px",
                  zIndex: 4,
                  boxShadow: "0 8px 18px rgba(0,0,0,0.16)",
                }}
              >
                <Zap style={{ width: 11, height: 11 }} /> {plan.badge}
              </div>
            )}

            <div
              style={{
                background: plan.highlight
                  ? "radial-gradient(circle at top, rgba(126,34,206,0.16), transparent 38%), #1d0a2d"
                  : "radial-gradient(circle at top, rgba(250, 156, 83, 0.07), transparent 32%), transparent",
                borderRadius: "calc(1.4rem - 2px)",
                padding: "2.25rem 1.75rem 1.9rem",
                display: "flex",
                flexDirection: "column",
                flex: 1,
                overflow: "hidden",
              }}
            >
              <p
                style={{
                  fontSize: "0.75rem",
                  fontWeight: 700,
                  letterSpacing: "0.08em",
                  textTransform: "uppercase",
                  color: plan.highlight ? "#b88af4" : "#7d34b3",
                  marginBottom: "0.55rem",
                }}
              >
                {plan.name}
              </p>
              <div style={{ display: "flex", alignItems: "baseline", gap: "4px", marginBottom: "0.4rem" }}>
                <span
                  style={{
                    fontSize: "3rem",
                    fontWeight: 800,
                    color: plan.highlight ? "#ffffff" : "#231b2f",
                    lineHeight: 1,
                  }}
                >
                  ${plan.price}
                </span>
                <span
                  style={{
                    fontSize: "0.85rem",
                    color: plan.highlight ? "rgba(255,255,255,0.58)" : "#6f677a",
                  }}
                >
                  MXN/mes
                </span>
              </div>
              <p
                style={{
                  fontSize: "0.82rem",
                  color: plan.highlight ? "rgba(255,255,255,0.68)" : "#6e6678",
                  marginBottom: "1.6rem",
                }}
              >
                {plan.description}
              </p>

              <ul
                style={{
                  listStyle: "none",
                  padding: 0,
                  margin: "0 0 1.95rem 0",
                  display: "flex",
                  flexDirection: "column",
                  gap: "0.75rem",
                  flex: 1,
                }}
              >
                {plan.features.map((f) => (
                  <li key={f} style={{ display: "flex", alignItems: "flex-start", gap: "0.5rem" }}>
                    <Check
                      style={{
                        width: 15,
                        height: 15,
                        flexShrink: 0,
                        marginTop: 2,
                        color: plan.highlight ? "#b88af4" : "#7d34b3",
                      }}
                    />
                    <span
                      style={{
                        display: "block",
                        width: "100%",
                        fontSize: "0.83rem",
                        color: plan.highlight ? "rgba(255,255,255,0.83)" : "#231b2f",
                        lineHeight: 1.45,
                        textAlign: "left",
                      }}
                    >
                      {f}
                    </span>
                  </li>
                ))}
              </ul>

              {showCurrentPlan ? (
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
                  onClick={isLockedPlan ? undefined : () => handleSelect(plan.id)}
                  disabled={isDisabledButton}
                  style={{
                    width: "100%",
                    padding: "0.88rem 0.95rem",
                    borderRadius: "0.88rem",
                    border: "none",
                    cursor: isDisabledButton ? "not-allowed" : "pointer",
                    fontWeight: 700,
                    fontSize: "0.88rem",
                    display: "flex",
                    alignItems: "center",
                    justifyContent: "center",
                    gap: "0.4rem",
                    transition: "opacity 0.15s, transform 0.1s",
                    background: isLockedPlan
                      ? useStandardButtonStyle
                        ? "linear-gradient(135deg, rgba(110,42,150,0.86), rgba(232,99,31,0.86))"
                        : "linear-gradient(90deg, rgba(232,99,31,0.82), rgba(245,158,11,0.82))"
                      : plan.highlight
                      ? "linear-gradient(90deg, #E8631F, #f59e0b)"
                      : "linear-gradient(135deg, #6E2A96, #E8631F)",
                    color: "white",
                    opacity: loading && !isLoading ? 0.5 : isLockedPlan ? 0.92 : 1,
                    boxShadow: useStandardButtonStyle
                      ? "0 4px 16px rgba(110,42,150,0.3)"
                      : "0 4px 16px rgba(232,99,31,0.4)",
                    textTransform: forceConstructionButton || !isLockedPlan ? "none" : "uppercase",
                    letterSpacing: forceConstructionButton || !isLockedPlan ? "normal" : "0.04em",
                  }}
                  onMouseEnter={(e) => { (e.currentTarget as HTMLButtonElement).style.transform = "translateY(-1px)"; }}
                  onMouseLeave={(e) => { (e.currentTarget as HTMLButtonElement).style.transform = "translateY(0)"; }}
                >
                  {isLoading && <Loader2 style={{ width: 14, height: 14, animation: "spin 1s linear infinite" }} />}
                  {buttonText}
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
