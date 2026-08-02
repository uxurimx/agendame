"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";

export default function BlockedDashboardGate({
  blocked,
  children,
}: {
  blocked: boolean;
  children: React.ReactNode;
}) {
  const pathname = usePathname();
  const allowSettings = pathname === "/settings" || pathname.startsWith("/settings/");

  if (!blocked || allowSettings) return <>{children}</>;

  return (
    <div style={{ padding: "2rem", maxWidth: 720, margin: "0 auto" }}>
      <div
        style={{
          background: "var(--surface)",
          border: "1px solid var(--border)",
          borderRadius: "1.25rem",
          padding: "2rem",
          display: "flex",
          flexDirection: "column",
          gap: "1rem",
          boxShadow: "0 20px 50px rgba(0,0,0,0.12)",
        }}
      >
        <div>
          <p style={{ fontSize: "0.78rem", fontWeight: 700, letterSpacing: "0.08em", textTransform: "uppercase", color: "#dc2626", marginBottom: "0.5rem" }}>
            Acceso bloqueado
          </p>
          <h1 style={{ fontSize: "1.5rem", fontWeight: 800, color: "var(--fg)", lineHeight: 1.15, marginBottom: "0.5rem" }}>
            Tu prueba de 3 días finalizó.
          </h1>
          <p style={{ color: "var(--fg-muted)", fontSize: "0.92rem", lineHeight: 1.6 }}>
            Elige tu plan para reactivar Agenda, Clientes, cobros y la página pública de reservas. También puedes entrar a Ajustes para cambiar de plan o solicitar la eliminación de tu cuenta.
          </p>
        </div>

        <div style={{ display: "flex", gap: "0.75rem", flexWrap: "wrap" }}>
          <Link
            href="/pricing"
            style={{
              display: "inline-flex",
              alignItems: "center",
              justifyContent: "center",
              padding: "0.8rem 1.15rem",
              borderRadius: "0.8rem",
              textDecoration: "none",
              fontWeight: 700,
              color: "white",
              background: "linear-gradient(135deg, #6E2A96, #E8631F)",
            }}
          >
            Elegir plan
          </Link>
          <Link
            href="/settings"
            style={{
              display: "inline-flex",
              alignItems: "center",
              justifyContent: "center",
              padding: "0.8rem 1.15rem",
              borderRadius: "0.8rem",
              textDecoration: "none",
              fontWeight: 700,
              color: "var(--fg)",
              background: "var(--surface-2)",
              border: "1px solid var(--border)",
            }}
          >
            Ajustes
          </Link>
        </div>
      </div>
    </div>
  );
}
