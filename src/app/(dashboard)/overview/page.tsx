import { getBusiness } from "@/lib/getBusiness";
import { db } from "@/db";
import { professionals, services } from "@/db/schema";
import { eq, and } from "drizzle-orm";
import { AgendaCalendar } from "@/components/dashboard/AgendaCalendar";
import { AlertTriangle } from "lucide-react";
import Link from "next/link";

export default async function OverviewPage() {
  const biz = await getBusiness();

  const [pros, svcList] = await Promise.all([
    db.query.professionals.findMany({
      where: and(eq(professionals.businessId, biz.id), eq(professionals.isActive, true)),
    }),
    db.query.services.findMany({
      where: and(eq(services.businessId, biz.id), eq(services.isActive, true)),
    }),
  ]);

  const hasTeam = pros.length > 0;
  const proList = pros.map((p) => ({ id: p.id, name: p.name, colorHex: p.colorHex ?? "#F7C8D0" }));
  const serviceList = svcList.map((service) => ({
    id: service.id,
    name: service.name,
    description: service.description ?? "",
    price: String(service.price),
    durationMin: service.durationMin,
  }));

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

      <AgendaCalendar businessId={biz.id} professionals={proList} services={serviceList} />
    </div>
  );
}
