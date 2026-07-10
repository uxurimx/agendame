import { NextRequest, NextResponse } from "next/server";
import { auth } from "@clerk/nextjs/server";
import { z } from "zod";
import { db } from "@/db";
import { services, businesses } from "@/db/schema";
import { eq } from "drizzle-orm";

const schema = z.object({
  businessId: z.string().uuid(),
  services: z.array(z.object({
    name:        z.string().min(1).max(100),
    price:       z.number().min(0),
    durationMin: z.number().int().min(5),
    category:    z.string().max(100).optional(),
  })).min(1),
});

export async function POST(req: NextRequest) {
  try {
    const { userId } = await auth();
    if (!userId) return NextResponse.json({ error: "No autorizado" }, { status: 401 });

    const body = await req.json();
    const data = schema.parse(body);

    // Verificar que el negocio pertenece al usuario
    const business = await db.query.businesses.findFirst({
      where: eq(businesses.id, data.businessId),
    });
    if (!business || business.ownerId !== userId) {
      return NextResponse.json({ error: "Negocio no encontrado" }, { status: 404 });
    }

    // Eliminar servicios anteriores del onboarding (para permitir re-submit)
    await db.delete(services).where(eq(services.businessId, data.businessId));

    // Insertar los nuevos
    await db.insert(services).values(
      data.services.map((s) => ({
        businessId:  data.businessId,
        name:        s.name,
        price:       String(s.price),
        durationMin: s.durationMin,
        category:    s.category ?? null,
      }))
    );

    return NextResponse.json({ ok: true });
  } catch (err) {
    if (err instanceof z.ZodError) {
      return NextResponse.json({ error: err.message }, { status: 400 });
    }
    console.error("[onboarding/services]", err);
    return NextResponse.json({ error: "Error interno" }, { status: 500 });
  }
}
