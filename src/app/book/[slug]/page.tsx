import { notFound } from "next/navigation";
import { db } from "@/db";
import { businesses, professionals, services } from "@/db/schema";
import { eq, and } from "drizzle-orm";
import { BookingFlow } from "@/components/booking/BookingFlow";
import type { Metadata } from "next";

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
