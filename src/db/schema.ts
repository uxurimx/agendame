import {
  pgTable, text, varchar, timestamp, integer, boolean,
  jsonb, numeric, uuid, date, time, serial, primaryKey, index,
} from 'drizzle-orm/pg-core';
import { relations } from 'drizzle-orm';

// ── Users (sync desde Clerk via webhook) ─────────────────────
export const users = pgTable('users', {
  id:        text('id').primaryKey(), // Clerk user ID
  email:     text('email').notNull(),
  name:      text('name').notNull(),
  role:      varchar('role', { length: 50 }).notNull().default('member'),
  createdAt: timestamp('created_at').defaultNow(),
});

// ── Businesses ────────────────────────────────────────────────
// plan:        basico | pro | multisucursal
// planStatus:  trial | active | suspended | cancelled
// schedule:    { mon: { open: "09:00", close: "18:00", closed: false }, ... }
export const businesses = pgTable('businesses', {
  id:                   uuid('id').primaryKey().defaultRandom(),
  ownerId:              text('owner_id').notNull().references(() => users.id, { onDelete: 'cascade' }),
  slug:                 varchar('slug', { length: 100 }).notNull().unique(),
  name:                 text('name').notNull(),
  type:                 varchar('type', { length: 50 }).notNull().default('otro'), // manicura | barberia | lashista | estetica | estilista | otro
  plan:                 varchar('plan', { length: 30 }).notNull().default('basico'),
  planStatus:           varchar('plan_status', { length: 30 }).notNull().default('trial'),
  trialEndsAt:          timestamp('trial_ends_at'),
  stripeCustomerId:     text('stripe_customer_id'),
  stripeSubscriptionId: text('stripe_subscription_id'),
  phone:                varchar('phone', { length: 20 }),
  address:              text('address'),
  timezone:             varchar('timezone', { length: 50 }).notNull().default('America/Mexico_City'),
  schedule:             jsonb('schedule'),
  logoUrl:              text('logo_url'),
  createdAt:            timestamp('created_at').defaultNow(),
  updatedAt:            timestamp('updated_at').defaultNow(),
}, (t) => [
  index('biz_owner_idx').on(t.ownerId),
  index('biz_slug_idx').on(t.slug),
]);

// ── Professionals (equipo del negocio) ───────────────────────
// commissionType: percentage | fixed
export const professionals = pgTable('professionals', {
  id:              uuid('id').primaryKey().defaultRandom(),
  businessId:      uuid('business_id').notNull().references(() => businesses.id, { onDelete: 'cascade' }),
  name:            text('name').notNull(),
  phone:           varchar('phone', { length: 20 }),
  email:           text('email'),
  bio:             text('bio'),
  avatarUrl:       text('avatar_url'),
  commissionType:  varchar('commission_type', { length: 20 }).notNull().default('percentage'),
  commissionValue: numeric('commission_value', { precision: 10, scale: 2 }).notNull().default('0'),
  isActive:        boolean('is_active').notNull().default(true),
  createdAt:       timestamp('created_at').defaultNow(),
}, (t) => [
  index('prof_business_idx').on(t.businessId),
]);

// ── Services (catálogo de servicios) ─────────────────────────
export const services = pgTable('services', {
  id:          uuid('id').primaryKey().defaultRandom(),
  businessId:  uuid('business_id').notNull().references(() => businesses.id, { onDelete: 'cascade' }),
  name:        text('name').notNull(),
  description: text('description'),
  price:       numeric('price', { precision: 10, scale: 2 }).notNull(),
  durationMin: integer('duration_min').notNull(), // duración en minutos
  category:    varchar('category', { length: 100 }),
  isActive:    boolean('is_active').notNull().default(true),
  createdAt:   timestamp('created_at').defaultNow(),
}, (t) => [
  index('svc_business_idx').on(t.businessId),
]);

// ── Service ↔ Professional (qué servicios da cada profesional) ─
export const serviceProfessionals = pgTable('service_professionals', {
  serviceId:      uuid('service_id').notNull().references(() => services.id, { onDelete: 'cascade' }),
  professionalId: uuid('professional_id').notNull().references(() => professionals.id, { onDelete: 'cascade' }),
}, (t) => [
  primaryKey({ columns: [t.serviceId, t.professionalId] }),
]);

// ── Clients (clientas del negocio) ───────────────────────────
export const clients = pgTable('clients', {
  id:             uuid('id').primaryKey().defaultRandom(),
  businessId:     uuid('business_id').notNull().references(() => businesses.id, { onDelete: 'cascade' }),
  name:           text('name').notNull(),
  phone:          varchar('phone', { length: 20 }).notNull(),
  email:          text('email'),
  notes:          text('notes'),
  loyaltyPoints:  integer('loyalty_points').notNull().default(0),
  createdAt:      timestamp('created_at').defaultNow(),
}, (t) => [
  index('client_business_idx').on(t.businessId),
  index('client_phone_idx').on(t.businessId, t.phone),
]);

// ── Client Photos (historial visual de referencias) ──────────
export const clientPhotos = pgTable('client_photos', {
  id:            uuid('id').primaryKey().defaultRandom(),
  clientId:      uuid('client_id').notNull().references(() => clients.id, { onDelete: 'cascade' }),
  appointmentId: uuid('appointment_id'), // FK a appointments, nullable
  url:           text('url').notNull(),
  notes:         text('notes'),
  createdAt:     timestamp('created_at').defaultNow(),
});

// ── Appointments (citas) ──────────────────────────────────────
// status:        pending | confirmed | completed | cancelled | no_show
// paymentStatus: pending | paid | online
// paymentMethod: cash | card | transfer | online
export const appointments = pgTable('appointments', {
  id:                   uuid('id').primaryKey().defaultRandom(),
  businessId:           uuid('business_id').notNull().references(() => businesses.id, { onDelete: 'cascade' }),
  professionalId:       uuid('professional_id').notNull().references(() => professionals.id),
  serviceId:            uuid('service_id').notNull().references(() => services.id),
  clientId:             uuid('client_id').notNull().references(() => clients.id),
  date:                 date('date').notNull(),
  startTime:            time('start_time').notNull(),
  endTime:              time('end_time').notNull(), // startTime + service.durationMin
  status:               varchar('status', { length: 30 }).notNull().default('pending'),
  notes:                text('notes'),
  pricePaid:            numeric('price_paid', { precision: 10, scale: 2 }),
  commissionAmount:     numeric('commission_amount', { precision: 10, scale: 2 }),
  paymentStatus:        varchar('payment_status', { length: 20 }).notNull().default('pending'),
  paymentMethod:        varchar('payment_method', { length: 20 }),
  stripePaymentIntentId: text('stripe_payment_intent_id'),
  reminderSent:         boolean('reminder_sent').notNull().default(false),
  createdAt:            timestamp('created_at').defaultNow(),
  updatedAt:            timestamp('updated_at').defaultNow(),
}, (t) => [
  index('apt_business_date_idx').on(t.businessId, t.date),       // agenda del día
  index('apt_professional_date_idx').on(t.professionalId, t.date), // disponibilidad
  index('apt_client_idx').on(t.clientId),                          // historial cliente
]);

// ── Daily Reports (corte de caja) ────────────────────────────
// professionalId null = totales del negocio completo
export const dailyReports = pgTable('daily_reports', {
  id:                uuid('id').primaryKey().defaultRandom(),
  businessId:        uuid('business_id').notNull().references(() => businesses.id, { onDelete: 'cascade' }),
  professionalId:    uuid('professional_id').references(() => professionals.id),
  date:              date('date').notNull(),
  totalAppointments: integer('total_appointments').notNull().default(0),
  totalRevenue:      numeric('total_revenue', { precision: 10, scale: 2 }).notNull().default('0'),
  totalCommission:   numeric('total_commission', { precision: 10, scale: 2 }).notNull().default('0'),
  netRevenue:        numeric('net_revenue', { precision: 10, scale: 2 }).notNull().default('0'),
  generatedAt:       timestamp('generated_at').defaultNow(),
}, (t) => [
  index('report_business_date_idx').on(t.businessId, t.date),
]);

// ── Support Tickets (Poxelbit) ───────────────────────────────
// type:     bug | mejora | soporte | sugerencia | otro
// priority: baja | media | alta | urgente
// status:   abierto | en_proceso | resuelto | cerrado
export const tickets = pgTable('tickets', {
  id:           uuid('id').primaryKey().defaultRandom(),
  businessId:   uuid('business_id').notNull().references(() => businesses.id, { onDelete: 'cascade' }),
  userId:       text('user_id').notNull(),
  userEmail:    text('user_email').notNull(),
  businessName: text('business_name').notNull(),
  title:        text('title').notNull(),
  description:  text('description').notNull(),
  type:         varchar('type',     { length: 30 }).notNull().default('soporte'),
  priority:     varchar('priority', { length: 20 }).notNull().default('media'),
  status:       varchar('status',   { length: 30 }).notNull().default('abierto'),
  response:     text('response'),
  respondedAt:  timestamp('responded_at'),
  createdAt:    timestamp('created_at').defaultNow(),
  updatedAt:    timestamp('updated_at').defaultNow(),
}, (t) => [
  index('ticket_business_idx').on(t.businessId),
  index('ticket_status_idx').on(t.status),
]);

export const ticketsRelations = relations(tickets, ({ one }) => ({
  business: one(businesses, { fields: [tickets.businessId], references: [businesses.id] }),
}));

export type Ticket    = typeof tickets.$inferSelect;
export type NewTicket = typeof tickets.$inferInsert;

// ── Time Blocks (vacaciones, descansos, bloqueos) ────────────
export const timeBlocks = pgTable('time_blocks', {
  id:             uuid('id').primaryKey().defaultRandom(),
  businessId:     uuid('business_id').notNull().references(() => businesses.id, { onDelete: 'cascade' }),
  professionalId: uuid('professional_id').references(() => professionals.id, { onDelete: 'cascade' }),
  date:           date('date').notNull(),
  startTime:      time('start_time').notNull(),
  endTime:        time('end_time').notNull(),
  reason:         text('reason'),
  createdAt:      timestamp('created_at').defaultNow(),
}, (t) => [
  index('block_biz_date_idx').on(t.businessId, t.date),
]);

export const timeBlocksRelations = relations(timeBlocks, ({ one }) => ({
  business:     one(businesses,    { fields: [timeBlocks.businessId],     references: [businesses.id] }),
  professional: one(professionals, { fields: [timeBlocks.professionalId], references: [professionals.id] }),
}));

export type TimeBlock    = typeof timeBlocks.$inferSelect;
export type NewTimeBlock = typeof timeBlocks.$inferInsert;

// ── Analytics ─────────────────────────────────────────────────
export const pageViews = pgTable('page_views', {
  id:          serial('id').primaryKey(),
  sessionId:   varchar('session_id', { length: 36 }).notNull(),
  pathname:    text('pathname').notNull(),
  referrer:    text('referrer'),
  utmSource:   varchar('utm_source', { length: 100 }),
  utmMedium:   varchar('utm_medium', { length: 100 }),
  utmCampaign: varchar('utm_campaign', { length: 100 }),
  country:     varchar('country', { length: 2 }),
  city:        varchar('city', { length: 100 }),
  deviceType:  varchar('device_type', { length: 20 }),
  userAgent:   text('user_agent'),
  createdAt:   timestamp('created_at').defaultNow(),
});

export const analyticsEvents = pgTable('analytics_events', {
  id:         serial('id').primaryKey(),
  sessionId:  varchar('session_id', { length: 36 }).notNull(),
  eventName:  varchar('event_name', { length: 100 }).notNull(),
  properties: jsonb('properties'),
  pathname:   text('pathname'),
  createdAt:  timestamp('created_at').defaultNow(),
});

// ── Relations (para queries con joins en Drizzle) ─────────────
export const usersRelations = relations(users, ({ many }) => ({
  businesses: many(businesses),
}));

export const businessesRelations = relations(businesses, ({ one, many }) => ({
  owner:         one(users, { fields: [businesses.ownerId], references: [users.id] }),
  professionals: many(professionals),
  services:      many(services),
  clients:       many(clients),
  appointments:  many(appointments),
  dailyReports:  many(dailyReports),
}));

export const professionalsRelations = relations(professionals, ({ one, many }) => ({
  business:            one(businesses, { fields: [professionals.businessId], references: [businesses.id] }),
  appointments:        many(appointments),
  serviceProfessionals: many(serviceProfessionals),
  dailyReports:        many(dailyReports),
}));

export const servicesRelations = relations(services, ({ one, many }) => ({
  business:            one(businesses, { fields: [services.businessId], references: [businesses.id] }),
  appointments:        many(appointments),
  serviceProfessionals: many(serviceProfessionals),
}));

export const serviceProfessionalsRelations = relations(serviceProfessionals, ({ one }) => ({
  service:      one(services,      { fields: [serviceProfessionals.serviceId],      references: [services.id] }),
  professional: one(professionals, { fields: [serviceProfessionals.professionalId], references: [professionals.id] }),
}));

export const clientsRelations = relations(clients, ({ one, many }) => ({
  business:     one(businesses, { fields: [clients.businessId], references: [businesses.id] }),
  appointments: many(appointments),
  photos:       many(clientPhotos),
}));

export const clientPhotosRelations = relations(clientPhotos, ({ one }) => ({
  client: one(clients, { fields: [clientPhotos.clientId], references: [clients.id] }),
}));

export const appointmentsRelations = relations(appointments, ({ one }) => ({
  business:     one(businesses,    { fields: [appointments.businessId],     references: [businesses.id] }),
  professional: one(professionals, { fields: [appointments.professionalId], references: [professionals.id] }),
  service:      one(services,      { fields: [appointments.serviceId],      references: [services.id] }),
  client:       one(clients,       { fields: [appointments.clientId],       references: [clients.id] }),
}));

export const dailyReportsRelations = relations(dailyReports, ({ one }) => ({
  business:     one(businesses,    { fields: [dailyReports.businessId],     references: [businesses.id] }),
  professional: one(professionals, { fields: [dailyReports.professionalId], references: [professionals.id] }),
}));

// ── TypeScript types inferidos ────────────────────────────────
export type User         = typeof users.$inferSelect;
export type Business     = typeof businesses.$inferSelect;
export type Professional = typeof professionals.$inferSelect;
export type Service      = typeof services.$inferSelect;
export type Client       = typeof clients.$inferSelect;
export type ClientPhoto  = typeof clientPhotos.$inferSelect;
export type Appointment  = typeof appointments.$inferSelect;
export type DailyReport  = typeof dailyReports.$inferSelect;

export type NewBusiness     = typeof businesses.$inferInsert;
export type NewProfessional = typeof professionals.$inferInsert;
export type NewService      = typeof services.$inferInsert;
export type NewClient       = typeof clients.$inferInsert;
export type NewAppointment  = typeof appointments.$inferInsert;
