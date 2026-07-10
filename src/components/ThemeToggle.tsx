"use client";

import { Sun, Moon } from "lucide-react";
import { useTheme } from "@/providers/ThemeProvider";

export default function ThemeToggle() {
  const { theme, toggleTheme } = useTheme();

  return (
    <button
      onClick={toggleTheme}
      aria-label="Toggle theme"
      className="p-2 rounded-xl border transition-all
        border-[var(--border)] bg-[var(--surface)] text-[var(--fg-muted)]
        hover:text-[var(--fg)] hover:bg-[var(--surface-2)]"
    >
      {theme === "dark" ? <Sun className="w-4 h-4" /> : <Moon className="w-4 h-4" />}
    </button>
  );
}
