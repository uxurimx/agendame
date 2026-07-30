import { NextRequest, NextResponse } from "next/server";
import { auth } from "@clerk/nextjs/server";
import { revalidatePath } from "next/cache";
import { z } from "zod";
import { db } from "@/db";
import { businesses, services } from "@/db/schema";
import { and, eq, inArray } from "drizzle-orm";
import { isBusinessBlocked } from "@/lib/trial";

const schema = z.object({
  orderedIds: z.array(z.string().uuid()).min(1),
});

export async function PATCH(req: NextRequest) {
  const { userId } = await auth();
  if (!userId) return NextResponse.json({ error: "No autorizado" }, { status: 401 });

  const biz = await db.query.businesses.findFirst({ where: eq(businesses.ownerId, userId) });
  if (!biz) return NextResponse.json({ error: "Negocio no encontrado" }, { status: 404 });
  if (isBusinessBlocked(biz.planStatus, biz.trialEndsAt, biz.createdAt)) {
    return NextResponse.json({ error: "Debes elegir un plan para reordenar servicios." }, { status: 402 });
  }

  try {
    const body = await req.json();
    const data = schema.parse(body);

    const ownedServices = await db.query.services.findMany({
      where: and(
        eq(services.businessId, biz.id),
        inArray(services.id, data.orderedIds),
      ),
      columns: { id: true },
    });

    if (ownedServices.length !== data.orderedIds.length) {
      return NextResponse.json({ error: "Lista de servicios inválida" }, { status: 400 });
    }

    await db.transaction(async (tx) => {
      for (const [index, id] of data.orderedIds.entries()) {
        await tx
          .update(services)
          .set({ sortOrder: index })
          .where(and(eq(services.id, id), eq(services.businessId, biz.id)));
      }
    });

    revalidatePath("/services");

    return NextResponse.json({ ok: true });
  } catch (error) {
    if (error instanceof z.ZodError) {
      return NextResponse.json({ error: error.message }, { status: 400 });
    }
    console.error("[services/reorder PATCH]", error);
    return NextResponse.json({ error: "Error interno" }, { status: 500 });
  }
}
