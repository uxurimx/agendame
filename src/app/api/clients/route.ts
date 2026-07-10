import { NextRequest, NextResponse } from "next/server";
import { auth } from "@clerk/nextjs/server";
import { db } from "@/db";
import { clients, appointments, businesses } from "@/db/schema";
import { eq, ilike, or, sql, desc, getTableColumns } from "drizzle-orm";

export async function GET(req: NextRequest) {
  const { userId } = await auth();
  if (!userId) return NextResponse.json({ error: "No autorizado" }, { status: 401 });

  const biz = await db.query.businesses.findFirst({ where: eq(businesses.ownerId, userId) });
  if (!biz) return NextResponse.json({ error: "Negocio no encontrado" }, { status: 404 });

  const search = req.nextUrl.searchParams.get("search") ?? "";

  const cols = getTableColumns(clients);

  let query = db
    .select({
      ...cols,
      totalAppointments: sql<number>`count(${appointments.id})::int`,
      lastVisit:         sql<string>`max(${appointments.date})`,
    })
    .from(clients)
    .leftJoin(appointments, eq(appointments.clientId, clients.id))
    .where(
      search
        ? sql`${clients.businessId} = ${biz.id} AND (${clients.name} ILIKE ${"%" + search + "%"} OR ${clients.phone} ILIKE ${"%" + search + "%"})`
        : eq(clients.businessId, biz.id)
    )
    .groupBy(clients.id)
    .orderBy(desc(sql`max(${appointments.date})`));

  const result = await query;
  return NextResponse.json(result);
}
