// src/app/(dashboard)/admin/layout.tsx
import { auth } from "@clerk/nextjs/server";
import { redirect } from "next/navigation";
import { db } from "@/db";
import { users } from "@/db/schema";
import { eq } from "drizzle-orm";

export default async function AdminLayout({ children }: { children: React.ReactNode }) {
  const { userId } = await auth();
  if (!userId) redirect("/sign-in");

  const user = await db.query.users.findFirst({
    where: eq(users.id, userId),
    columns: { role: true },
  });

  if (user?.role !== "superadmin") redirect("/dashboard");

  return <>{children}</>;
}
