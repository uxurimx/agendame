import { NextResponse } from "next/server";
import { auth } from "@clerk/nextjs/server";
import { eq } from "drizzle-orm";
import { db } from "@/db";
import { businesses } from "@/db/schema";
import { isBusinessBlocked } from "@/lib/trial";

const THIRTY_DAYS_MS = 30 * 24 * 60 * 60 * 1000;

export async function POST() {
  try {
    const { userId } = await auth();
    if (!userId) return NextResponse.json({ error: "No autorizado" }, { status: 401 });

    const biz = await db.query.businesses.findFirst({
      where: eq(businesses.ownerId, userId),
    });
    if (!biz) return NextResponse.json({ error: "Negocio no encontrado" }, { status: 404 });

    if (!isBusinessBlocked(biz.planStatus, biz.trialEndsAt, biz.createdAt)) {
      return NextResponse.json({ error: "Esta opción solo está disponible cuando la cuenta está vencida o bloqueada." }, { status: 403 });
    }

    const now = new Date();
    const deletionScheduledFor = new Date(now.getTime() + THIRTY_DAYS_MS);

    await db.update(businesses)
      .set({
        deletionRequestedAt: now,
        deletionScheduledFor,
        updatedAt: now,
      })
      .where(eq(businesses.id, biz.id));

    return NextResponse.json({
      ok: true,
      deletionScheduledFor: deletionScheduledFor.toISOString(),
      message: `La cuenta quedó programada para eliminarse el ${deletionScheduledFor.toLocaleDateString("es-MX")}.`,
    });
  } catch (error) {
    console.error("[account/delete-request]", error);
    return NextResponse.json({ error: "Error interno" }, { status: 500 });
  }
}
