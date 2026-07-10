import { currentUser } from "@clerk/nextjs/server";
import { getBusiness } from "@/lib/getBusiness";
import { TicketsView } from "@/components/dashboard/TicketsView";

export default async function SupportPage() {
  await getBusiness();
  const clerkUser  = await currentUser();
  const userEmail  = clerkUser?.emailAddresses[0]?.emailAddress ?? "";
  const isAdmin    = userEmail === (process.env.ADMIN_EMAIL ?? "torresdevmx@gmail.com");

  return (
    <div className="p-6 max-w-3xl mx-auto">
      <TicketsView isAdmin={isAdmin} />
    </div>
  );
}
