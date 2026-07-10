import { NextRequest, NextResponse } from "next/server";
import { auth, currentUser } from "@clerk/nextjs/server";
import { z } from "zod";
import { db } from "@/db";
import { tickets, businesses } from "@/db/schema";
import { eq, desc } from "drizzle-orm";
import { notifyNewTicket } from "@/lib/notify";

const schema = z.object({
  title:       z.string().min(3).max(200),
  description: z.string().min(3).max(2000),
  type:        z.enum(["bug", "mejora", "soporte", "sugerencia", "otro"]).default("soporte"),
  priority:    z.enum(["baja", "media", "alta", "urgente"]).default("media"),
});

export async function GET() {
  const { userId } = await auth();
  if (!userId) return NextResponse.json({ error: "No autorizado" }, { status: 401 });

  const adminEmail = process.env.ADMIN_EMAIL ?? "";
  const clerkUser  = await currentUser();
  const userEmail  = clerkUser?.emailAddresses[0]?.emailAddress ?? "";
  const isAdmin    = userEmail === adminEmail;

  if (isAdmin) {
    // Admin ve todos los tickets de todos los negocios
    const all = await db.query.tickets.findMany({
      orderBy: [desc(tickets.createdAt)],
    });
    return NextResponse.json(all);
  }

  // Usuario normal ve solo los tickets de su negocio
  const biz = await db.query.businesses.findFirst({ where: eq(businesses.ownerId, userId) });
  if (!biz) return NextResponse.json([]);

  const list = await db.query.tickets.findMany({
    where:   eq(tickets.businessId, biz.id),
    orderBy: [desc(tickets.createdAt)],
  });
  return NextResponse.json(list);
}

export async function POST(req: NextRequest) {
  const { userId } = await auth();
  if (!userId) return NextResponse.json({ error: "No autorizado" }, { status: 401 });

  const clerkUser = await currentUser();
  const userEmail = clerkUser?.emailAddresses[0]?.emailAddress ?? "";

  const biz = await db.query.businesses.findFirst({ where: eq(businesses.ownerId, userId) });
  if (!biz) return NextResponse.json({ error: "Negocio no encontrado" }, { status: 404 });

  try {
    const body = await req.json();
    console.log("[tickets POST] body:", JSON.stringify(body));
    const data = schema.parse(body);

    const [ticket] = await db.insert(tickets).values({
      businessId:   biz.id,
      userId,
      userEmail,
      businessName: biz.name,
      title:        data.title,
      description:  data.description,
      type:         data.type,
      priority:     data.priority,
    }).returning();

    // Await notify antes de responder — Vercel mata la función al retornar la response
    await notifyNewTicket({
      ticketId:     ticket.id,
      title:        ticket.title,
      type:         ticket.type,
      priority:     ticket.priority,
      description:  ticket.description,
      businessName: biz.name,
      userEmail,
    }).catch((e) => console.error("[tickets] notify failed:", e));

    return NextResponse.json(ticket);
  } catch (err) {
    if (err instanceof z.ZodError) {
      console.error("[tickets POST] ZodError:", JSON.stringify(err.issues));
      return NextResponse.json({ error: err.message, issues: err.issues }, { status: 400 });
    }
    console.error("[tickets POST] unexpected:", err);
    return NextResponse.json({ error: String(err) }, { status: 500 });
  }
}
