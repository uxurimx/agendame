import { auth, currentUser } from "@clerk/nextjs/server";
import { execFileSync } from "child_process";
import { NextResponse } from "next/server";

export async function POST(req: Request) {
  const { userId } = await auth();
  if (!userId) return NextResponse.json({ error: "No autorizado" }, { status: 401 });

  const adminEmail = process.env.ADMIN_EMAIL ?? "";
  const clerkUser  = await currentUser();
  const userEmail  = clerkUser?.emailAddresses[0]?.emailAddress ?? "";
  if (userEmail !== adminEmail) {
    return NextResponse.json({ error: "Solo el admin puede ejecutar esta acción" }, { status: 403 });
  }

  const body = await req.json() as { action?: string; message?: string };
  const { action, message } = body;
  const cwd = process.cwd();

  try {
    if (action === "commit") {
      if (!message || message.trim().length === 0) {
        return NextResponse.json({ error: "Mensaje requerido" }, { status: 400 });
      }
      execFileSync("git", ["add", "-A"], { cwd });
      const out = execFileSync("git", ["commit", "-m", message.trim()], { cwd }).toString();
      return NextResponse.json({ ok: true, output: out });
    }

    if (action === "push") {
      const out = execFileSync("git", ["push"], { cwd }).toString();
      return NextResponse.json({ ok: true, output: out });
    }

    return NextResponse.json({ error: "Acción no válida" }, { status: 400 });
  } catch (err: unknown) {
    const msg = err instanceof Error ? err.message : "Error desconocido";
    return NextResponse.json({ error: msg }, { status: 500 });
  }
}
