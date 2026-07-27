import { NextRequest, NextResponse } from "next/server";
import { auth } from "@clerk/nextjs/server";
import { z } from "zod";
import { db } from "@/db";
import { businesses, clients } from "@/db/schema";
import { and, eq } from "drizzle-orm";

const schema = z.object({
  notes: z.string().max(500).optional().or(z.literal("")),
  isPreferred: z.boolean().optional(),
});

export async function PATCH(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const { userId } = await auth();
  if (!userId) return NextResponse.json({ error: "No autorizado" }, { status: 401 });

  const { id } = await params;
  const biz = await db.query.businesses.findFirst({ where: eq(businesses.ownerId, userId) });
  if (!biz) return NextResponse.json({ error: "Negocio no encontrado" }, { status: 404 });

  const client = await db.query.clients.findFirst({
    where: and(eq(clients.id, id), eq(clients.businessId, biz.id)),
  });
  if (!client) return NextResponse.json({ error: "Cliente no encontrado" }, { status: 404 });

  try {
    const body = await req.json();
    const data = schema.parse(body);

    await db
      .update(clients)
      .set({
        notes: data.notes?.trim() || null,
        isPreferred: data.isPreferred ?? client.isPreferred,
      })
      .where(eq(clients.id, client.id));

    const updated = await db.query.clients.findFirst({
      where: eq(clients.id, client.id),
    });

    return NextResponse.json({ client: updated });
  } catch (error) {
    if (error instanceof z.ZodError) {
      return NextResponse.json({ error: error.message }, { status: 400 });
    }
    console.error("[clients/[id]]", error);
    return NextResponse.json({ error: "Error interno" }, { status: 500 });
  }
}
