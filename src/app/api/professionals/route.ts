import { NextRequest, NextResponse } from "next/server";
import { auth } from "@clerk/nextjs/server";
import { z } from "zod";
import { db } from "@/db";
import { professionals, businesses } from "@/db/schema";
import { eq, asc } from "drizzle-orm";

const schema = z.object({
  name:            z.string().min(2).max(100),
  phone:           z.string().max(20).optional(),
  email:           z.string().email().optional().or(z.literal("")),
  bio:             z.string().max(500).optional(),
  commissionType:  z.enum(["percentage", "fixed"]).default("percentage"),
  commissionValue: z.number().min(0).max(100).default(0),
});

async function getBiz(userId: string) {
  return db.query.businesses.findFirst({ where: eq(businesses.ownerId, userId) });
}

export async function GET() {
  const { userId } = await auth();
  if (!userId) return NextResponse.json({ error: "No autorizado" }, { status: 401 });
  const biz = await getBiz(userId);
  if (!biz) return NextResponse.json({ error: "Negocio no encontrado" }, { status: 404 });

  const pros = await db.query.professionals.findMany({
    where:   eq(professionals.businessId, biz.id),
    orderBy: [asc(professionals.isActive), asc(professionals.name)],
  });
  return NextResponse.json(pros);
}

export async function POST(req: NextRequest) {
  const { userId } = await auth();
  if (!userId) return NextResponse.json({ error: "No autorizado" }, { status: 401 });
  const biz = await getBiz(userId);
  if (!biz) return NextResponse.json({ error: "Negocio no encontrado" }, { status: 404 });

  try {
    const body = await req.json();
    const data = schema.parse(body);

    const [pro] = await db.insert(professionals).values({
      businessId:      biz.id,
      name:            data.name,
      phone:           data.phone ?? null,
      email:           data.email || null,
      bio:             data.bio ?? null,
      commissionType:  data.commissionType,
      commissionValue: String(data.commissionValue),
    }).returning();

    return NextResponse.json(pro);
  } catch (err) {
    if (err instanceof z.ZodError) return NextResponse.json({ error: err.message }, { status: 400 });
    console.error("[professionals POST]", err);
    return NextResponse.json({ error: "Error interno" }, { status: 500 });
  }
}
