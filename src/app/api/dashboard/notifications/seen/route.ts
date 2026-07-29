import { NextResponse } from "next/server";
import { auth } from "@clerk/nextjs/server";
import { db } from "@/db";
import { businesses } from "@/db/schema";
import { eq } from "drizzle-orm";

export async function POST() {
  const { userId } = await auth();
  if (!userId) return NextResponse.json({ error: "No autorizado" }, { status: 401 });

  const business = await db.query.businesses.findFirst({
    where: eq(businesses.ownerId, userId),
  });

  if (!business) {
    return NextResponse.json({ error: "Negocio no encontrado" }, { status: 404 });
  }

  const seenAt = new Date();

  await db
    .update(businesses)
    .set({
      notificationSeenAt: seenAt,
      updatedAt: seenAt,
    })
    .where(eq(businesses.id, business.id));

  return NextResponse.json({ ok: true, seenAt: seenAt.toISOString() });
}
