import { getBusiness } from "@/lib/getBusiness";
import { db } from "@/db";
import { professionals } from "@/db/schema";
import { eq, and, count } from "drizzle-orm";
import { AgendaCalendar } from "@/components/dashboard/AgendaCalendar";
import { AlertTriangle } from "lucide-react";
import Link from "next/link";

export default async function OverviewPage() {
  const biz = await getBusiness();

  const pros = await db.query.professionals.findMany({
    where: and(eq(professionals.businessId, biz.id), eq(professionals.isActive, true)),
  });
  const hasTeam = pros.length > 0;

  const proList = pros.map((p) => ({ id: p.id, name: p.name }));

  return (
    <div className="dash-page" style={{ maxWidth: "100%" }}>
      <div className="dash-page-header">
        <div>
          <p className="dash-page-eyebrow">Agenda</p>
          <h1 className="dash-page-title">Mi Agenda</h1>
        </div>
      </div>

      {!hasTeam && (
        <Link href="/settings" className="dash-alert-banner">
          <AlertTriangle size={18} style={{ flexShrink: 0 }} />
          <div>
            <strong>Tu página de reservas no está lista.</strong>
            <span> Agrégate como profesional en Ajustes para recibir citas.</span>
          </div>
          <span className="dash-alert-cta">Ir a Ajustes →</span>
        </Link>
      )}

      <AgendaCalendar businessId={biz.id} professionals={proList} />
    </div>
  );
}
