import { getBusiness } from "@/lib/getBusiness";
import { db } from "@/db";
import { clients, appointments } from "@/db/schema";
import { eq, sql, desc, getTableColumns } from "drizzle-orm";
import { ClientsView } from "@/components/dashboard/ClientsView";
import type { ClientItem } from "@/components/dashboard/ClientsView";

export default async function ClientsPage() {
  const biz = await getBusiness();

  const cols = getTableColumns(clients);
  const result = await db
    .select({
      ...cols,
      totalAppointments: sql<number>`count(${appointments.id})::int`,
      lastVisit:         sql<string>`max(${appointments.date})`,
    })
    .from(clients)
    .leftJoin(appointments, eq(appointments.clientId, clients.id))
    .where(eq(clients.businessId, biz.id))
    .groupBy(clients.id)
    .orderBy(desc(sql`max(${appointments.date})`));

  const data = result.map((c) => ({
    id:                c.id,
    name:              c.name,
    phone:             c.phone,
    email:             c.email,
    loyaltyPoints:     c.loyaltyPoints,
    createdAt:         c.createdAt?.toISOString() ?? null,
    totalAppointments: c.totalAppointments ?? 0,
    lastVisit:         c.lastVisit ?? null,
  })) satisfies ClientItem[];

  return (
    <div className="dash-page">
      <div className="dash-page-header">
        <div>
          <p className="dash-page-eyebrow">CRM</p>
          <h1 className="dash-page-title">Clientes</h1>
        </div>
      </div>
      <ClientsView clients={data} />
    </div>
  );
}
