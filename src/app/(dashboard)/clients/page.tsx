import { getBusiness } from "@/lib/getBusiness";
import { db } from "@/db";
import { clients, appointments } from "@/db/schema";
import { and, asc, eq, sql, getTableColumns } from "drizzle-orm";
import { ClientsView } from "@/components/dashboard/ClientsView";
import type { ClientItem } from "@/components/dashboard/ClientsView";

function mexicoISODate() {
  const parts = new Intl.DateTimeFormat("en-CA", {
    timeZone: "America/Mexico_City",
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  }).formatToParts(new Date());

  const year = parts.find((part) => part.type === "year")?.value ?? "0000";
  const month = parts.find((part) => part.type === "month")?.value ?? "00";
  const day = parts.find((part) => part.type === "day")?.value ?? "00";
  return `${year}-${month}-${day}`;
}

export default async function ClientsPage() {
  const biz = await getBusiness();
  const today = mexicoISODate();

  const cols = getTableColumns(clients);
  const [result, todayClientsRow] = await Promise.all([
    db
      .select({
        ...cols,
        totalAppointments: sql<number>`count(${appointments.id})::int`,
        lastVisit:         sql<string>`max(${appointments.date})`,
      })
      .from(clients)
      .leftJoin(appointments, eq(appointments.clientId, clients.id))
      .where(eq(clients.businessId, biz.id))
      .groupBy(clients.id)
      .orderBy(asc(clients.name)),
    db
      .select({
        value: sql<number>`count(distinct ${appointments.clientId})::int`,
      })
      .from(appointments)
      .where(
        and(
          eq(appointments.businessId, biz.id),
          eq(appointments.date, today),
          sql`${appointments.status} not in ('cancelled', 'no_show')`,
        ),
      ),
  ]);

  const data = result.map((c) => ({
    id:                c.id,
    name:              c.name,
    phone:             c.phone,
    email:             c.email,
    notes:             c.notes,
    isPreferred:       c.isPreferred,
    loyaltyPoints:     c.loyaltyPoints,
    createdAt:         c.createdAt?.toISOString() ?? null,
    totalAppointments: c.totalAppointments ?? 0,
    lastVisit:         c.lastVisit ?? null,
  })) satisfies ClientItem[];

  const todayClientsCount = todayClientsRow[0]?.value ?? 0;

  return (
    <div className="dash-page">
      <ClientsView clients={data} todayClientsCount={todayClientsCount} />
    </div>
  );
}
