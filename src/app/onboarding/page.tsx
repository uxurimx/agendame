import { auth } from "@clerk/nextjs/server";
import { redirect } from "next/navigation";
import { db } from "@/db";
import { businesses } from "@/db/schema";
import { eq } from "drizzle-orm";
import OnboardingFlow from "@/components/onboarding/OnboardingFlow";

export const metadata = { title: "Configura tu negocio | Agéndame" };

export default async function OnboardingPage() {
  const { userId } = await auth();
  if (!userId) redirect("/sign-in");

  // Si ya tiene negocio, va directo al panel
  const existing = await db.query.businesses.findFirst({
    where: eq(businesses.ownerId, userId),
  });
  if (existing) redirect("/overview");

  return <OnboardingFlow />;
}
