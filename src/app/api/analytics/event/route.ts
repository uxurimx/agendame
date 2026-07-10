import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { db } from "@/db";
import { analyticsEvents } from "@/db/schema";

const schema = z.object({
  sessionId:  z.string().uuid(),
  eventName:  z.string().max(100),
  properties: z.record(z.string(), z.unknown()).optional(),
  pathname:   z.string().max(500).optional(),
});

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const data = schema.parse(body);

    await db.insert(analyticsEvents).values({
      sessionId:  data.sessionId,
      eventName:  data.eventName,
      properties: data.properties ?? null,
      pathname:   data.pathname ?? null,
    });

    return NextResponse.json({ ok: true });
  } catch {
    return NextResponse.json({ ok: false }, { status: 400 });
  }
}
