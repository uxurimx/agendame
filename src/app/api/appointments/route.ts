import { NextRequest, NextResponse } from "next/server";
import { auth } from "@clerk/nextjs/server";
import { db } from "@/db";
import { appointments, businesses } from "@/db/schema";
import { eq, and, asc, desc } from "drizzle-orm";

export async function GET(req: NextRequest) {
  const { userId } = await auth();
  if (!userId) return NextResponse.json({ error: "No autorizado" }, { status: 401 });

  const biz = await db.query.businesses.findFirst({ where: eq(businesses.ownerId, userId) });
  if (!biz) return NextResponse.json({ error: "Negocio no encontrado" }, { status: 404 });

  const p        = req.nextUrl.searchParams;
  const date     = p.get("date") ?? new Date().toISOString().split("T")[0];
  const clientId = p.get("clientId") ?? undefined;

  const where = clientId
    ? and(eq(appointments.businessId, biz.id), eq(appointments.clientId, clientId))
    : and(eq(appointments.businessId, biz.id), eq(appointments.date, date));

  const list = await db.query.appointments.findMany({
    where,
    with: { service: true, professional: true, client: true },
    orderBy: clientId
      ? [desc(appointments.date), asc(appointments.startTime)]
      : [asc(appointments.startTime)],
  });

  return NextResponse.json(list);
}
