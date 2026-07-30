import { NextRequest, NextResponse } from "next/server";
import { auth } from "@clerk/nextjs/server";
import { db } from "@/db";
import { businesses } from "@/db/schema";
import { eq } from "drizzle-orm";
import { getBookableSlotsForDate } from "@/lib/booking-slots";
import { isBusinessBlocked } from "@/lib/trial";

export async function GET(req: NextRequest) {
  const p = req.nextUrl.searchParams;
  let businessId       = p.get("businessId") ?? "";
  const professionalId = p.get("professionalId") ?? ""; // "any" o UUID
  const serviceId      = p.get("serviceId") ?? "";
  const date           = p.get("date") ?? ""; // YYYY-MM-DD

  // Si businessId es "__from_session__", resolverlo desde la sesión (uso interno del dashboard)
  if (businessId === "__from_session__") {
    const { userId } = await auth();
    if (userId) {
      const biz = await db.query.businesses.findFirst({ where: eq(businesses.ownerId, userId) });
      businessId = biz?.id ?? "";
    }
  }

  if (!businessId || !date || !serviceId) {
    return NextResponse.json({ slots: [] });
  }
  const business = await db.query.businesses.findFirst({
    where: eq(businesses.id, businessId),
  });
  if (!business || isBusinessBlocked(business.planStatus, business.trialEndsAt, business.createdAt)) {
    return NextResponse.json({ slots: [] });
  }
  const result = await getBookableSlotsForDate({
    businessId,
    serviceId,
    professionalId,
    date,
  });

  return NextResponse.json(result);
}
