import { NextRequest, NextResponse } from "next/server";
import { auth } from "@clerk/nextjs/server";
import { db } from "@/db";
import { appointments, timeBlocks, businesses } from "@/db/schema";
import { eq, and, gte, lte } from "drizzle-orm";

export async function GET(req: NextRequest) {
  const { userId } = await auth();
  if (!userId) return NextResponse.json({ error: "No autorizado" }, { status: 401 });

  const biz = await db.query.businesses.findFirst({ where: eq(businesses.ownerId, userId) });
  if (!biz) return NextResponse.json({ error: "Negocio no encontrado" }, { status: 404 });

  const p    = req.nextUrl.searchParams;
  const from = p.get("from") ?? new Date().toISOString().split("T")[0];
  const to   = p.get("to")   ?? from;

  const [apts, blocks] = await Promise.all([
    db.query.appointments.findMany({
      where: and(
        eq(appointments.businessId, biz.id),
        gte(appointments.date, from),
        lte(appointments.date, to),
      ),
      with: { service: true, professional: true, client: true },
      orderBy: (t, { asc }) => [asc(t.date), asc(t.startTime)],
    }),
    db.query.timeBlocks.findMany({
      where: and(
        eq(timeBlocks.businessId, biz.id),
        gte(timeBlocks.date, from),
        lte(timeBlocks.date, to),
      ),
      with: { professional: true },
    }),
  ]);

  return NextResponse.json({ appointments: apts, blocks });
}
