// src/app/api/billing/checkout/route.ts
import { NextRequest, NextResponse } from 'next/server';
import { auth, currentUser } from '@clerk/nextjs/server';
import { z } from 'zod';
import { stripe } from '@/lib/stripe';
import { db } from '@/db';
import { businesses } from '@/db/schema';
import { eq } from 'drizzle-orm';
import { siteConfig } from '@/config/site';

const PRICE_MAP: Record<string, string | undefined> = {
  basico:        process.env.STRIPE_PRICE_BASICO,
  pro:           process.env.STRIPE_PRICE_PRO,
  multisucursal: process.env.STRIPE_PRICE_MULTISUCURSAL,
};

const schema = z.object({
  plan: z.enum(['basico', 'pro', 'multisucursal']),
});

export async function POST(req: NextRequest) {
  try {
    const { userId } = await auth();
    if (!userId) return NextResponse.json({ error: 'No autorizado' }, { status: 401 });

    const body = await req.json();
    const { plan } = schema.parse(body);

    const priceId = PRICE_MAP[plan];
    if (!priceId) return NextResponse.json({ error: 'Precio no configurado' }, { status: 500 });

    const biz = await db.query.businesses.findFirst({
      where: eq(businesses.ownerId, userId),
    });
    if (!biz) return NextResponse.json({ error: 'Negocio no encontrado' }, { status: 404 });

    let customerId = biz.stripeCustomerId;
    if (!customerId) {
      const clerkUser = await currentUser();
      const customer = await stripe.customers.create({
        email: clerkUser?.emailAddresses[0]?.emailAddress ?? '',
        name:  biz.name,
        metadata: { businessId: biz.id, userId },
      });
      customerId = customer.id;
      await db.update(businesses)
        .set({ stripeCustomerId: customerId })
        .where(eq(businesses.id, biz.id));
    }

    const session = await stripe.checkout.sessions.create({
      customer:             customerId,
      mode:                 'subscription',
      line_items:           [{ price: priceId, quantity: 1 }],
      success_url:          `${siteConfig.url}/settings?upgraded=1`,
      cancel_url:           `${siteConfig.url}/pricing`,
      client_reference_id:  biz.id,
      subscription_data: {
        metadata: { businessId: biz.id, plan },
      },
      locale: 'es-419',
    });

    return NextResponse.json({ url: session.url });
  } catch (err) {
    if (err instanceof z.ZodError) {
      return NextResponse.json({ error: err.message }, { status: 400 });
    }
    console.error('[billing/checkout]', err);
    return NextResponse.json({ error: 'Error interno' }, { status: 500 });
  }
}
