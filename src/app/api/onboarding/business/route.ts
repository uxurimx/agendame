import { NextRequest, NextResponse } from "next/server";
import { auth, currentUser } from "@clerk/nextjs/server";
import { z } from "zod";
import { db } from "@/db";
import { users, businesses } from "@/db/schema";
import { eq } from "drizzle-orm";

const schema = z.object({
  name:  z.string().min(2).max(100),
  type:  z.string().max(50),
  slug:  z.string().min(3).max(50).regex(/^[a-z0-9-]+$/, "Solo letras, números y guiones"),
  phone: z.string().max(20).optional(),
});

export async function POST(req: NextRequest) {
  try {
    const { userId } = await auth();
    if (!userId) return NextResponse.json({ error: "No autorizado" }, { status: 401 });

    const body = await req.json();
    const data = schema.parse(body);

    // Upsert del usuario en DB
    const clerkUser = await currentUser();
    if (clerkUser) {
      await db
        .insert(users)
        .values({
          id:    userId,
          email: clerkUser.emailAddresses[0]?.emailAddress ?? "",
          name:  `${clerkUser.firstName ?? ""} ${clerkUser.lastName ?? ""}`.trim(),
        })
        .onConflictDoUpdate({
          target:  users.id,
          set:     { email: clerkUser.emailAddresses[0]?.emailAddress ?? "" },
        });
    }

    // Verificar slug disponible
    const existing = await db.query.businesses.findFirst({
      where: eq(businesses.slug, data.slug),
    });
    if (existing && existing.ownerId !== userId) {
      return NextResponse.json({ error: "slug_taken" }, { status: 409 });
    }

    // Si ya tiene negocio, actualizar; si no, crear
    const myBusiness = await db.query.businesses.findFirst({
      where: eq(businesses.ownerId, userId),
    });

    const trialEndsAt = new Date(Date.now() + 3 * 24 * 60 * 60 * 1000); // 3 días

    if (myBusiness) {
      await db
        .update(businesses)
        .set({ name: data.name, type: data.type, slug: data.slug, phone: data.phone ?? null, updatedAt: new Date() })
        .where(eq(businesses.id, myBusiness.id));
      return NextResponse.json({ businessId: myBusiness.id, slug: data.slug });
    }

    const [created] = await db
      .insert(businesses)
      .values({
        ownerId:     userId,
        slug:        data.slug,
        name:        data.name,
        type:        data.type,
        phone:       data.phone ?? null,
        plan:        "basico",
        planStatus:  "trial",
        trialEndsAt,
      })
      .returning({ id: businesses.id });

    return NextResponse.json({ businessId: created.id, slug: data.slug });
  } catch (err) {
    if (err instanceof z.ZodError) {
      return NextResponse.json({ error: err.message }, { status: 400 });
    }
    console.error("[onboarding/business]", err);
    return NextResponse.json({ error: "Error interno" }, { status: 500 });
  }
}
