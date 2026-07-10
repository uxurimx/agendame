import { NextRequest, NextResponse } from "next/server";
import { auth } from "@clerk/nextjs/server";
import { db } from "@/db";
import { timeBlocks, businesses } from "@/db/schema";
import { eq } from "drizzle-orm";

export async function DELETE(_req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const { userId } = await auth();
  if (!userId) return NextResponse.json({ error: "No autorizado" }, { status: 401 });

  const { id } = await params;
  const biz = await db.query.businesses.findFirst({ where: eq(businesses.ownerId, userId) });
  if (!biz) return NextResponse.json({ error: "Negocio no encontrado" }, { status: 404 });

  const block = await db.query.timeBlocks.findFirst({ where: eq(timeBlocks.id, id) });
  if (!block || block.businessId !== biz.id) {
    return NextResponse.json({ error: "Bloqueo no encontrado" }, { status: 404 });
  }

  await db.delete(timeBlocks).where(eq(timeBlocks.id, id));
  return NextResponse.json({ ok: true });
}
