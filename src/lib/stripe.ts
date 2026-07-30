// src/lib/stripe.ts
import Stripe from 'stripe';

// eslint-disable-next-line @typescript-eslint/no-explicit-any
export const stripe = new (Stripe as any)(process.env.STRIPE_SECRET_KEY!, {
  apiVersion: '2026-07-29.dahlia',
}) as Stripe;
