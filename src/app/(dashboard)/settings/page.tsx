import { currentUser } from "@clerk/nextjs/server";
import { UserButton } from "@clerk/nextjs";
import ThemeToggle from "@/components/ThemeToggle";
import { getBusiness } from "@/lib/getBusiness";
import { db } from "@/db";
import { professionals } from "@/db/schema";
import { eq, asc } from "drizzle-orm";
import { TeamManager } from "@/components/dashboard/TeamManager";
import type { ProItem } from "@/components/dashboard/TeamManager";

export default async function SettingsPage() {
  const user = await currentUser();
  const biz  = await getBusiness();

  const pros = await db.query.professionals.findMany({
    where:   eq(professionals.businessId, biz.id),
    orderBy: [asc(professionals.isActive), asc(professionals.name)],
  });

  const team = pros.map((p) => ({
    id:              p.id,
    name:            p.name,
    phone:           p.phone,
    email:           p.email,
    bio:             p.bio,
    commissionType:  p.commissionType,
    commissionValue: p.commissionValue,
    isActive:        p.isActive,
  })) satisfies ProItem[];

  return (
    <div className="dash-page">
      <div className="dash-page-header">
        <div>
          <p className="dash-page-eyebrow">Configuración</p>
          <h1 className="dash-page-title">Ajustes</h1>
        </div>
      </div>

      {/* Negocio info */}
      <div className="settings-card" style={{ marginBottom: "1.5rem" }}>
        <h3 className="settings-section-label">Tu negocio</h3>
        <div className="settings-row">
          <span className="settings-key">Nombre</span>
          <span className="settings-val">{biz.name}</span>
        </div>
        <div className="settings-row">
          <span className="settings-key">Tipo</span>
          <span className="settings-val" style={{ textTransform: "capitalize" }}>{biz.type}</span>
        </div>
        <div className="settings-row">
          <span className="settings-key">Slug</span>
          <span className="settings-val" style={{ fontFamily: "monospace", color: "var(--l-berry)" }}>
            agendame.mx/book/{biz.slug}
          </span>
        </div>
        <div className="settings-row" style={{ border: "none" }}>
          <span className="settings-key">Plan</span>
          <span className="settings-val" style={{ textTransform: "capitalize" }}>
            {biz.plan} · {biz.planStatus}
            {biz.trialEndsAt && biz.planStatus === "trial" && (
              <span style={{ color: "#E8631F", marginLeft: ".5rem", fontSize: ".75rem" }}>
                (trial hasta {new Date(biz.trialEndsAt).toLocaleDateString("es-MX")})
              </span>
            )}
          </span>
        </div>
      </div>

      {/* Equipo */}
      <div className="settings-card" style={{ marginBottom: "1.5rem" }}>
        <TeamManager professionals={team} />
      </div>

      {/* Cuenta */}
      <div className="settings-card" style={{ marginBottom: "1.5rem" }}>
        <h3 className="settings-section-label">Cuenta</h3>
        <div style={{ display: "flex", alignItems: "center", gap: ".875rem", padding: ".5rem 0" }}>
          <UserButton appearance={{ elements: { userButtonAvatarBox: "w-10 h-10 rounded-xl" } }} />
          <div>
            <p style={{ fontWeight: 600, fontSize: ".9rem", color: "var(--fg)" }}>
              {user?.firstName} {user?.lastName}
            </p>
            <p style={{ fontSize: ".78rem", color: "var(--fg-muted)" }}>
              {user?.primaryEmailAddress?.emailAddress}
            </p>
          </div>
        </div>
      </div>

      {/* Apariencia */}
      <div className="settings-card">
        <h3 className="settings-section-label">Apariencia</h3>
        <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", padding: ".5rem 0" }}>
          <div>
            <p style={{ fontWeight: 600, fontSize: ".9rem", color: "var(--fg)" }}>Tema</p>
            <p style={{ fontSize: ".78rem", color: "var(--fg-muted)" }}>Modo claro u oscuro</p>
          </div>
          <ThemeToggle />
        </div>
      </div>
    </div>
  );
}
