// src/app/api/billing/portal/route.ts
import { NextResponse } from 'next/server';
import { auth } from '@clerk/nextjs/server';
import { stripe } from '@/lib/stripe';
import { db } from '@/db';
import { businesses } from '@/db/schema';
import { eq } from 'drizzle-orm';
import { siteConfig } from '@/config/site';

export async function POST() {
  try {
    const { userId } = await auth();
    if (!userId) return NextResponse.json({ error: 'No autorizado' }, { status: 401 });

    const biz = await db.query.businesses.findFirst({
      where: eq(businesses.ownerId, userId),
    });
    if (!biz?.stripeCustomerId) {
      return NextResponse.json({ error: 'Sin suscripción activa' }, { status: 400 });
    }

    const session = await stripe.billingPortal.sessions.create({
      customer:   biz.stripeCustomerId,
      return_url: `${siteConfig.url}/settings`,
    });

    return NextResponse.json({ url: session.url });
  } catch (err) {
    console.error('[billing/portal]', err);
    return NextResponse.json({ error: 'Error interno' }, { status: 500 });
  }
}
