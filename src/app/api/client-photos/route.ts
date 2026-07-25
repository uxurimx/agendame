import { NextRequest, NextResponse } from "next/server";
import { auth } from "@clerk/nextjs/server";
import { and, desc, eq } from "drizzle-orm";
import { z } from "zod";
import { db } from "@/db";
import { businesses, clientPhotos, clients } from "@/db/schema";

export async function GET(req: NextRequest) {
  const { userId } = await auth();
  if (!userId) return NextResponse.json({ error: "No autorizado" }, { status: 401 });

  const biz = await db.query.businesses.findFirst({ where: eq(businesses.ownerId, userId) });
  if (!biz) return NextResponse.json({ error: "Negocio no encontrado" }, { status: 404 });

  const clientId = req.nextUrl.searchParams.get("clientId");
  if (!clientId) return NextResponse.json({ error: "clientId requerido" }, { status: 400 });

  const client = await db.query.clients.findFirst({
    where: and(eq(clients.id, clientId), eq(clients.businessId, biz.id)),
  });
  if (!client) return NextResponse.json({ error: "Clienta no encontrada" }, { status: 404 });

  const photos = await db.query.clientPhotos.findMany({
    where: eq(clientPhotos.clientId, clientId),
    orderBy: [desc(clientPhotos.createdAt)],
  });

  return NextResponse.json(photos);
}

const postSchema = z.object({
  clientId:      z.string().uuid(),
  url:           z.string().url(),
  notes:         z.string().max(500).optional(),
  appointmentId: z.string().uuid().optional(),
});

export async function POST(req: NextRequest) {
  const { userId } = await auth();
  if (!userId) return NextResponse.json({ error: "No autorizado" }, { status: 401 });

  const biz = await db.query.businesses.findFirst({ where: eq(businesses.ownerId, userId) });
  if (!biz) return NextResponse.json({ error: "Negocio no encontrado" }, { status: 404 });

  const body = await req.json();
  const parsed = postSchema.safeParse(body);
  if (!parsed.success) return NextResponse.json({ error: parsed.error.flatten() }, { status: 400 });

  const { clientId, url, notes, appointmentId } = parsed.data;

  const client = await db.query.clients.findFirst({
    where: and(eq(clients.id, clientId), eq(clients.businessId, biz.id)),
  });
  if (!client) return NextResponse.json({ error: "Clienta no encontrada" }, { status: 404 });

  const [photo] = await db
    .insert(clientPhotos)
    .values({ clientId, url, notes, appointmentId })
    .returning();

  return NextResponse.json(photo, { status: 201 });
}
