"use client";

import { useState, useEffect } from "react";
import { usePathname } from "next/navigation";
import { Menu } from "lucide-react";
import SideNav from "@/components/SideNav";

export default function DashboardShell({ children }: { children: React.ReactNode }) {
  const [mobileOpen, setMobileOpen] = useState(false);
  const pathname = usePathname();

  // Cierra el menú al navegar
  useEffect(() => {
    setMobileOpen(false);
  }, [pathname]);

  return (
    <div className="min-h-screen flex" style={{ backgroundColor: "var(--bg)" }}>

      {/* Overlay oscuro en móvil cuando el menú está abierto */}
      {mobileOpen && (
        <div
          className="fixed inset-0 z-40 bg-black/50 md:hidden"
          onClick={() => setMobileOpen(false)}
          aria-hidden="true"
        />
      )}

      {/* SideNav */}
      <SideNav isOpen={mobileOpen} onClose={() => setMobileOpen(false)} />

      {/* Contenido principal */}
      <div className="flex-1 flex flex-col min-h-screen md:ml-64">

        {/* Header móvil — solo visible en pantallas pequeñas */}
        <header
          className="md:hidden flex items-center gap-3 px-4 h-14 border-b sticky top-0 z-30"
          style={{ backgroundColor: "var(--bg)", borderColor: "var(--border)" }}
        >
          <button
            onClick={() => setMobileOpen(true)}
            className="p-2 rounded-xl transition-colors hover:bg-[var(--surface)]"
            aria-label="Abrir menú"
          >
            <Menu className="w-5 h-5" style={{ color: "var(--fg)" }} />
          </button>
          <span
            className="text-lg font-medium italic"
            style={{ fontFamily: "var(--font-fraunces), Georgia, serif", color: "var(--fg)" }}
          >
            agénda<span style={{ color: "#E8631F" }}>me</span>
          </span>
        </header>

        {/* Glow ambiental */}
        <div className="relative flex-1">
          <div className="absolute top-0 right-0 w-[400px] h-[400px] bg-indigo-500/[0.03] rounded-full blur-[100px] pointer-events-none -z-10" />
          {children}
        </div>
      </div>
    </div>
  );
}
