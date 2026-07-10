import { getBusiness } from "@/lib/getBusiness";
import { db } from "@/db";
import { services } from "@/db/schema";
import { eq, asc } from "drizzle-orm";
import { ServicesManager } from "@/components/dashboard/ServicesManager";
import type { ServiceItem } from "@/components/dashboard/ServicesManager";

export default async function ServicesPage() {
  const biz = await getBusiness();

  const svcs = await db.query.services.findMany({
    where:   eq(services.businessId, biz.id),
    orderBy: [asc(services.isActive), asc(services.category), asc(services.name)],
  });

  const data = svcs.map((s) => ({
    id:          s.id,
    name:        s.name,
    description: s.description,
    price:       s.price,
    durationMin: s.durationMin,
    category:    s.category,
    isActive:    s.isActive,
  })) satisfies ServiceItem[];

  return (
    <div className="dash-page">
      <div className="dash-page-header">
        <div>
          <p className="dash-page-eyebrow">Catálogo</p>
          <h1 className="dash-page-title">Servicios</h1>
        </div>
      </div>
      <ServicesManager services={data} />
    </div>
  );
}
