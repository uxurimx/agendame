// src/components/TrialBanner.tsx
import Link from "next/link";
import { AlertTriangle, Clock } from "lucide-react";

interface TrialBannerProps {
  planStatus: string;
  trialEndsAt: Date | null;
}

function daysLeft(end: Date): number {
  return Math.max(0, Math.ceil((end.getTime() - Date.now()) / (1000 * 60 * 60 * 24)));
}

export default function TrialBanner({ planStatus, trialEndsAt }: TrialBannerProps) {
  if (planStatus === "active") return null;

  if (planStatus === "suspended") {
    return (
      <div
        style={{
          background: "linear-gradient(90deg, #dc2626, #b91c1c)",
          color: "white",
          padding: "0.6rem 1.25rem",
          display: "flex",
          alignItems: "center",
          justifyContent: "space-between",
          gap: "1rem",
          flexWrap: "wrap",
        }}
      >
        <div style={{ display: "flex", alignItems: "center", gap: "0.5rem", fontSize: "0.83rem", fontWeight: 500 }}>
          <AlertTriangle style={{ width: 15, height: 15, flexShrink: 0 }} />
          Tu pago no pudo procesarse. Actualiza tu método de pago para seguir usando Agéndame.
        </div>
        <Link
          href="/settings"
          style={{
            fontSize: "0.78rem",
            fontWeight: 700,
            color: "white",
            textDecoration: "underline",
            whiteSpace: "nowrap",
          }}
        >
          Ir a Ajustes →
        </Link>
      </div>
    );
  }

  if (planStatus === "trial" && trialEndsAt) {
    const days = daysLeft(trialEndsAt);
    return (
      <div
        style={{
          background: days <= 1
            ? "linear-gradient(90deg, #dc2626, #ea580c)"
            : "linear-gradient(90deg, #E8631F, #f59e0b)",
          color: "white",
          padding: "0.6rem 1.25rem",
          display: "flex",
          alignItems: "center",
          justifyContent: "space-between",
          gap: "1rem",
          flexWrap: "wrap",
        }}
      >
        <div style={{ display: "flex", alignItems: "center", gap: "0.5rem", fontSize: "0.83rem", fontWeight: 500 }}>
          <Clock style={{ width: 15, height: 15, flexShrink: 0 }} />
          {days === 0
            ? "Tu prueba gratuita termina hoy."
            : `${days} ${days === 1 ? "día" : "días"} de prueba restantes.`}
        </div>
        <Link
          href="/pricing"
          style={{
            fontSize: "0.78rem",
            fontWeight: 700,
            color: "white",
            textDecoration: "underline",
            whiteSpace: "nowrap",
          }}
        >
          Elige tu plan →
        </Link>
      </div>
    );
  }

  return null;
}
