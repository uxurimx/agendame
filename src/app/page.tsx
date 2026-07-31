import Link from "next/link";
import Image from "next/image";
import { auth } from "@clerk/nextjs/server";
import { db } from "@/db";
import { businesses } from "@/db/schema";
import { eq } from "drizzle-orm";
import TicketCarousel from "@/components/landing/TicketCarousel";
import { siteConfig } from "@/config/site";
import PricingCards from "@/app/pricing/PricingCards";

const jsonLdApp = {
  "@context": "https://schema.org",
  "@type": "SoftwareApplication",
  name: "Agéndame",
  url: siteConfig.url,
  applicationCategory: "BusinessApplication",
  operatingSystem: "Web, PWA (instalable en iOS y Android)",
  description: "Sistema de citas online para manicuristas, lashistas, estilistas, barberos y estéticas en México.",
  inLanguage: "es-MX",
  offers: [
    { "@type": "Offer", name: "Plan Básico",       price: "299", priceCurrency: "MXN" },
    { "@type": "Offer", name: "Plan Pro",           price: "399", priceCurrency: "MXN" },
    { "@type": "Offer", name: "Plan Multisucursal", price: "749", priceCurrency: "MXN" },
  ],
  sameAs: [siteConfig.instagram, siteConfig.tiktok],
};

const jsonLdFaq = {
  "@context": "https://schema.org",
  "@type": "FAQPage",
  mainEntity: [
    { "@type": "Question", name: "¿Qué es Agéndame?", acceptedAnswer: { "@type": "Answer", text: "Agéndame es un sistema de citas online pensado para manicuristas, lashistas, estilistas, barberos y profesionales de estética en México." } },
    { "@type": "Question", name: "¿Necesito saber de tecnología?", acceptedAnswer: { "@type": "Answer", text: "No. Está diseñado para emprendedoras sin experiencia técnica, con una agenda simple tipo lista." } },
    { "@type": "Question", name: "¿Cuánto cuesta?", acceptedAnswer: { "@type": "Answer", text: "Plan Básico $299/mes, Plan Pro $399/mes, Plan Multisucursal $749/mes. Los tres incluyen 3 días de prueba gratis." } },
    { "@type": "Question", name: "¿Puedo cancelar cuando quiera?", acceptedAnswer: { "@type": "Answer", text: "Sí. Ningún plan tiene contrato forzoso." } },
  ],
};

export default async function LandingPage() {
  const { userId } = await auth();

  let currentPlan: string | null = null;
  let currentStatus: string | null = null;

  if (userId) {
    const biz = await db.query.businesses.findFirst({
      where: eq(businesses.ownerId, userId),
      columns: { plan: true, planStatus: true },
    });
    if (biz) {
      currentPlan = biz.plan;
      currentStatus = biz.planStatus;
    }
  }

  return (
    <>
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLdApp) }} />
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLdFaq) }} />

      <div className="landing">

        {/* ── Nav ── */}
        <nav className="l-nav">
          <div className="l-wrap">
            <Link
              href="/"
              aria-label="Ir al inicio"
              className="logo-mark"
              style={{
                width: "100%",
                maxWidth: 228,
                height: 92,
                position: "relative",
                flex: "0 1 228px",
              }}
            >
              <Image
                src="/agendame-logo.png"
                alt="Agendame"
                fill
                priority
                style={{ objectFit: "contain", objectPosition: "left top" }}
              />
            </Link>
            <Link href="/sign-in" className="btn-landing btn-primary-l" style={{ padding: "14px 22px" }}>
              Acceder
            </Link>
          </div>
        </nav>

        {/* ── Hero ── */}
        <header className="hero-l">
          <div className="l-wrap">
            <div>
              <span className="eyebrow">Para manicuristas, estilistas, barberos y lashistas</span>
              <h1>Tu agenda, sin <em>caos de WhatsApp.</em></h1>
              <p className="hero-sub">
                Agéndame organiza tus citas, bloquea tu tiempo según lo que dura cada servicio
                y avisa a tus clientas — todo desde un link que tú compartes.
              </p>
              <div className="hero-actions">
                <Link href="/sign-up?plan=basico" className="btn-landing btn-primary-l">
                  Empezar prueba gratis
                </Link>
                <Link href="#como-funciona" className="btn-landing btn-ghost-l">
                  Ver cómo funciona
                </Link>
              </div>
              <p className="hero-note" style={{ marginTop: 18 }}>
                3 días gratis · sin tarjeta · cancela cuando quieras
              </p>
            </div>

            <TicketCarousel />
          </div>
        </header>

        {/* ── Problema ── */}
        <section className="problem">
          <div className="l-wrap">
            <div className="problem-head">
              <span className="eyebrow">El problema de siempre</span>
              <h2>Agendar por WhatsApp funciona… hasta que no.</h2>
            </div>
            <div className="problem-grid">
              <div className="problem-card">Se te cruzan dos citas en el chat y una clienta llega sin espacio.</div>
              <div className="problem-card">Pierdes el mensaje con la foto del diseño que te pidieron.</div>
              <div className="problem-card">Al final del día no sabes si lo que cobraste cuadra con lo agendado.</div>
            </div>
            <p className="problem-tail">Agéndame resuelve los tres.</p>
          </div>
        </section>

        {/* ── Features ── */}
        <section className="features-l">
          <div className="l-wrap">
            <div className="features-head">
              <span className="eyebrow">Qué incluye</span>
              <h2>Todo lo que ya haces a mano, ahora en un solo lugar.</h2>
            </div>
            <div className="feature-grid">
              {[
                { tag: "AGENDA",              title: "Agenda visual por bloques",   desc: "Ve tu día en una lista simple: qué está ocupado, qué está libre y cuánto dura cada cita — sin cuadrículas complicadas." },
                { tag: "CLIENTAS",            title: "Historial de clientas",       desc: "El historial de cada clienta, con sus diseños y fotos anteriores, listo antes de que llegue a su cita." },
                { tag: "CAJA",                title: "Corte de caja diario",        desc: "Un corte automático al final del día que te dice si lo cobrado cuadra con lo que agendaste." },
                { tag: "AVISOS",              title: "Notificaciones al instante",  desc: "Te llega una notificación cada vez que alguien agenda, cancela o está por llegar." },
                { tag: "EQUIPO",              title: "Trabaja en equipo",           desc: "Tus clientas eligen \"cualquiera disponible\" o una profesional específica. Tú defines la comisión de cada una." },
                { tag: "FIDELIDAD (OPCIONAL)", title: "Programa de fidelidad",      desc: "Actívalo cuando quieras premiar a tus clientas frecuentes con descuentos o visitas de regalo." },
              ].map(({ tag, title, desc }) => (
                <div key={tag} className="feature-card">
                  <span className="tag">{tag}</span>
                  <h3 style={{ fontSize: 17, margin: "0 0 8px" }}>{title}</h3>
                  <p>{desc}</p>
                </div>
              ))}
            </div>
          </div>
        </section>

        {/* ── Cómo funciona ── */}
        <section className="how-l" id="como-funciona">
          <div className="l-wrap">
            <div className="how-head">
              <span className="eyebrow">Cómo funciona</span>
              <h2>Tres pasos, como llenar un ticket de cita.</h2>
            </div>
            <div className="how-row">
              {[
                { step: "Servicio",      desc: "Sube tus servicios, precios y duración una sola vez." },
                {
                  step: "Comparte",
                  desc: (
                    <>
                      Comparte <span className="how-inline-link">agendame.mx/tunombre</span> en tus redes
                      sociales y/o WhatsApp.
                    </>
                  ),
                },
                { step: "Confirmación",  desc: "Tus clientas agendan solas. Tú solo revisas tu día." },
              ].map(({ step, desc }) => (
                <div key={step} className="ticket how-step">
                  <div className="ticket-main">
                    <span className="stub-tag">{step}</span>
                    <p className="how-desc">{desc}</p>
                  </div>
                </div>
              ))}
            </div>
            <p style={{ fontSize: 12.5, color: "var(--l-ink-soft)", marginTop: 16 }}>
              *Con nombre personalizado disponible como compra adicional.
            </p>
          </div>
        </section>

        {/* ── Precios ── */}
        <section className="pricing-l" id="precios">
          <div className="l-wrap">
            <div className="pricing-head">
              <span className="eyebrow">Precios</span>
              <h2>Empieza gratis. Sigue cuando te convenza.</h2>
              <p style={{ fontSize: 14, color: "var(--l-ink-soft)", marginTop: 10 }}>
                Sin contratos forzosos. Cancela cuando quieras, en cualquier plan.
              </p>
            </div>
            <PricingCards
              isAuthenticated={!!userId}
              currentPlan={currentPlan}
              currentStatus={currentStatus}
              variant="landing"
            />
          </div>
        </section>

        {/* ── FAQ ── */}
        <section className="faq-l" id="preguntas">
          <div className="l-wrap">
            <div className="pricing-head" style={{ textAlign: "left", maxWidth: 560, margin: "0 0 34px" }}>
              <span className="eyebrow">Preguntas frecuentes</span>
              <h2 style={{ fontSize: 32 }}>Dudas que resolvemos antes de que las escribas</h2>
            </div>
            <div className="faq-list">
              {[
                { q: "¿Qué es Agéndame?", a: "Agéndame es un sistema de citas online pensado para manicuristas, lashistas, estilistas, barberos y profesionales de estética en México. Organiza la agenda, bloquea el tiempo automáticamente según la duración de cada servicio y avisa cuando alguien agenda.", open: true },
                { q: "¿Necesito saber de tecnología para usarlo?", a: "No. Agéndame está pensado para emprendedoras y profesionales sin experiencia técnica: agenda tipo lista, sin cuadrículas complicadas ni configuración avanzada." },
                { q: "¿Sirve para barberías y estéticas, o solo para manicuristas?", a: "Sirve para cualquier negocio de servicios por cita: manicuristas, lashistas, estilistas, barberos y estéticas." },
                { q: "¿Cuánto cuesta Agéndame?", a: "Tres planes: Básico $299/mes, Pro $399/mes con fidelidad y pagos en línea, y Multisucursal $749/mes para 2 o más sucursales. Los tres incluyen 3 días de prueba gratis." },
                { q: "¿Puedo cancelar cuando quiera?", a: "Sí. Ningún plan tiene contrato forzoso — cancelas cuando quieras, sin penalización." },
                { q: "¿Cómo pagan mis clientas en línea?", a: "El Plan Pro y el Plan Multisucursal incluyen pagos en línea al confirmar la cita, para reducir cancelaciones de última hora." },
                { q: "¿Puedo tener el link con el nombre de mi negocio solamente?", a: "Sí. Desde la misma plataforma levantas una solicitud de compra, ves el costo y pagas ahí mismo — sin trámites externos." },
                { q: "¿Puedo tener varias trabajadoras y separar sus comisiones?", a: "Sí. Cada profesional se da de alta con su propia comisión (porcentaje o monto fijo), y el corte de caja diario separa automáticamente cuánto generó cada una." },
              ].map(({ q, a, open }) => (
                <details key={q} className="faq-item" open={open}>
                  <summary>{q}</summary>
                  <p>{a}</p>
                </details>
              ))}
            </div>
          </div>
        </section>

        {/* ── Footer ── */}
        <footer className="l-footer">
          <div className="l-wrap">
            <span
              className="logo-mark"
              style={{
                width: "100%",
                maxWidth: 176,
                height: 58,
                position: "relative",
              }}
            >
              <Image
                src="/agendame-logo.png"
                alt="Agendame"
                fill
                style={{ objectFit: "contain", objectPosition: "left center" }}
              />
            </span>
            <div className="footer-social">
              <a
                className="social-icon-link"
                href={siteConfig.instagram}
                target="_blank"
                rel="noopener noreferrer"
                aria-label="Instagram de Agéndame"
              >
                <svg viewBox="0 0 24 24" aria-hidden="true">
                  <path d="M7.75 2h8.5A5.75 5.75 0 0 1 22 7.75v8.5A5.75 5.75 0 0 1 16.25 22h-8.5A5.75 5.75 0 0 1 2 16.25v-8.5A5.75 5.75 0 0 1 7.75 2Zm0 1.5A4.25 4.25 0 0 0 3.5 7.75v8.5a4.25 4.25 0 0 0 4.25 4.25h8.5a4.25 4.25 0 0 0 4.25-4.25v-8.5a4.25 4.25 0 0 0-4.25-4.25h-8.5Zm8.88 1.75a1.12 1.12 0 1 1 0 2.24 1.12 1.12 0 0 1 0-2.24ZM12 6.5A5.5 5.5 0 1 1 6.5 12 5.5 5.5 0 0 1 12 6.5Zm0 1.5A4 4 0 1 0 16 12a4 4 0 0 0-4-4Z" />
                </svg>
              </a>
              <a
                className="social-handle"
                href={siteConfig.tiktok}
                target="_blank"
                rel="noopener noreferrer"
                aria-label="TikTok de Agéndame"
              >
                <span className="social-icon-link">
                  <svg viewBox="0 0 24 24" aria-hidden="true">
                    <path d="M14.54 2h2.64c.22 1.88 1.5 3.58 3.32 4.24v2.77a6.52 6.52 0 0 1-3.14-1.09v6.46a5.87 5.87 0 1 1-5.13-5.83v2.79a3.1 3.1 0 1 0 2.31 2.99V2Z" />
                  </svg>
                </span>
                <span>@agendamemx</span>
              </a>
            </div>
            <p>
              agendame.mx · © 2026 <a className="footer-credit" href="https://poxelbit.mx" target="_blank" rel="noopener noreferrer">by PoxelBit</a>
            </p>
          </div>
        </footer>

      </div>
    </>
  );
}
