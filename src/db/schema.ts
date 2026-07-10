import { pgTable, text, varchar, timestamp, serial, jsonb } from 'drizzle-orm/pg-core';

export const users = pgTable('users', {
  id: text('id').primaryKey(), // Clerk user ID
  email: text('email').notNull(),
  name: text('name').notNull(),
  role: varchar('role', { length: 50 }).notNull().default('member'),
  createdAt: timestamp('created_at').defaultNow(),
});

// ── Analytics ────────────────────────────────────────────────
export const pageViews = pgTable('page_views', {
  id: serial('id').primaryKey(),
  sessionId: varchar('session_id', { length: 36 }).notNull(),
  pathname: text('pathname').notNull(),
  referrer: text('referrer'),
  utmSource: varchar('utm_source', { length: 100 }),
  utmMedium: varchar('utm_medium', { length: 100 }),
  utmCampaign: varchar('utm_campaign', { length: 100 }),
  country: varchar('country', { length: 2 }),
  city: varchar('city', { length: 100 }),
  deviceType: varchar('device_type', { length: 20 }), // mobile | tablet | desktop
  userAgent: text('user_agent'),
  createdAt: timestamp('created_at').defaultNow(),
});

export const analyticsEvents = pgTable('analytics_events', {
  id: serial('id').primaryKey(),
  sessionId: varchar('session_id', { length: 36 }).notNull(),
  eventName: varchar('event_name', { length: 100 }).notNull(),
  properties: jsonb('properties'),
  pathname: text('pathname'),
  createdAt: timestamp('created_at').defaultNow(),
});
