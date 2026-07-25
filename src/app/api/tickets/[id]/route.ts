import { NextRequest, NextResponse } from "next/server";
import { auth, currentUser } from "@clerk/nextjs/server";
import { z } from "zod";
import { db } from "@/db";
import { businesses, tickets } from "@/db/schema";
import { eq } from "drizzle-orm";
import { notifyTicketResponse } from "@/lib/notify";

async function getAdminStatus() {
  const clerkUser  = await currentUser();
  const userEmail  = clerkUser?.emailAddresses[0]?.emailAddress ?? "";
  return userEmail === (process.env.ADMIN_EMAIL ?? "");
}

async function canManageTicket(userId: string, ticketBusinessId: string) {
  if (await getAdminStatus()) return true;
  const biz = await db.query.businesses.findFirst({ where: eq(businesses.ownerId, userId) });
  return biz?.id === ticketBusinessId;
}

const schema = z.object({
  title:    z.string().min(3).max(200).optional(),
  description: z.string().min(3).max(2000).optional(),
  type: z.enum(["bug", "mejora", "soporte", "sugerencia", "otro"]).optional(),
  priority: z.enum(["baja", "media", "alta", "urgente"]).optional(),
  status:   z.enum(["abierto", "en_proceso", "resuelto", "cerrado"]).optional(),
  response: z.string().max(3000).optional(),
});

export async function DELETE(_req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const { userId } = await auth();
  if (!userId) return NextResponse.json({ error: "No autorizado" }, { status: 401 });

  const { id } = await params;
  const ticket = await db.query.tickets.findFirst({ where: eq(tickets.id, id) });
  if (!ticket) return NextResponse.json({ error: "Ticket no encontrado" }, { status: 404 });
  if (!(await canManageTicket(userId, ticket.businessId))) {
    return NextResponse.json({ error: "Acceso denegado" }, { status: 403 });
  }

  await db.delete(tickets).where(eq(tickets.id, id));
  return NextResponse.json({ ok: true });
}

export async function PATCH(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const { userId } = await auth();
  if (!userId) return NextResponse.json({ error: "No autorizado" }, { status: 401 });

  const { id } = await params;
  const ticket = await db.query.tickets.findFirst({ where: eq(tickets.id, id) });
  if (!ticket) return NextResponse.json({ error: "Ticket no encontrado" }, { status: 404 });
  const isAdmin = await getAdminStatus();
  if (!(await canManageTicket(userId, ticket.businessId))) {
    return NextResponse.json({ error: "Acceso denegado" }, { status: 403 });
  }

  try {
    const body = await req.json();
    const data = schema.parse(body);
    const canUserCloseResolved = !isAdmin && data.status === "cerrado" && ticket.status === "resuelto" && data.response === undefined;
    if (!isAdmin && !canUserCloseResolved && (data.status !== undefined || data.response !== undefined)) {
      return NextResponse.json({ error: "Solo admin puede responder o cambiar el estado" }, { status: 403 });
    }

    const updateData: Record<string, unknown> = {
      updatedAt: new Date(),
    };
    if (data.title !== undefined) updateData.title = data.title;
    if (data.description !== undefined) updateData.description = data.description;
    if (data.type !== undefined) updateData.type = data.type;
    if (data.priority !== undefined) updateData.priority = data.priority;
    if ((isAdmin || canUserCloseResolved) && data.status !== undefined) updateData.status = data.status;
    if (isAdmin && data.response !== undefined) updateData.response = data.response;

    if (data.response !== undefined) {
      updateData.respondedAt = new Date();
    }

    const [updated] = await db
      .update(tickets)
      .set(updateData)
      .where(eq(tickets.id, id))
      .returning();

    // Await notify antes de responder — Vercel mata la función al retornar la response
    if (data.response && ticket.userEmail) {
      await notifyTicketResponse(ticket.userEmail, {
        ticketId:     ticket.id,
        title:        ticket.title,
        type:         ticket.type,
        priority:     ticket.priority,
        description:  ticket.description,
        businessName: ticket.businessName,
        userEmail:    ticket.userEmail,
        response:     data.response,
      }).catch((e) => console.error("[tickets/id] notify failed:", e));
    }

    return NextResponse.json(updated);
  } catch (err) {
    if (err instanceof z.ZodError) return NextResponse.json({ error: err.message }, { status: 400 });
    console.error("[tickets/[id] PATCH]", err);
    return NextResponse.json({ error: "Error interno" }, { status: 500 });
  }
}
