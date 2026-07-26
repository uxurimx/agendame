import { NextRequest, NextResponse } from "next/server";
import { auth } from "@clerk/nextjs/server";
import { eq } from "drizzle-orm";
import { z } from "zod";
import { db } from "@/db";
import { businesses } from "@/db/schema";
import { normalizeReferenceImageDataUrl } from "@/lib/reference-image";

const daySchema = z.object({
  open: z.string().regex(/^\d{2}:\d{2}$/),
  close: z.string().regex(/^\d{2}:\d{2}$/),
  closed: z.boolean(),
});

const patchSchema = z.object({
  logoDataUrl: z.string().nullable().optional(),
  schedule: z.record(z.string(), daySchema).optional(),
});

export async function PATCH(req: NextRequest) {
  const { userId } = await auth();
  if (!userId) return NextResponse.json({ error: "No autorizado" }, { status: 401 });

  const biz = await db.query.businesses.findFirst({ where: eq(businesses.ownerId, userId) });
  if (!biz) return NextResponse.json({ error: "Negocio no encontrado" }, { status: 404 });

  try {
    const body = await req.json();
    const data = patchSchema.parse(body);
    const logoUrl = typeof data.logoDataUrl === "string"
      ? normalizeReferenceImageDataUrl(data.logoDataUrl)
      : data.logoDataUrl === null
        ? null
        : biz.logoUrl;
    const schedule = data.schedule ?? biz.schedule;

    await db
      .update(businesses)
      .set({
        logoUrl,
        schedule,
        updatedAt: new Date(),
      })
      .where(eq(businesses.id, biz.id));

    return NextResponse.json({ ok: true, logoUrl, schedule });
  } catch (err) {
    if (err instanceof z.ZodError) {
      return NextResponse.json({ error: err.message }, { status: 400 });
    }
    if (err instanceof Error) {
      return NextResponse.json({ error: err.message }, { status: 400 });
    }
    console.error("[business PATCH]", err);
    return NextResponse.json({ error: "Error interno" }, { status: 500 });
  }
}
