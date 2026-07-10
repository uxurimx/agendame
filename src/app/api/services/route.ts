import { NextRequest, NextResponse } from "next/server";
import { auth } from "@clerk/nextjs/server";
import { z } from "zod";
import { db } from "@/db";
import { services, businesses } from "@/db/schema";
import { eq } from "drizzle-orm";

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

  try {
    const body = await req.json();
    const data = schema.parse(body);

    const [svc] = await db
      .insert(services)
      .values({
        businessId:  biz.id,
        name:        data.name,
        description: data.description ?? null,
        price:       String(data.price),
        durationMin: data.durationMin,
        category:    data.category ?? null,
      })
      .returning();

    return NextResponse.json(svc);
  } catch (err) {
    if (err instanceof z.ZodError) return NextResponse.json({ error: err.message }, { status: 400 });
    console.error("[services POST]", err);
    return NextResponse.json({ error: "Error interno" }, { status: 500 });
  }
}
