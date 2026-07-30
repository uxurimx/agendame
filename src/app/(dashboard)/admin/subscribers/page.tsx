// src/app/(dashboard)/admin/subscribers/page.tsx
import { db } from "@/db";
import { businesses, users } from "@/db/schema";
import { eq, desc, sql } from "drizzle-orm";
import { CheckCircle2, Clock, AlertCircle, XCircle, ExternalLink } from "lucide-react";
import { getTrialDaysRemaining, hasTrialExpired } from "@/lib/trial";

const PLAN_LABELS: Record<string, string> = {
  basico:        "Básico",
  pro:           "Pro",
  multisucursal: "Multi",
};

const PLAN_PRICES: Record<string, number> = {
  basico:        299,
  pro:           399,
  multisucursal: 749,
};

const TYPE_LABELS: Record<string, string> = {
  manicura:   "Manicura",
  barberia:   "Barbería",
  lashista:   "Lashista",
  estetica:   "Estética",
  estilista:  "Estilista",
  otro:       "Otro",
};

function StatusCell({ status, trialEndsAt }: { status: string; trialEndsAt: Date | null }) {
  if (status === "active") {
    return (
      <span style={{ display: "inline-flex", alignItems: "center", gap: 4, padding: "2px 8px", borderRadius: 999, fontSize: "0.72rem", fontWeight: 600, background: "#dcfce7", color: "#15803d" }}>
        <CheckCircle2 style={{ width: 11, height: 11 }} /> Activo
      </span>
    );
  }
  if (status === "trial") {
    const days = trialEndsAt ? getTrialDaysRemaining(trialEndsAt) : 0;
    const expired = hasTrialExpired(trialEndsAt);
    return (
      <span style={{ display: "inline-flex", alignItems: "center", gap: 4, padding: "2px 8px", borderRadius: 999, fontSize: "0.72rem", fontWeight: 600, background: expired ? "#fee2e2" : "#fef3c7", color: expired ? "#991b1b" : "#92400e" }}>
        <Clock style={{ width: 11, height: 11 }} />
        {expired ? "Trial vencido" : "Trial · 3d"}
      </span>
    );
  }
  if (status === "suspended") {
    return (
      <span style={{ display: "inline-flex", alignItems: "center", gap: 4, padding: "2px 8px", borderRadius: 999, fontSize: "0.72rem", fontWeight: 600, background: "#fee2e2", color: "#991b1b" }}>
        <AlertCircle style={{ width: 11, height: 11 }} /> Suspendido
      </span>
    );
  }
  return (
    <span style={{ display: "inline-flex", alignItems: "center", gap: 4, padding: "2px 8px", borderRadius: 999, fontSize: "0.72rem", fontWeight: 600, background: "#f3f4f6", color: "#6b7280" }}>
      <XCircle style={{ width: 11, height: 11 }} /> Cancelado
    </span>
  );
}

export default async function SubscribersPage() {
  const rows = await db
    .select({
      id:                   businesses.id,
      name:                 businesses.name,
      slug:                 businesses.slug,
      type:                 businesses.type,
      plan:                 businesses.plan,
      planStatus:           businesses.planStatus,
      trialEndsAt:          businesses.trialEndsAt,
      stripeCustomerId:     businesses.stripeCustomerId,
      stripeSubscriptionId: businesses.stripeSubscriptionId,
      createdAt:            businesses.createdAt,
      ownerEmail:           users.email,
      ownerName:            users.name,
    })
    .from(businesses)
    .leftJoin(users, eq(businesses.ownerId, users.id))
    .orderBy(desc(businesses.createdAt));

  // KPIs
  const total      = rows.length;
  const activos    = rows.filter((r) => r.planStatus === "active").length;
  const enTrial    = rows.filter((r) => r.planStatus === "trial").length;
  const trialVenc  = rows.filter((r) => r.planStatus === "trial" && r.trialEndsAt && r.trialEndsAt < new Date()).length;
  const problemas  = rows.filter((r) => r.planStatus === "suspended" || r.planStatus === "cancelled").length;
  const mrr        = rows
    .filter((r) => r.planStatus === "active")
    .reduce((sum, r) => sum + (PLAN_PRICES[r.plan] ?? 0), 0);

  return (
    <div style={{ padding: "2rem", maxWidth: 1200, margin: "0 auto" }}>
      <div style={{ marginBottom: "2rem" }}>
        <h1 style={{ fontSize: "1.5rem", fontWeight: 800, color: "var(--fg)" }}>Suscriptores</h1>
        <p style={{ fontSize: "0.85rem", color: "var(--fg-muted)", marginTop: 4 }}>
          Todos los negocios registrados — planes, pagos y estado
        </p>
      </div>

      {/* KPIs */}
      <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(150px, 1fr))", gap: "1rem", marginBottom: "2rem" }}>
        {[
          { label: "Total negocios", value: total,           color: "var(--fg)" },
          { label: "Activos",        value: activos,         color: "#15803d" },
          { label: "En trial",       value: enTrial,         color: "#92400e" },
          { label: "Trial vencido",  value: trialVenc,       color: "#dc2626" },
          { label: "Problemas",      value: problemas,       color: "#dc2626" },
          { label: "MRR estimado",   value: `$${mrr.toLocaleString("es-MX")} MXN`, color: "#6E2A96" },
        ].map(({ label, value, color }) => (
          <div
            key={label}
            style={{ background: "var(--surface)", border: "1px solid var(--border)", borderRadius: "1rem", padding: "1.25rem 1rem" }}
          >
            <p style={{ fontSize: "0.7rem", fontWeight: 600, textTransform: "uppercase", letterSpacing: "0.06em", color: "var(--fg-muted)", marginBottom: 6 }}>
              {label}
            </p>
            <p style={{ fontSize: "1.6rem", fontWeight: 800, color, lineHeight: 1 }}>{value}</p>
          </div>
        ))}
      </div>

      {/* Tabla */}
      <div style={{ background: "var(--surface)", border: "1px solid var(--border)", borderRadius: "1rem", overflow: "hidden" }}>
        <div style={{ overflowX: "auto" }}>
          <table style={{ width: "100%", borderCollapse: "collapse", fontSize: "0.83rem" }}>
            <thead>
              <tr style={{ borderBottom: "1px solid var(--border)" }}>
                {["Negocio", "Dueño", "Plan", "Estado", "Stripe", "Registro"].map((h) => (
                  <th
                    key={h}
                    style={{ textAlign: "left", padding: "0.75rem 1rem", fontWeight: 600, fontSize: "0.72rem", textTransform: "uppercase", letterSpacing: "0.05em", color: "var(--fg-muted)", whiteSpace: "nowrap" }}
                  >
                    {h}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {rows.map((r) => (
                <tr
                  key={r.id}
                  style={{ borderBottom: "1px solid var(--border)" }}
                >
                  {/* Negocio */}
                  <td style={{ padding: "0.875rem 1rem" }}>
                    <p style={{ fontWeight: 600, color: "var(--fg)" }}>{r.name}</p>
                    <p style={{ fontSize: "0.72rem", color: "var(--fg-muted)", marginTop: 2 }}>
                      {TYPE_LABELS[r.type] ?? r.type} · /{r.slug}
                    </p>
                  </td>

                  {/* Dueño */}
                  <td style={{ padding: "0.875rem 1rem" }}>
                    <p style={{ color: "var(--fg)" }}>{r.ownerName ?? "—"}</p>
                    <p style={{ fontSize: "0.72rem", color: "var(--fg-muted)", marginTop: 2 }}>{r.ownerEmail ?? "—"}</p>
                  </td>

                  {/* Plan */}
                  <td style={{ padding: "0.875rem 1rem" }}>
                    <span
                      style={{
                        display: "inline-block",
                        padding: "2px 8px",
                        borderRadius: 999,
                        fontSize: "0.72rem",
                        fontWeight: 700,
                        background: "linear-gradient(135deg, #6E2A96, #E8631F)",
                        color: "white",
                      }}
                    >
                      {PLAN_LABELS[r.plan] ?? r.plan}
                    </span>
                    <p style={{ fontSize: "0.72rem", color: "var(--fg-muted)", marginTop: 4 }}>
                      ${PLAN_PRICES[r.plan] ?? 0}/mes
                    </p>
                  </td>

                  {/* Estado */}
                  <td style={{ padding: "0.875rem 1rem" }}>
                    <StatusCell status={r.planStatus} trialEndsAt={r.trialEndsAt ?? null} />
                  </td>

                  {/* Stripe */}
                  <td style={{ padding: "0.875rem 1rem" }}>
                    {r.stripeCustomerId ? (
                      <a
                        href={`https://dashboard.stripe.com/customers/${r.stripeCustomerId}`}
                        target="_blank"
                        rel="noopener noreferrer"
                        style={{ display: "inline-flex", alignItems: "center", gap: 4, fontSize: "0.75rem", color: "#6E2A96", fontWeight: 600 }}
                      >
                        Ver <ExternalLink style={{ width: 11, height: 11 }} />
                      </a>
                    ) : (
                      <span style={{ fontSize: "0.75rem", color: "var(--fg-muted)" }}>Sin pago</span>
                    )}
                  </td>

                  {/* Registro */}
                  <td style={{ padding: "0.875rem 1rem", color: "var(--fg-muted)", whiteSpace: "nowrap" }}>
                    {r.createdAt
                      ? new Date(r.createdAt).toLocaleDateString("es-MX", { day: "2-digit", month: "short", year: "numeric" })
                      : "—"}
                  </td>
                </tr>
              ))}

              {rows.length === 0 && (
                <tr>
                  <td colSpan={6} style={{ padding: "3rem", textAlign: "center", color: "var(--fg-muted)" }}>
                    Sin negocios registrados aún
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
