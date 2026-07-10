import { NextRequest, NextResponse } from "next/server";
import { auth, currentUser } from "@clerk/nextjs/server";
import { z } from "zod";
import { db } from "@/db";
import { tickets } from "@/db/schema";
import { eq } from "drizzle-orm";
import { notifyTicketResponse } from "@/lib/notify";

async function getAdminStatus() {
  const clerkUser  = await currentUser();
  const userEmail  = clerkUser?.emailAddresses[0]?.emailAddress ?? "";
  return userEmail === (process.env.ADMIN_EMAIL ?? "");
}

const schema = z.object({
  status:   z.enum(["abierto", "en_proceso", "resuelto", "cerrado"]).optional(),
  response: z.string().max(3000).optional(),
});

export async function DELETE(_req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const { userId } = await auth();
  if (!userId) return NextResponse.json({ error: "No autorizado" }, { status: 401 });
  if (!(await getAdminStatus())) return NextResponse.json({ error: "Acceso denegado" }, { status: 403 });

  const { id } = await params;
  await db.delete(tickets).where(eq(tickets.id, id));
  return NextResponse.json({ ok: true });
}

export async function PATCH(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const { userId } = await auth();
  if (!userId) return NextResponse.json({ error: "No autorizado" }, { status: 401 });
  if (!(await getAdminStatus())) return NextResponse.json({ error: "Acceso denegado" }, { status: 403 });

  const { id } = await params;
  const ticket = await db.query.tickets.findFirst({ where: eq(tickets.id, id) });
  if (!ticket) return NextResponse.json({ error: "Ticket no encontrado" }, { status: 404 });

  try {
    const body = await req.json();
    const data = schema.parse(body);

    const updateData: Record<string, unknown> = {
      updatedAt: new Date(),
      ...data,
    };
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
