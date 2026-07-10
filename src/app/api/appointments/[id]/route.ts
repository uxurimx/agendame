import { NextRequest, NextResponse } from "next/server";
import { auth } from "@clerk/nextjs/server";
import { z } from "zod";
import { db } from "@/db";
import { appointments, businesses } from "@/db/schema";
import { eq } from "drizzle-orm";

const schema = z.object({
  status:        z.enum(["pending", "confirmed", "completed", "cancelled", "no_show"]).optional(),
  paymentStatus: z.enum(["pending", "paid", "online"]).optional(),
  paymentMethod: z.enum(["cash", "card", "transfer", "online"]).optional(),
  notes:         z.string().max(500).optional(),
  // Reprogramar
  date:          z.string().regex(/^\d{4}-\d{2}-\d{2}$/).optional(),
  startTime:     z.string().regex(/^\d{2}:\d{2}$/).optional(),
  endTime:       z.string().regex(/^\d{2}:\d{2}$/).optional(),
});

export async function PATCH(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const { userId } = await auth();
  if (!userId) return NextResponse.json({ error: "No autorizado" }, { status: 401 });

  const { id } = await params;
  const biz = await db.query.businesses.findFirst({ where: eq(businesses.ownerId, userId) });
  if (!biz) return NextResponse.json({ error: "Negocio no encontrado" }, { status: 404 });

  const apt = await db.query.appointments.findFirst({ where: eq(appointments.id, id) });
  if (!apt || apt.businessId !== biz.id) {
    return NextResponse.json({ error: "Cita no encontrada" }, { status: 404 });
  }

  try {
    const body = await req.json();
    const data = schema.parse(body);

    await db
      .update(appointments)
      .set({ ...data, updatedAt: new Date() })
      .where(eq(appointments.id, id));

    return NextResponse.json({ ok: true });
  } catch (err) {
    if (err instanceof z.ZodError) return NextResponse.json({ error: err.message }, { status: 400 });
    console.error("[appointments/[id]]", err);
    return NextResponse.json({ error: "Error interno" }, { status: 500 });
  }
}
