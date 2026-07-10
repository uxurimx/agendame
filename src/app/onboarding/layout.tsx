import Link from "next/link";

export default function OnboardingLayout({ children }: { children: React.ReactNode }) {
  return (
    <div
      className="min-h-screen flex flex-col"
      style={{ backgroundColor: "var(--l-bg, #F7F5FA)" }}
    >
      {/* Header mínimo */}
      <header className="px-6 py-5">
        <Link
          href="/"
          className="text-xl font-medium italic"
          style={{ fontFamily: "var(--font-fraunces), Georgia, serif", color: "#1A1420" }}
        >
          agénda<span style={{ color: "#E8631F" }}>me</span>
        </Link>
      </header>

      {/* Contenido centrado */}
      <main className="flex-1 flex items-center justify-center px-4 py-8">
        {children}
      </main>

      <footer className="py-4 text-center text-xs" style={{ color: "#6b6270" }}>
        agendame.mx · © 2026 Agéndame
      </footer>
    </div>
  );
}
