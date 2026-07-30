// src/app/pricing/page.tsx
import { auth } from "@clerk/nextjs/server";
import Link from "next/link";
import Image from "next/image";
import { db } from "@/db";
import { businesses } from "@/db/schema";
import { eq } from "drizzle-orm";
import PricingCards from "./PricingCards";
import { siteConfig } from "@/config/site";

export const metadata = {
  title: "Precios — Agéndame",
  description: "Planes desde $299 MXN/mes. 3 días de prueba gratis, sin tarjeta.",
};

export default async function PricingPage() {
  const { userId } = await auth();

  let currentPlan: string | null = null;
  let currentStatus: string | null = null;

  if (userId) {
    const biz = await db.query.businesses.findFirst({
      where: eq(businesses.ownerId, userId),
      columns: { plan: true, planStatus: true },
    });
    if (biz) {
      currentPlan   = biz.plan;
      currentStatus = biz.planStatus;
    }
  }

  return (
    <div className="landing">
      {/* Nav */}
      <nav
        style={{
          borderBottom: "1px solid var(--l-line)",
          padding: "0 1.5rem",
          height: 64,
          display: "flex",
          alignItems: "center",
          justifyContent: "space-between",
          maxWidth: 1100,
          margin: "0 auto",
          width: "100%",
        }}
      >
        <Link href="/" style={{ display: "flex", alignItems: "center" }}>
          <Image src="/agendame-logo.png" alt="Agéndame" width={120} height={48} style={{ objectFit: "contain" }} />
        </Link>
        <div style={{ display: "flex", gap: "0.75rem", alignItems: "center" }}>
          {userId ? (
            <Link
              href="/dashboard"
              style={{
                padding: "0.45rem 1rem",
                borderRadius: "0.625rem",
                background: "linear-gradient(135deg, #6E2A96, #E8631F)",
                color: "white",
                fontSize: "0.82rem",
                fontWeight: 600,
                textDecoration: "none",
              }}
            >
              Ir al dashboard
            </Link>
          ) : (
            <>
              <Link
                href="/sign-in"
                style={{ fontSize: "0.85rem", color: "var(--l-ink-soft)", textDecoration: "none", fontWeight: 500 }}
              >
                Iniciar sesión
              </Link>
              <Link
                href="/sign-up"
                style={{
                  padding: "0.45rem 1rem",
                  borderRadius: "0.625rem",
                  background: "linear-gradient(135deg, #6E2A96, #E8631F)",
                  color: "white",
                  fontSize: "0.82rem",
                  fontWeight: 600,
                  textDecoration: "none",
                }}
              >
                Crear cuenta
              </Link>
            </>
          )}
        </div>
      </nav>

      {/* Hero */}
      <div style={{ textAlign: "center", padding: "4rem 1.5rem 3rem" }}>
        <p
          style={{
            display: "inline-block",
            background: "linear-gradient(90deg, #6E2A96, #E8631F)",
            WebkitBackgroundClip: "text",
            WebkitTextFillColor: "transparent",
            fontSize: "0.78rem",
            fontWeight: 700,
            letterSpacing: "0.1em",
            textTransform: "uppercase",
            marginBottom: "1rem",
          }}
        >
          Precios transparentes
        </p>
        <h1
          style={{
            fontSize: "clamp(2rem, 5vw, 3.25rem)",
            fontWeight: 800,
            color: "var(--l-ink)",
            lineHeight: 1.1,
            marginBottom: "1rem",
          }}
        >
          Elige el plan que<br />
          <span
            style={{
              background: "linear-gradient(90deg, #6E2A96, #E8631F)",
              WebkitBackgroundClip: "text",
              WebkitTextFillColor: "transparent",
            }}
          >
            mueve tu negocio
          </span>
        </h1>
        <p style={{ fontSize: "1rem", color: "var(--l-ink-soft)", maxWidth: 480, margin: "0 auto 3rem" }}>
          3 días de prueba gratis en todos los planes. Sin tarjeta de crédito para empezar.
          Cancela cuando quieras.
        </p>

        <PricingCards
          isAuthenticated={!!userId}
          currentPlan={currentPlan}
          currentStatus={currentStatus}
          variant="pricing"
        />
      </div>

      {/* FAQ rápido */}
      <div
        style={{
          maxWidth: 600,
          margin: "4rem auto 5rem",
          padding: "0 1.5rem",
          display: "flex",
          flexDirection: "column",
          gap: "1.25rem",
        }}
      >
        {[
          {
            q: "¿Qué pasa cuando termina el periodo de prueba?",
            a: "Se te pedirá que elijas un plan de pago. Tus datos y citas nunca se borran.",
          },
          {
            q: "¿Puedo cambiar de plan después?",
            a: "Sí. Puedes cambiar o cancelar tu plan en cualquier momento desde Ajustes.",
          },
          {
            q: "¿Qué métodos de pago aceptan?",
            a: "Tarjeta de crédito y débito (Visa, Mastercard, AmEx). Procesamos via Stripe.",
          },
          {
            q: "¿Hay contratos o cargos ocultos?",
            a: `No. El precio que ves es todo lo que pagas. Sin cargos de instalación ni contratos.`,
          },
        ].map(({ q, a }) => (
          <div
            key={q}
            style={{
              background: "white",
              borderRadius: "1rem",
              padding: "1.25rem 1.5rem",
              boxShadow: "0 2px 12px rgba(0,0,0,0.06)",
            }}
          >
            <p style={{ fontWeight: 700, color: "var(--l-ink)", marginBottom: "0.4rem", fontSize: "0.92rem" }}>{q}</p>
            <p style={{ color: "var(--l-ink-soft)", fontSize: "0.86rem", lineHeight: 1.6 }}>{a}</p>
          </div>
        ))}
      </div>

      {/* Footer mínimo */}
      <div
        style={{
          borderTop: "1px solid var(--l-line)",
          padding: "1.5rem",
          textAlign: "center",
          fontSize: "0.78rem",
          color: "var(--l-ink-soft)",
        }}
      >
        © {new Date().getFullYear()} {siteConfig.name} · Todos los derechos reservados
      </div>
    </div>
  );
}
