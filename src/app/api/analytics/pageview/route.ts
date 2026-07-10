import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { db } from "@/db";
import { pageViews } from "@/db/schema";

const schema = z.object({
  sessionId:   z.string().uuid(),
  pathname:    z.string().max(500),
  referrer:    z.string().max(1000).nullable().optional(),
  utmSource:   z.string().max(100).nullable().optional(),
  utmMedium:   z.string().max(100).nullable().optional(),
  utmCampaign: z.string().max(100).nullable().optional(),
  deviceType:  z.enum(["mobile", "tablet", "desktop"]),
  userAgent:   z.string().max(500).optional(),
});

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const data = schema.parse(body);

    // Vercel inyecta estos headers gratis — país y ciudad sin ninguna API externa
    const country = req.headers.get("x-vercel-ip-country") ?? null;
    const city    = req.headers.get("x-vercel-ip-city")    ?? null;

    await db.insert(pageViews).values({
      sessionId:   data.sessionId,
      pathname:    data.pathname,
      referrer:    data.referrer ?? null,
      utmSource:   data.utmSource ?? null,
      utmMedium:   data.utmMedium ?? null,
      utmCampaign: data.utmCampaign ?? null,
      country,
      city,
      deviceType:  data.deviceType,
      userAgent:   data.userAgent ?? null,
    });

    return NextResponse.json({ ok: true });
  } catch (err) {
    console.error("[analytics/pageview]", err);
    return NextResponse.json({ ok: false }, { status: 400 });
  }
}
