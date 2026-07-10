import { NextRequest, NextResponse } from "next/server";
import { auth } from "@clerk/nextjs/server";
import { z } from "zod";
import { db } from "@/db";
import { services, businesses } from "@/db/schema";
import { eq } from "drizzle-orm";

const updateSchema = z.object({
  name:        z.string().min(1).max(100).optional(),
  description: z.string().max(500).optional(),
  price:       z.number().min(0).optional(),
  durationMin: z.number().int().min(5).max(480).optional(),
  category:    z.string().max(100).optional(),
  isActive:    z.boolean().optional(),
});

async function getOwnedService(userId: string, id: string) {
  const biz = await db.query.businesses.findFirst({ where: eq(businesses.ownerId, userId) });
  if (!biz) return null;
  const svc = await db.query.services.findFirst({ where: eq(services.id, id) });
  if (!svc || svc.businessId !== biz.id) return null;
  return svc;
}

export async function PATCH(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const { userId } = await auth();
  if (!userId) return NextResponse.json({ error: "No autorizado" }, { status: 401 });

  const { id } = await params;
  const svc = await getOwnedService(userId, id);
  if (!svc) return NextResponse.json({ error: "Servicio no encontrado" }, { status: 404 });

  try {
    const body = await req.json();
    const data = updateSchema.parse(body);

    const updateData: Record<string, unknown> = { ...data };
    if (data.price !== undefined) updateData.price = String(data.price);

    const [updated] = await db
      .update(services)
      .set(updateData)
      .where(eq(services.id, id))
      .returning();

    return NextResponse.json(updated);
  } catch (err) {
    if (err instanceof z.ZodError) return NextResponse.json({ error: err.message }, { status: 400 });
    console.error("[services/[id] PATCH]", err);
    return NextResponse.json({ error: "Error interno" }, { status: 500 });
  }
}
