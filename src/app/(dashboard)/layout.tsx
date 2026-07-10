import { auth } from "@clerk/nextjs/server";
import { redirect } from "next/navigation";
import { db } from "@/db";
import { businesses } from "@/db/schema";
import { eq } from "drizzle-orm";
import DashboardShell from "@/components/DashboardShell";

export default async function DashboardLayout({ children }: { children: React.ReactNode }) {
  const { userId } = await auth();
  if (!userId) redirect("/sign-in");

  // Guard: sin negocio → onboarding
  const business = await db.query.businesses.findFirst({
    where: eq(businesses.ownerId, userId),
  });
  if (!business) redirect("/onboarding");

  return <DashboardShell>{children}</DashboardShell>;
}
