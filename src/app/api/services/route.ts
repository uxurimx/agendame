import { NextRequest, NextResponse } from "next/server";
import { auth } from "@clerk/nextjs/server";
import { z } from "zod";
import { db } from "@/db";
import { services, businesses } from "@/db/schema";
import { desc, eq } from "drizzle-orm";
import { isBusinessBlocked } from "@/lib/trial";

const schema = z.object({
  name:        z.string().min(1).max(100),
  description: z.string().max(500).optional(),
  price:       z.number().min(0),
  durationMin: z.number().int().min(5).max(480),
  category:    z.string().max(100).optional(),
});

export async function POST(req: NextRequest) {
  const { userId } = await auth();
  if (!userId) return NextResponse.json({ error: "No autorizado" }, { status: 401 });

  const biz = await db.query.businesses.findFirst({ where: eq(businesses.ownerId, userId) });
  if (!biz) return NextResponse.json({ error: "Negocio no encontrado" }, { status: 404 });
  if (isBusinessBlocked(biz.planStatus, biz.trialEndsAt, biz.createdAt)) {
    return NextResponse.json({ error: "Debes elegir un plan para crear servicios." }, { status: 402 });
  }

  try {
    const body = await req.json();
    const data = schema.parse(body);
    const lastService = await db.query.services.findFirst({
      where: eq(services.businessId, biz.id),
      orderBy: [desc(services.sortOrder)],
    });

    const [svc] = await db
      .insert(services)
      .values({
        businessId:  biz.id,
        name:        data.name,
        description: data.description ?? null,
        price:       String(data.price),
        durationMin: data.durationMin,
        category:    data.category ?? null,
        sortOrder:   (lastService?.sortOrder ?? -1) + 1,
      })
      .returning();

    return NextResponse.json(svc);
  } catch (err) {
    if (err instanceof z.ZodError) return NextResponse.json({ error: err.message }, { status: 400 });
    console.error("[services POST]", err);
    return NextResponse.json({ error: "Error interno" }, { status: 500 });
  }
}
