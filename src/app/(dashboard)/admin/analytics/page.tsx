import { db } from "@/db";
import { pageViews, analyticsEvents } from "@/db/schema";
import { sql, gte, and } from "drizzle-orm";
import { auth, currentUser } from "@clerk/nextjs/server";
import { redirect } from "next/navigation";
import AnalyticsCharts from "./AnalyticsCharts";

const ADMIN_EMAIL = process.env.ADMIN_EMAIL;

async function getStats(since: Date) {
  const [
    totalViews,
    uniqueSessions,
    topPages,
    topSources,
    byCountry,
    byDevice,
    dailyViews,
    topEvents,
  ] = await Promise.all([
    // Total page views
    db
      .select({ count: sql<number>`cast(count(*) as int)` })
      .from(pageViews)
      .where(gte(pageViews.createdAt, since)),

    // Unique sessions
    db
      .select({ count: sql<number>`cast(count(distinct session_id) as int)` })
      .from(pageViews)
      .where(gte(pageViews.createdAt, since)),

    // Top páginas
    db
      .select({
        pathname: pageViews.pathname,
        views:    sql<number>`cast(count(*) as int)`,
        sessions: sql<number>`cast(count(distinct session_id) as int)`,
      })
      .from(pageViews)
      .where(gte(pageViews.createdAt, since))
      .groupBy(pageViews.pathname)
      .orderBy(sql`count(*) desc`)
      .limit(10),

    // Fuentes de tráfico
    db
      .select({
        source: sql<string>`coalesce(utm_source, case when referrer is null or referrer = '' then 'Directo' when referrer like '%google%' then 'Google' when referrer like '%instagram%' then 'Instagram' when referrer like '%facebook%' then 'Facebook' when referrer like '%tiktok%' then 'TikTok' when referrer like '%twitter%' then 'Twitter/X' else 'Otros' end)`,
        count:  sql<number>`cast(count(*) as int)`,
      })
      .from(pageViews)
      .where(gte(pageViews.createdAt, since))
      .groupBy(sql`coalesce(utm_source, case when referrer is null or referrer = '' then 'Directo' when referrer like '%google%' then 'Google' when referrer like '%instagram%' then 'Instagram' when referrer like '%facebook%' then 'Facebook' when referrer like '%tiktok%' then 'TikTok' when referrer like '%twitter%' then 'Twitter/X' else 'Otros' end)`)
      .orderBy(sql`count(*) desc`)
      .limit(8),

    // Por país
    db
      .select({
        country: sql<string>`coalesce(country, 'Desconocido')`,
        count:   sql<number>`cast(count(*) as int)`,
      })
      .from(pageViews)
      .where(gte(pageViews.createdAt, since))
      .groupBy(pageViews.country)
      .orderBy(sql`count(*) desc`)
      .limit(10),

    // Por dispositivo
    db
      .select({
        device: sql<string>`coalesce(device_type, 'unknown')`,
        count:  sql<number>`cast(count(*) as int)`,
      })
      .from(pageViews)
      .where(gte(pageViews.createdAt, since))
      .groupBy(pageViews.deviceType)
      .orderBy(sql`count(*) desc`),

    // Visitas por día
    db
      .select({
        day:   sql<string>`to_char(created_at, 'YYYY-MM-DD')`,
        views: sql<number>`cast(count(*) as int)`,
        sessions: sql<number>`cast(count(distinct session_id) as int)`,
      })
      .from(pageViews)
      .where(gte(pageViews.createdAt, since))
      .groupBy(sql`to_char(created_at, 'YYYY-MM-DD')`)
      .orderBy(sql`to_char(created_at, 'YYYY-MM-DD')`),

    // Top eventos
    db
      .select({
        event: analyticsEvents.eventName,
        count: sql<number>`cast(count(*) as int)`,
      })
      .from(analyticsEvents)
      .where(gte(analyticsEvents.createdAt, since))
      .groupBy(analyticsEvents.eventName)
      .orderBy(sql`count(*) desc`)
      .limit(10),
  ]);

  return {
    totalViews:    totalViews[0]?.count ?? 0,
    uniqueSessions: uniqueSessions[0]?.count ?? 0,
    topPages,
    topSources,
    byCountry,
    byDevice,
    dailyViews,
    topEvents,
  };
}

export default async function AnalyticsPage({
  searchParams,
}: {
  searchParams: Promise<{ days?: string }>;
}) {
  const { userId } = await auth();
  if (!userId) redirect("/sign-in");

  const user = await currentUser();
  const email = user?.emailAddresses[0]?.emailAddress;
  if (ADMIN_EMAIL && email !== ADMIN_EMAIL) redirect("/overview");

  const { days: daysParam } = await searchParams;
  const days = parseInt(daysParam ?? "30", 10);
  const since = new Date(Date.now() - days * 24 * 60 * 60 * 1000);

  const stats = await getStats(since);

  return (
    <div className="p-8 max-w-7xl mx-auto">
      <div className="flex items-center justify-between mb-8">
        <div>
          <h1 className="text-2xl font-bold" style={{ color: "var(--fg)" }}>
            Métricas del sitio
          </h1>
          <p className="text-sm mt-1" style={{ color: "var(--fg-muted)" }}>
            Datos propios · sin terceros · últimos {days} días
          </p>
        </div>
        <div className="flex gap-2">
          {[7, 30, 90].map((d) => (
            <a
              key={d}
              href={`?days=${d}`}
              className={`px-3 py-1.5 rounded-lg text-sm font-medium border transition-colors ${
                days === d
                  ? "text-white border-transparent"
                  : "border-[var(--border)] text-[var(--fg-muted)] hover:text-[var(--fg)]"
              }`}
              style={days === d ? { background: "var(--accent)" } : { background: "var(--surface)" }}
            >
              {d}d
            </a>
          ))}
        </div>
      </div>

      {/* KPIs */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-8">
        {[
          { label: "Page Views",        value: stats.totalViews.toLocaleString("es-MX") },
          { label: "Sesiones únicas",   value: stats.uniqueSessions.toLocaleString("es-MX") },
          { label: "Páginas distintas", value: stats.topPages.length.toString() },
          { label: "Fuentes",           value: stats.topSources.length.toString() },
        ].map(({ label, value }) => (
          <div
            key={label}
            className="rounded-2xl border p-5"
            style={{ background: "var(--surface)", borderColor: "var(--border)" }}
          >
            <p className="text-xs font-semibold uppercase tracking-wider mb-2" style={{ color: "var(--fg-muted)" }}>
              {label}
            </p>
            <p className="text-3xl font-bold" style={{ color: "var(--fg)" }}>{value}</p>
          </div>
        ))}
      </div>

      {/* Charts (client component) */}
      <AnalyticsCharts
        dailyViews={stats.dailyViews}
        topSources={stats.topSources}
        byDevice={stats.byDevice}
      />

      {/* Tablas */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mt-6">

        {/* Páginas más visitadas */}
        <div className="rounded-2xl border overflow-hidden" style={{ background: "var(--surface)", borderColor: "var(--border)" }}>
          <div className="px-5 py-4 border-b" style={{ borderColor: "var(--border)" }}>
            <h3 className="font-semibold text-sm" style={{ color: "var(--fg)" }}>Páginas más visitadas</h3>
          </div>
          <table className="w-full text-sm">
            <thead>
              <tr style={{ borderBottom: "1px solid var(--border)" }}>
                <th className="text-left px-5 py-2.5 font-medium" style={{ color: "var(--fg-muted)" }}>Página</th>
                <th className="text-right px-5 py-2.5 font-medium" style={{ color: "var(--fg-muted)" }}>Views</th>
                <th className="text-right px-5 py-2.5 font-medium" style={{ color: "var(--fg-muted)" }}>Sesiones</th>
              </tr>
            </thead>
            <tbody>
              {stats.topPages.map((p) => (
                <tr key={p.pathname} className="border-b last:border-0" style={{ borderColor: "var(--border)" }}>
                  <td className="px-5 py-2.5 font-mono text-xs truncate max-w-[160px]" style={{ color: "var(--fg)" }}>{p.pathname}</td>
                  <td className="px-5 py-2.5 text-right" style={{ color: "var(--fg)" }}>{p.views}</td>
                  <td className="px-5 py-2.5 text-right" style={{ color: "var(--fg-muted)" }}>{p.sessions}</td>
                </tr>
              ))}
              {stats.topPages.length === 0 && (
                <tr><td colSpan={3} className="px-5 py-8 text-center text-sm" style={{ color: "var(--fg-muted)" }}>Sin datos aún</td></tr>
              )}
            </tbody>
          </table>
        </div>

        {/* Países */}
        <div className="rounded-2xl border overflow-hidden" style={{ background: "var(--surface)", borderColor: "var(--border)" }}>
          <div className="px-5 py-4 border-b" style={{ borderColor: "var(--border)" }}>
            <h3 className="font-semibold text-sm" style={{ color: "var(--fg)" }}>Por país</h3>
          </div>
          <table className="w-full text-sm">
            <thead>
              <tr style={{ borderBottom: "1px solid var(--border)" }}>
                <th className="text-left px-5 py-2.5 font-medium" style={{ color: "var(--fg-muted)" }}>País</th>
                <th className="text-right px-5 py-2.5 font-medium" style={{ color: "var(--fg-muted)" }}>Visitas</th>
              </tr>
            </thead>
            <tbody>
              {stats.byCountry.map((c) => (
                <tr key={c.country} className="border-b last:border-0" style={{ borderColor: "var(--border)" }}>
                  <td className="px-5 py-2.5" style={{ color: "var(--fg)" }}>{c.country}</td>
                  <td className="px-5 py-2.5 text-right" style={{ color: "var(--fg)" }}>{c.count}</td>
                </tr>
              ))}
              {stats.byCountry.length === 0 && (
                <tr><td colSpan={2} className="px-5 py-8 text-center text-sm" style={{ color: "var(--fg-muted)" }}>Sin datos aún</td></tr>
              )}
            </tbody>
          </table>
        </div>

        {/* Eventos */}
        <div className="rounded-2xl border overflow-hidden" style={{ background: "var(--surface)", borderColor: "var(--border)" }}>
          <div className="px-5 py-4 border-b" style={{ borderColor: "var(--border)" }}>
            <h3 className="font-semibold text-sm" style={{ color: "var(--fg)" }}>Eventos registrados</h3>
          </div>
          <table className="w-full text-sm">
            <thead>
              <tr style={{ borderBottom: "1px solid var(--border)" }}>
                <th className="text-left px-5 py-2.5 font-medium" style={{ color: "var(--fg-muted)" }}>Evento</th>
                <th className="text-right px-5 py-2.5 font-medium" style={{ color: "var(--fg-muted)" }}>Veces</th>
              </tr>
            </thead>
            <tbody>
              {stats.topEvents.map((e) => (
                <tr key={e.event} className="border-b last:border-0" style={{ borderColor: "var(--border)" }}>
                  <td className="px-5 py-2.5 font-mono text-xs" style={{ color: "var(--fg)" }}>{e.event}</td>
                  <td className="px-5 py-2.5 text-right" style={{ color: "var(--fg)" }}>{e.count}</td>
                </tr>
              ))}
              {stats.topEvents.length === 0 && (
                <tr><td colSpan={2} className="px-5 py-8 text-center text-sm" style={{ color: "var(--fg-muted)" }}>Sin eventos aún</td></tr>
              )}
            </tbody>
          </table>
        </div>

        {/* Fuentes */}
        <div className="rounded-2xl border overflow-hidden" style={{ background: "var(--surface)", borderColor: "var(--border)" }}>
          <div className="px-5 py-4 border-b" style={{ borderColor: "var(--border)" }}>
            <h3 className="font-semibold text-sm" style={{ color: "var(--fg)" }}>Fuentes de tráfico</h3>
          </div>
          <table className="w-full text-sm">
            <thead>
              <tr style={{ borderBottom: "1px solid var(--border)" }}>
                <th className="text-left px-5 py-2.5 font-medium" style={{ color: "var(--fg-muted)" }}>Fuente</th>
                <th className="text-right px-5 py-2.5 font-medium" style={{ color: "var(--fg-muted)" }}>Visitas</th>
              </tr>
            </thead>
            <tbody>
              {stats.topSources.map((s) => (
                <tr key={s.source} className="border-b last:border-0" style={{ borderColor: "var(--border)" }}>
                  <td className="px-5 py-2.5" style={{ color: "var(--fg)" }}>{s.source}</td>
                  <td className="px-5 py-2.5 text-right" style={{ color: "var(--fg)" }}>{s.count}</td>
                </tr>
              ))}
              {stats.topSources.length === 0 && (
                <tr><td colSpan={2} className="px-5 py-8 text-center text-sm" style={{ color: "var(--fg-muted)" }}>Sin datos aún</td></tr>
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
