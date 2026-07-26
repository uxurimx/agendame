"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useEffect, useState } from "react";
import {
  Settings, BarChart2, LayoutDashboard, Calendar,
  Users, Scissors, FileText, ChevronRight, X, LifeBuoy,
} from "lucide-react";
import { UserButton, useUser } from "@clerk/nextjs";
import ThemeToggle from "@/components/ThemeToggle";
import BrandLogo from "@/components/BrandLogo";

const navItems = [
  { name: "Dashboard", href: "/dashboard", icon: LayoutDashboard },
  { name: "Agenda",    href: "/overview",  icon: Calendar },
  { name: "Clientes",  href: "/clients",   icon: Users },
  { name: "Servicios", href: "/services",  icon: Scissors },
  { name: "Reportes",  href: "/reports",   icon: FileText },
  { name: "Ajustes",   href: "/settings",  icon: Settings },
];

const adminItems = [
  { name: "Métricas",  href: "/admin/analytics", icon: BarChart2 },
];

interface SideNavProps {
  isOpen?: boolean;
  onClose?: () => void;
}

function NavLink({
  href,
  icon: Icon,
  name,
  active,
  badgeCount,
}: {
  href: string;
  icon: React.ComponentType<{ className?: string }>;
  name: string;
  active: boolean;
  badgeCount?: number;
}) {
  return (
    <Link
      href={href}
      className={`flex items-center justify-between px-3 py-2.5 rounded-xl transition-all duration-200 group ${
        active ? "font-semibold" : ""
      }`}
      style={
        active
          ? {
              background: "linear-gradient(135deg, #6E2A96, #E8631F)",
              color: "white",
              boxShadow: "0 4px 14px rgba(110,42,150,0.28)",
            }
          : { color: "var(--fg-muted)" }
      }
      onMouseEnter={(e) => {
        if (!active) (e.currentTarget as HTMLElement).style.backgroundColor = "var(--surface-2)";
      }}
      onMouseLeave={(e) => {
        if (!active) (e.currentTarget as HTMLElement).style.backgroundColor = "transparent";
      }}
    >
      <div className="flex items-center gap-3">
        <Icon
          className={`w-4 h-4 transition-colors ${
            active ? "text-white" : "group-hover:text-purple-500"
          }`}
        />
        <span className="text-sm">{name}</span>
        {badgeCount !== undefined && badgeCount > 0 && (
          <span
            className="min-w-[1.25rem] h-5 px-1.5 rounded-full inline-flex items-center justify-center text-[11px] font-bold"
            style={{
              background: active ? "rgba(255,255,255,.2)" : "#E8631F",
              color: "#fff",
            }}
          >
            {badgeCount}
          </span>
        )}
      </div>
      {active && <ChevronRight className="w-3.5 h-3.5 opacity-60" />}
    </Link>
  );
}

export default function SideNav({ isOpen = false, onClose }: SideNavProps) {
  const pathname = usePathname();
  const { user } = useUser();
  const adminEmail = process.env.NEXT_PUBLIC_ADMIN_EMAIL;
  const isAdmin = user?.primaryEmailAddress?.emailAddress === adminEmail;
  const [supportResolvedCount, setSupportResolvedCount] = useState(0);

  useEffect(() => {
    let cancelled = false;

    async function loadSupportCount() {
      try {
        const res = await fetch("/api/tickets", { cache: "no-store" });
        const data = await res.json();
        if (!res.ok || cancelled || !Array.isArray(data)) return;
        const resolved = data.filter((ticket: { status?: string }) => ticket.status === "resuelto").length;
        setSupportResolvedCount(resolved);
      } catch {
        if (!cancelled) setSupportResolvedCount(0);
      }
    }

    void loadSupportCount();
    return () => { cancelled = true; };
  }, []);

  function isActive(href: string) {
    return pathname === href || pathname.startsWith(href + "/");
  }

  return (
    <>
      {/* SideNav panel */}
      <aside
        className={`
          fixed left-0 top-0 h-screen w-64 flex flex-col p-4 z-50 border-r
          transition-transform duration-200 ease-in-out
          ${isOpen ? "translate-x-0" : "-translate-x-full"}
          md:translate-x-0
        `}
        style={{ backgroundColor: "var(--surface)", borderColor: "var(--border)" }}
      >
        {/* Brand + botón cerrar en móvil */}
        <div className="flex items-center justify-between px-2 mb-8 mt-2">
          <BrandLogo />
          <button
            onClick={onClose}
            className="md:hidden p-1.5 rounded-lg transition-colors hover:bg-[var(--surface-2)]"
            aria-label="Cerrar menú"
          >
            <X className="w-4 h-4" style={{ color: "var(--fg-muted)" }} />
          </button>
        </div>

        {/* Navegación */}
        <nav className="flex-1 space-y-1">
          {navItems.map((item) => (
            <NavLink key={item.href} {...item} active={isActive(item.href)} />
          ))}

          {/* Poxelbit — soporte técnico */}
          <div className="pt-4 pb-1">
            <p
              className="px-3 text-[10px] font-semibold uppercase tracking-widest"
              style={{ color: "var(--fg-muted)" }}
            >
              Poxelbit
            </p>
          </div>
          <NavLink href="/support" icon={LifeBuoy} name="Soporte" badgeCount={supportResolvedCount} active={isActive("/support")} />

          {isAdmin && (
            <>
              <div className="pt-4 pb-1">
                <p
                  className="px-3 text-[10px] font-semibold uppercase tracking-widest"
                  style={{ color: "var(--fg-muted)" }}
                >
                  Admin
                </p>
              </div>
              {adminItems.map((item) => (
                <NavLink key={item.href} {...item} active={isActive(item.href)} />
              ))}
            </>
          )}
        </nav>

        {/* Footer: tema + usuario */}
        <div
          className="mt-auto pt-4 space-y-3 border-t"
          style={{ borderColor: "var(--border)" }}
        >
          <div className="flex items-center justify-between px-2">
            <span className="text-xs" style={{ color: "var(--fg-muted)" }}>Tema</span>
            <ThemeToggle />
          </div>
          <div
            className="flex items-center gap-3 px-2 py-2.5 rounded-xl border"
            style={{ backgroundColor: "var(--surface-2)", borderColor: "var(--border)" }}
          >
            <UserButton
              afterSignOutUrl="/"
              appearance={{ elements: { userButtonAvatarBox: "w-8 h-8 rounded-lg" } }}
            />
            <div className="flex flex-col overflow-hidden text-left">
              <span
                className="text-xs font-semibold truncate"
                style={{ color: "var(--fg)" }}
              >
                {user?.firstName ?? "Usuario"} {user?.lastName ?? ""}
              </span>
              <span className="text-[10px] truncate" style={{ color: "var(--fg-muted)" }}>
                {user?.primaryEmailAddress?.emailAddress ?? ""}
              </span>
            </div>
          </div>
        </div>
      </aside>
    </>
  );
}
