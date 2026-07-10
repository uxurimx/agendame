import { auth } from "@clerk/nextjs/server";
import { db } from "@/db";
import { businesses } from "@/db/schema";
import { eq } from "drizzle-orm";
import { redirect } from "next/navigation";

export async function getBusiness() {
  const { userId } = await auth();
  if (!userId) redirect("/sign-in");
  const biz = await db.query.businesses.findFirst({ where: eq(businesses.ownerId, userId) });
  if (!biz) redirect("/onboarding");
  return biz;
}
