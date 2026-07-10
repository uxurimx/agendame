import { auth } from "@clerk/nextjs/server";
import { currentUser } from "@clerk/nextjs/server";
import { LayoutDashboard, Users, Activity, ArrowUpRight } from "lucide-react";

export default async function OverviewPage() {
  const { userId } = await auth();
  const user = await currentUser();

  const greeting = user?.firstName ? `Welcome back, ${user.firstName}.` : "Welcome back.";

  // Template stat cards — replace with real data from your modules
  const stats = [
    { label: "Total Users", value: "—", icon: Users, hint: "Connect your users table" },
    { label: "Active Sessions", value: "—", icon: Activity, hint: "Wire up analytics" },
    { label: "Events Today", value: "—", icon: LayoutDashboard, hint: "Add your events module" },
  ];

  return (
    <div className="p-8 max-w-5xl">
      {/* Page header */}
      <div className="mb-10">
        <p className="text-xs font-semibold uppercase tracking-widest mb-1" style={{ color: "var(--fg-muted)" }}>
          Dashboard
        </p>
        <h1 className="font-outfit font-bold text-3xl" style={{ color: "var(--fg)" }}>
          {greeting}
        </h1>
        <p className="mt-1 text-sm" style={{ color: "var(--fg-muted)" }}>
          Your admin panel is ready. Start building your modules below.
        </p>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 mb-10">
        {stats.map(({ label, value, icon: Icon, hint }) => (
          <div
            key={label}
            className="p-5 rounded-2xl border"
            style={{ backgroundColor: "var(--surface)", borderColor: "var(--border)" }}
          >
            <div className="flex items-center justify-between mb-4">
              <span className="text-xs font-semibold uppercase tracking-widest" style={{ color: "var(--fg-muted)" }}>
                {label}
              </span>
              <div className="p-1.5 rounded-lg bg-indigo-500/10 border border-indigo-500/20">
                <Icon className="w-3.5 h-3.5 text-indigo-500" />
              </div>
            </div>
            <p className="font-outfit font-bold text-3xl mb-1" style={{ color: "var(--fg)" }}>{value}</p>
            <p className="text-xs" style={{ color: "var(--fg-muted)" }}>{hint}</p>
          </div>
        ))}
      </div>

      {/* Getting started */}
      <div
        className="p-6 rounded-2xl border"
        style={{ backgroundColor: "var(--surface)", borderColor: "var(--border)" }}
      >
        <h2 className="font-outfit font-bold text-lg mb-4" style={{ color: "var(--fg)" }}>
          Getting Started
        </h2>
        <div className="space-y-3">
          {[
            {
              step: "1",
              title: "Update site config",
              desc: "Edit src/config/site.ts to set your app name and description.",
            },
            {
              step: "2",
              title: "Extend the database schema",
              desc: "Add your tables to src/db/schema.ts and run npm run db:push.",
            },
            {
              step: "3",
              title: "Add your modules",
              desc: "Create new routes under src/app/(dashboard)/ and add them to the SideNav.",
            },
          ].map(({ step, title, desc }) => (
            <div
              key={step}
              className="flex items-start gap-4 p-4 rounded-xl border"
              style={{ borderColor: "var(--border)", backgroundColor: "var(--surface-2)" }}
            >
              <span
                className="w-6 h-6 rounded-full bg-indigo-500/10 border border-indigo-500/20 flex items-center justify-center text-xs font-bold text-indigo-500 flex-shrink-0 mt-0.5"
              >
                {step}
              </span>
              <div>
                <p className="text-sm font-semibold mb-0.5" style={{ color: "var(--fg)" }}>{title}</p>
                <p className="text-xs" style={{ color: "var(--fg-muted)" }}>{desc}</p>
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
