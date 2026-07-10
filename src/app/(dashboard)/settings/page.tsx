import { currentUser } from "@clerk/nextjs/server";
import { UserButton } from "@clerk/nextjs";
import ThemeToggle from "@/components/ThemeToggle";

export default async function SettingsPage() {
  const user = await currentUser();

  return (
    <div className="p-8 max-w-2xl">
      {/* Page header */}
      <div className="mb-10">
        <p className="text-xs font-semibold uppercase tracking-widest mb-1" style={{ color: "var(--fg-muted)" }}>
          Admin
        </p>
        <h1 className="font-outfit font-bold text-3xl" style={{ color: "var(--fg)" }}>
          Settings
        </h1>
        <p className="mt-1 text-sm" style={{ color: "var(--fg-muted)" }}>
          Manage your account and application preferences.
        </p>
      </div>

      {/* Account */}
      <section className="mb-6">
        <h2 className="text-xs font-semibold uppercase tracking-widest mb-3" style={{ color: "var(--fg-muted)" }}>
          Account
        </h2>
        <div
          className="p-5 rounded-2xl border flex items-center gap-4"
          style={{ backgroundColor: "var(--surface)", borderColor: "var(--border)" }}
        >
          <UserButton
            appearance={{
              elements: { userButtonAvatarBox: "w-12 h-12 rounded-xl" },
            }}
          />
          <div>
            <p className="font-semibold text-sm" style={{ color: "var(--fg)" }}>
              {user?.firstName} {user?.lastName}
            </p>
            <p className="text-xs mt-0.5" style={{ color: "var(--fg-muted)" }}>
              {user?.primaryEmailAddress?.emailAddress}
            </p>
          </div>
        </div>
      </section>

      {/* Appearance */}
      <section>
        <h2 className="text-xs font-semibold uppercase tracking-widest mb-3" style={{ color: "var(--fg-muted)" }}>
          Appearance
        </h2>
        <div
          className="p-5 rounded-2xl border flex items-center justify-between"
          style={{ backgroundColor: "var(--surface)", borderColor: "var(--border)" }}
        >
          <div>
            <p className="font-semibold text-sm" style={{ color: "var(--fg)" }}>Theme</p>
            <p className="text-xs mt-0.5" style={{ color: "var(--fg-muted)" }}>
              Toggle between light and dark mode.
            </p>
          </div>
          <ThemeToggle />
        </div>
      </section>
    </div>
  );
}
