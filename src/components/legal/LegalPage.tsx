import Link from "next/link";
import Image from "next/image";
import { siteConfig } from "@/config/site";

type LegalSection = {
  title: string;
  paragraphs?: string[];
  bullets?: string[];
};

export default function LegalPage({
  title,
  updatedAt,
  intro,
  sections,
}: {
  title: string;
  updatedAt: string;
  intro: string;
  sections: LegalSection[];
}) {
  return (
    <div className="landing" style={{ minHeight: "100vh" }}>
      <nav
        style={{
          borderBottom: "1px solid var(--l-line)",
          padding: "0 1.5rem",
          height: 64,
          display: "flex",
          alignItems: "center",
          justifyContent: "space-between",
          maxWidth: 1100,
          margin: "0 auto",
          width: "100%",
        }}
      >
        <Link href="/" style={{ display: "flex", alignItems: "center" }}>
          <Image src="/agendame-logo.png" alt="Agéndame" width={120} height={48} style={{ objectFit: "contain" }} />
        </Link>
        <Link
          href="/sign-up"
          style={{
            padding: "0.45rem 1rem",
            borderRadius: "0.625rem",
            background: "linear-gradient(135deg, #6E2A96, #E8631F)",
            color: "white",
            fontSize: "0.82rem",
            fontWeight: 600,
            textDecoration: "none",
          }}
        >
          Crear cuenta
        </Link>
      </nav>

      <main style={{ maxWidth: 860, margin: "0 auto", padding: "3rem 1.5rem 4rem" }}>
        <div style={{ marginBottom: "2rem" }}>
          <p
            style={{
              display: "inline-block",
              background: "linear-gradient(90deg, #6E2A96, #E8631F)",
              WebkitBackgroundClip: "text",
              WebkitTextFillColor: "transparent",
              fontSize: "0.78rem",
              fontWeight: 700,
              letterSpacing: "0.1em",
              textTransform: "uppercase",
              marginBottom: "1rem",
            }}
          >
            Legal
          </p>
          <h1 style={{ fontSize: "clamp(2rem, 4vw, 3rem)", lineHeight: 1.1, color: "var(--l-ink)", marginBottom: ".75rem" }}>
            {title}
          </h1>
          <p style={{ color: "var(--l-ink-soft)", fontSize: ".95rem", marginBottom: ".5rem" }}>
            Última actualización: {updatedAt}
          </p>
          <p style={{ color: "var(--l-ink-soft)", fontSize: ".98rem", lineHeight: 1.7 }}>{intro}</p>
        </div>

        <div style={{ display: "flex", flexDirection: "column", gap: "1rem" }}>
          {sections.map((section) => (
            <section
              key={section.title}
              style={{
                background: "white",
                border: "1px solid var(--l-line)",
                borderRadius: "1.25rem",
                padding: "1.25rem 1.35rem",
                boxShadow: "0 10px 28px rgba(64, 36, 91, 0.06)",
              }}
            >
              <h2 style={{ fontSize: "1rem", fontWeight: 700, color: "var(--l-ink)", marginBottom: ".75rem" }}>{section.title}</h2>
              {section.paragraphs?.map((paragraph) => (
                <p key={paragraph} style={{ color: "var(--l-ink-soft)", fontSize: ".92rem", lineHeight: 1.7, marginBottom: ".75rem" }}>
                  {paragraph}
                </p>
              ))}
              {section.bullets && (
                <ul style={{ margin: 0, paddingLeft: "1.15rem", color: "var(--l-ink-soft)", fontSize: ".92rem", lineHeight: 1.7 }}>
                  {section.bullets.map((bullet) => (
                    <li key={bullet}>{bullet}</li>
                  ))}
                </ul>
              )}
            </section>
          ))}
        </div>
      </main>

      <div
        style={{
          borderTop: "1px solid var(--l-line)",
          padding: "1.5rem",
          textAlign: "center",
          fontSize: "0.78rem",
          color: "var(--l-ink-soft)",
        }}
      >
        © {new Date().getFullYear()} {siteConfig.name}
      </div>
    </div>
  );
}
