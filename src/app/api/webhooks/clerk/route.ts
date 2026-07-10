import { NextRequest, NextResponse } from "next/server";
import { Webhook } from "svix";
import { db } from "@/db";
import { users } from "@/db/schema";

export async function POST(req: NextRequest) {
  const secret = process.env.CLERK_WEBHOOK_SECRET;
  if (!secret) return NextResponse.json({ error: "No configurado" }, { status: 500 });

  const payload = await req.text();
  const headers = {
    "svix-id":        req.headers.get("svix-id") ?? "",
    "svix-timestamp": req.headers.get("svix-timestamp") ?? "",
    "svix-signature": req.headers.get("svix-signature") ?? "",
  };

  let event: { type: string; data: Record<string, unknown> };
  try {
    event = new Webhook(secret).verify(payload, headers) as typeof event;
  } catch {
    return NextResponse.json({ error: "Firma inválida" }, { status: 400 });
  }

  const data = event.data as {
    id: string;
    email_addresses: Array<{ email_address: string }>;
    first_name?: string;
    last_name?: string;
  };

  if (event.type === "user.created" || event.type === "user.updated") {
    const email = data.email_addresses[0]?.email_address ?? "";
    const name  = `${data.first_name ?? ""} ${data.last_name ?? ""}`.trim();

    await db
      .insert(users)
      .values({ id: data.id, email, name })
      .onConflictDoUpdate({ target: users.id, set: { email, name } });
  }

  return NextResponse.json({ ok: true });
}
