import { NextRequest, NextResponse } from "next/server";
import { auth } from "@clerk/nextjs/server";
import { z } from "zod";
import { db } from "@/db";
import { businesses } from "@/db/schema";
import { eq } from "drizzle-orm";

const daySchema = z.object({
  open:   z.string().regex(/^\d{2}:\d{2}$/),
  close:  z.string().regex(/^\d{2}:\d{2}$/),
  closed: z.boolean(),
});

const schema = z.object({
  businessId: z.string().uuid(),
  schedule: z.record(z.string(), daySchema),
});

export async function PATCH(req: NextRequest) {
  try {
    const { userId } = await auth();
    if (!userId) return NextResponse.json({ error: "No autorizado" }, { status: 401 });

    const body = await req.json();
    const data = schema.parse(body);

    const business = await db.query.businesses.findFirst({
      where: eq(businesses.id, data.businessId),
    });
    if (!business || business.ownerId !== userId) {
      return NextResponse.json({ error: "Negocio no encontrado" }, { status: 404 });
    }

    await db
      .update(businesses)
      .set({ schedule: data.schedule, updatedAt: new Date() })
      .where(eq(businesses.id, data.businessId));

    return NextResponse.json({ ok: true });
  } catch (err) {
    if (err instanceof z.ZodError) {
      return NextResponse.json({ error: err.message }, { status: 400 });
    }
    console.error("[onboarding/schedule]", err);
    return NextResponse.json({ error: "Error interno" }, { status: 500 });
  }
}
