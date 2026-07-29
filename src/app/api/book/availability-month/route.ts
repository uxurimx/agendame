import { NextRequest, NextResponse } from "next/server";
import { auth } from "@clerk/nextjs/server";
import { db } from "@/db";
import { businesses } from "@/db/schema";
import { eq } from "drizzle-orm";
import { DEFAULT_BUSINESS_TIMEZONE, toLocalISODate } from "@/lib/time";
import { getBookableSlotsForDate } from "@/lib/booking-slots";

function daysInMonth(year: number, monthIndex: number) {
  return new Date(year, monthIndex + 1, 0).getDate();
}

export async function GET(req: NextRequest) {
  const p = req.nextUrl.searchParams;
  let businessId = p.get("businessId") ?? "";
  const professionalId = p.get("professionalId") ?? "";
  const serviceId = p.get("serviceId") ?? "";
  const month = p.get("month") ?? "";

  if (businessId === "__from_session__") {
    const { userId } = await auth();
    if (userId) {
      const biz = await db.query.businesses.findFirst({ where: eq(businesses.ownerId, userId) });
      businessId = biz?.id ?? "";
    }
  }

  if (!businessId || !serviceId || !/^\d{4}-\d{2}$/.test(month)) {
    return NextResponse.json({ availableDates: [] });
  }

  const business = await db.query.businesses.findFirst({
    where: eq(businesses.id, businessId),
  });
  if (!business) return NextResponse.json({ availableDates: [] });

  const [yearText, monthText] = month.split("-");
  const year = Number(yearText);
  const monthIndex = Number(monthText) - 1;
  const totalDays = daysInMonth(year, monthIndex);
  const todayIso = toLocalISODate(new Date(), business.timezone || DEFAULT_BUSINESS_TIMEZONE);
  const schedule = business.schedule as Record<string, { open: string; close: string; closed: boolean }> | null;

  const checks = Array.from({ length: totalDays }, (_, index) => {
    const day = index + 1;
    const iso = `${yearText}-${monthText}-${String(day).padStart(2, "0")}`;
    const weekday = new Date(`${iso}T12:00:00`).getDay();
    const dayKey = ["sun", "mon", "tue", "wed", "thu", "fri", "sat"][weekday] ?? "sun";
    const daySchedule = schedule?.[dayKey];

    if (iso < todayIso || !daySchedule || daySchedule.closed) {
      return Promise.resolve<string | null>(null);
    }

    return getBookableSlotsForDate({
      businessId,
      serviceId,
      professionalId,
      date: iso,
    }).then((result) => (result.slots.length > 0 ? iso : null));
  });

  const resolved = await Promise.all(checks);
  const availableDates = resolved.filter((value): value is string => Boolean(value));

  return NextResponse.json({ availableDates });
}
