import { notFound } from "next/navigation";
import { db } from "@/db";
import { businesses, professionals, services } from "@/db/schema";
import { eq, and } from "drizzle-orm";
import { BookingFlow } from "@/components/booking/BookingFlow";
import type { Metadata } from "next";
import { isBusinessBlocked } from "@/lib/trial";

interface Props {
  params: Promise<{ slug: string }>;
}

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { slug } = await params;
  const biz = await db.query.businesses.findFirst({ where: eq(businesses.slug, slug) });
  if (!biz) return { title: "Negocio no encontrado" };
  return {
    title: `Agendar cita · ${biz.name}`,
    description: `Reserva tu cita en ${biz.name} fácilmente.`,
  };
}

export default async function BookPage({ params }: Props) {
  const { slug } = await params;

  const biz = await db.query.businesses.findFirst({
    where: eq(businesses.slug, slug),
  });
  if (!biz) notFound();
  if (isBusinessBlocked(biz.planStatus, biz.trialEndsAt, biz.createdAt)) {
    return (
      <div className="min-h-screen flex items-center justify-center px-6" style={{ background: "var(--l-rose, #EFE6F5)" }}>
        <div style={{ maxWidth: 560, width: "100%", background: "white", borderRadius: "1.25rem", padding: "2rem", boxShadow: "0 20px 50px rgba(0,0,0,0.08)", textAlign: "center" }}>
          <p style={{ fontSize: "0.78rem", fontWeight: 700, letterSpacing: "0.08em", textTransform: "uppercase", color: "#dc2626", marginBottom: "0.75rem" }}>
            Reservas inhabilitadas
          </p>
          <h1 style={{ fontSize: "1.8rem", fontWeight: 800, color: "var(--l-ink)", lineHeight: 1.15, marginBottom: "0.75rem" }}>
            Esta agenda está temporalmente desactivada.
          </h1>
          <p style={{ fontSize: "0.96rem", color: "var(--l-ink-soft)", lineHeight: 1.6 }}>
            El negocio debe reactivar su plan para volver a aceptar reservas en línea.
          </p>
        </div>
      </div>
    );
  }

  const [pros, svcs, serviceProRows] = await Promise.all([
    db.query.professionals.findMany({
      where: and(eq(professionals.businessId, biz.id), eq(professionals.isActive, true)),
    }),
    db.query.services.findMany({
      where: and(eq(services.businessId, biz.id), eq(services.isActive, true)),
    }),
    db.query.serviceProfessionals.findMany({
      columns: {
        serviceId: true,
        professionalId: true,
      },
    }),
  ]);

  const activeProfessionalIds = new Set(pros.map((pro) => pro.id));
  const serviceProfessionalMap = new Map<string, string[]>();

  for (const row of serviceProRows) {
    if (!activeProfessionalIds.has(row.professionalId)) continue;
    const proIds = serviceProfessionalMap.get(row.serviceId) ?? [];
    proIds.push(row.professionalId);
    serviceProfessionalMap.set(row.serviceId, proIds);
  }

  return (
    <div className="min-h-screen" style={{ background: "var(--l-rose, #EFE6F5)" }}>
      <BookingFlow
        business={{
          id:       biz.id,
          name:     biz.name,
          slug:     biz.slug,
          type:     biz.type,
          phone:    biz.phone ?? undefined,
          logoUrl:  biz.logoUrl ?? undefined,
          timezone: biz.timezone,
          schedule: biz.schedule as Record<string, { open: string; close: string; closed: boolean }> | null,
        }}
        professionals={pros.map((p) => ({ id: p.id, name: p.name, avatarUrl: p.avatarUrl ?? undefined }))}
        services={svcs.map((s) => ({
          id:          s.id,
          name:        s.name,
          price:       Number(s.price),
          durationMin: s.durationMin,
          description: s.description ?? undefined,
          category:    s.category ?? undefined,
          professionalIds: serviceProfessionalMap.get(s.id) ?? [],
        }))}
      />
    </div>
  );
}
