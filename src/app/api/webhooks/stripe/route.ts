// src/app/api/webhooks/stripe/route.ts
import { NextRequest, NextResponse } from 'next/server';
import { stripe } from '@/lib/stripe';
import { db } from '@/db';
import { businesses } from '@/db/schema';
import { eq } from 'drizzle-orm';
import type Stripe from 'stripe';

const PLAN_BY_PRICE: Record<string, string> = {
  [process.env.STRIPE_PRICE_BASICO!]:        'basico',
  [process.env.STRIPE_PRICE_PRO!]:           'pro',
  [process.env.STRIPE_PRICE_MULTISUCURSAL!]: 'multisucursal',
};

const STATUS_MAP: Record<string, string> = {
  active:             'active',
  trialing:           'trial',
  past_due:           'suspended',
  unpaid:             'suspended',
  canceled:           'cancelled',
  incomplete:         'suspended',
  incomplete_expired: 'cancelled',
  paused:             'suspended',
};

async function syncSubscription(sub: Stripe.Subscription) {
  const businessId = sub.metadata?.businessId;
  if (!businessId) return;

  const priceId    = sub.items.data[0]?.price.id ?? '';
  const plan       = PLAN_BY_PRICE[priceId] ?? 'basico';
  const planStatus = STATUS_MAP[sub.status] ?? 'suspended';

  await db.update(businesses)
    .set({ plan, planStatus, stripeSubscriptionId: sub.id, updatedAt: new Date() })
    .where(eq(businesses.id, businessId));
}

export async function POST(req: NextRequest) {
  const body = await req.text();
  const sig  = req.headers.get('stripe-signature') ?? '';

  let event: Stripe.Event;
  try {
    event = stripe.webhooks.constructEvent(body, sig, process.env.STRIPE_WEBHOOK_SECRET!);
  } catch (err) {
    console.error('[stripe/webhook] firma inválida:', err);
    return NextResponse.json({ error: 'Invalid signature' }, { status: 400 });
  }

  try {
    switch (event.type) {
      case 'checkout.session.completed': {
        const session = event.data.object as Stripe.Checkout.Session;
        if (session.mode === 'subscription' && session.client_reference_id && session.customer) {
          await db.update(businesses)
            .set({ stripeCustomerId: session.customer as string })
            .where(eq(businesses.id, session.client_reference_id));
        }
        break;
      }

      case 'customer.subscription.created':
      case 'customer.subscription.updated': {
        await syncSubscription(event.data.object as Stripe.Subscription);
        break;
      }

      case 'customer.subscription.deleted': {
        const sub = event.data.object as Stripe.Subscription;
        const businessId = sub.metadata?.businessId;
        if (businessId) {
          await db.update(businesses)
            .set({ planStatus: 'cancelled', updatedAt: new Date() })
            .where(eq(businesses.id, businessId));
        }
        break;
      }

      case 'invoice.payment_failed': {
        const invoice = event.data.object as Stripe.Invoice;
        const subDetails = invoice.parent?.subscription_details;
        const subRaw = subDetails?.subscription;
        const subId = typeof subRaw === 'string' ? subRaw : (subRaw as Stripe.Subscription | null | undefined)?.id;
        if (subId) {
          const sub = await stripe.subscriptions.retrieve(subId);
          await syncSubscription(sub);
        }
        break;
      }
    }

    return NextResponse.json({ received: true });
  } catch (err) {
    console.error('[stripe/webhook] error en handler:', err);
    return NextResponse.json({ error: 'Handler error' }, { status: 500 });
  }
}
