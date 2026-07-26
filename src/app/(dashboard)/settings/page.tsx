import { currentUser } from "@clerk/nextjs/server";
import { UserButton } from "@clerk/nextjs";
import ThemeToggle from "@/components/ThemeToggle";
import { getBusiness } from "@/lib/getBusiness";
import { db } from "@/db";
import { professionals } from "@/db/schema";
import { eq, asc } from "drizzle-orm";
import { TeamManager } from "@/components/dashboard/TeamManager";
import { BusinessSettingsCard } from "@/components/dashboard/BusinessSettingsCard";
import type { ProItem } from "@/components/dashboard/TeamManager";
import { siteConfig } from "@/config/site";

type BusinessSchedule = Record<string, { open: string; close: string; closed: boolean }>;

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
    colorHex:        p.colorHex,
    commissionType:  p.commissionType,
    commissionValue: p.commissionValue,
    isActive:        p.isActive,
  })) satisfies ProItem[];

  return (
    <div className="dash-page">
      <BusinessSettingsCard
        businessName={biz.name}
        businessType={biz.type}
        plan={biz.plan}
        planStatus={biz.planStatus}
        trialEndsAt={biz.trialEndsAt?.toISOString() ?? null}
        logoUrl={biz.logoUrl ?? null}
        bookingUrl={`${siteConfig.url}/book/${biz.slug}`}
        schedule={(biz.schedule as BusinessSchedule | null) ?? null}
      />

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
