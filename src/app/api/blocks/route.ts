import { NextRequest, NextResponse } from "next/server";
import { auth } from "@clerk/nextjs/server";
import { z } from "zod";
import { db } from "@/db";
import { timeBlocks, businesses } from "@/db/schema";
import { eq } from "drizzle-orm";

const schema = z.object({
  date:           z.string().regex(/^\d{4}-\d{2}-\d{2}$/),
  startTime:      z.string().regex(/^\d{2}:\d{2}$/),
  endTime:        z.string().regex(/^\d{2}:\d{2}$/),
  reason:         z.string().max(200).optional(),
  professionalId: z.string().uuid().optional(),
});

export async function POST(req: NextRequest) {
  const { userId } = await auth();
  if (!userId) return NextResponse.json({ error: "No autorizado" }, { status: 401 });

  const biz = await db.query.businesses.findFirst({ where: eq(businesses.ownerId, userId) });
  if (!biz) return NextResponse.json({ error: "Negocio no encontrado" }, { status: 404 });

  try {
    const body = await req.json();
    const data = schema.parse(body);

    if (data.startTime >= data.endTime) {
      return NextResponse.json({ error: "La hora de fin debe ser mayor a la de inicio" }, { status: 400 });
    }

    const [block] = await db.insert(timeBlocks).values({
      businessId:     biz.id,
      professionalId: data.professionalId ?? null,
      date:           data.date,
      startTime:      data.startTime,
      endTime:        data.endTime,
      reason:         data.reason ?? null,
    }).returning();

    return NextResponse.json(block);
  } catch (err) {
    if (err instanceof z.ZodError) return NextResponse.json({ error: err.message }, { status: 400 });
    console.error("[blocks POST]", err);
    return NextResponse.json({ error: "Error interno" }, { status: 500 });
  }
}
