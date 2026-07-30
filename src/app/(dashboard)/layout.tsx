import { auth } from "@clerk/nextjs/server";
import { redirect } from "next/navigation";
import { db } from "@/db";
import { businesses, users } from "@/db/schema";
import { eq } from "drizzle-orm";
import DashboardShell from "@/components/DashboardShell";
import TrialBanner from "@/components/TrialBanner";
import { hasTrialExpired } from "@/lib/trial";

export default async function DashboardLayout({ children }: { children: React.ReactNode }) {
  const { userId } = await auth();
  if (!userId) redirect("/sign-in");

  const [business, user] = await Promise.all([
    db.query.businesses.findFirst({ where: eq(businesses.ownerId, userId) }),
    db.query.users.findFirst({ where: eq(users.id, userId), columns: { role: true } }),
  ]);
  if (!business) redirect("/onboarding");

  const isAdmin = user?.role === "superadmin";

  // Superadmin siempre pasa — no necesita suscripción
  if (!isAdmin) {
    const trialExpired = business.planStatus === "trial" && hasTrialExpired(business.trialEndsAt);
    if (trialExpired || business.planStatus === "cancelled") {
      redirect("/pricing");
    }
  }

  return (
    <DashboardShell isAdmin={isAdmin}>
      <TrialBanner planStatus={business.planStatus} trialEndsAt={business.trialEndsAt ?? null} />
      {children}
    </DashboardShell>
  );
}
