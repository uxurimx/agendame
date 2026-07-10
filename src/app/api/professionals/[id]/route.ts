import { NextRequest, NextResponse } from "next/server";
import { auth } from "@clerk/nextjs/server";
import { z } from "zod";
import { db } from "@/db";
import { professionals, businesses } from "@/db/schema";
import { eq } from "drizzle-orm";

const schema = z.object({
  name:            z.string().min(2).max(100).optional(),
  phone:           z.string().max(20).optional(),
  email:           z.string().email().optional().or(z.literal("")),
  bio:             z.string().max(500).optional(),
  commissionType:  z.enum(["percentage", "fixed"]).optional(),
  commissionValue: z.number().min(0).max(100).optional(),
  isActive:        z.boolean().optional(),
});

export async function PATCH(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const { userId } = await auth();
  if (!userId) return NextResponse.json({ error: "No autorizado" }, { status: 401 });

  const { id } = await params;
  const biz = await db.query.businesses.findFirst({ where: eq(businesses.ownerId, userId) });
  if (!biz) return NextResponse.json({ error: "Negocio no encontrado" }, { status: 404 });

  const pro = await db.query.professionals.findFirst({ where: eq(professionals.id, id) });
  if (!pro || pro.businessId !== biz.id) {
    return NextResponse.json({ error: "Profesional no encontrado" }, { status: 404 });
  }

  try {
    const body = await req.json();
    const data = schema.parse(body);

    const updateData: Record<string, unknown> = { ...data };
    if (data.commissionValue !== undefined) updateData.commissionValue = String(data.commissionValue);

    const [updated] = await db
      .update(professionals)
      .set(updateData)
      .where(eq(professionals.id, id))
      .returning();

    return NextResponse.json(updated);
  } catch (err) {
    if (err instanceof z.ZodError) return NextResponse.json({ error: err.message }, { status: 400 });
    console.error("[professionals/[id] PATCH]", err);
    return NextResponse.json({ error: "Error interno" }, { status: 500 });
  }
}
