"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import {
  LayoutDashboard, Settings, BarChart2, Calendar,
  Users, Scissors, FileText, ChevronRight, X,
} from "lucide-react";
import { UserButton, useUser } from "@clerk/nextjs";
import { siteConfig } from "@/config/site";
import ThemeToggle from "@/components/ThemeToggle";

const navItems = [
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

export default function SideNav({ isOpen = false, onClose }: SideNavProps) {
  const pathname = usePathname();
  const { user } = useUser();
  const adminEmail = process.env.NEXT_PUBLIC_ADMIN_EMAIL;
  const isAdmin = user?.primaryEmailAddress?.emailAddress === adminEmail;

  function isActive(href: string) {
    return pathname === href || pathname.startsWith(href + "/");
  }

  function NavLink({
    href,
    icon: Icon,
    name,
  }: {
    href: string;
    icon: React.ComponentType<{ className?: string }>;
    name: string;
  }) {
    const active = isActive(href);
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
        </div>
        {active && <ChevronRight className="w-3.5 h-3.5 opacity-60" />}
      </Link>
    );
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
          <span
            className="text-xl font-medium italic"
            style={{ fontFamily: "var(--font-fraunces), Georgia, serif", color: "var(--fg)" }}
          >
            agénda<span style={{ color: "#E8631F" }}>me</span>
          </span>
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
            <NavLink key={item.href} {...item} />
          ))}

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
                <NavLink key={item.href} {...item} />
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
