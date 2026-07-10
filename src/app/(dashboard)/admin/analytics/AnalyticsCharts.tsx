"use client";

import {
  LineChart, Line, XAxis, YAxis, Tooltip, ResponsiveContainer,
  BarChart, Bar, PieChart, Pie, Cell, Legend,
} from "recharts";

const COLORS = ["#6E2A96", "#E8631F", "#3E7C74", "#6366f1", "#f59e0b", "#10b981"];

type DailyView = { day: string; views: number; sessions: number };
type Source    = { source: string; count: number };
type Device    = { device: string; count: number };

export default function AnalyticsCharts({
  dailyViews,
  topSources,
  byDevice,
}: {
  dailyViews: DailyView[];
  topSources: Source[];
  byDevice:   Device[];
}) {
  return (
    <div className="grid grid-cols-1 md:grid-cols-3 gap-6">

      {/* Línea de tiempo */}
      <div
        className="md:col-span-2 rounded-2xl border p-5"
        style={{ background: "var(--surface)", borderColor: "var(--border)" }}
      >
        <p className="text-sm font-semibold mb-4" style={{ color: "var(--fg)" }}>
          Visitas por día
        </p>
        {dailyViews.length > 0 ? (
          <ResponsiveContainer width="100%" height={200}>
            <LineChart data={dailyViews}>
              <XAxis
                dataKey="day"
                tick={{ fontSize: 11, fill: "var(--fg-muted)" }}
                tickFormatter={(v: string) => v.slice(5)}
                axisLine={false}
                tickLine={false}
              />
              <YAxis tick={{ fontSize: 11, fill: "var(--fg-muted)" }} axisLine={false} tickLine={false} />
              <Tooltip
                contentStyle={{ background: "var(--surface-2)", border: "1px solid var(--border)", borderRadius: 8, fontSize: 12 }}
                labelStyle={{ color: "var(--fg)" }}
              />
              <Line type="monotone" dataKey="views"    stroke="#6E2A96" strokeWidth={2} dot={false} name="Views" />
              <Line type="monotone" dataKey="sessions" stroke="#E8631F" strokeWidth={2} dot={false} name="Sesiones" strokeDasharray="4 2" />
            </LineChart>
          </ResponsiveContainer>
        ) : (
          <div className="h-[200px] flex items-center justify-center text-sm" style={{ color: "var(--fg-muted)" }}>
            Sin datos aún
          </div>
        )}
      </div>

      {/* Dispositivos */}
      <div
        className="rounded-2xl border p-5"
        style={{ background: "var(--surface)", borderColor: "var(--border)" }}
      >
        <p className="text-sm font-semibold mb-4" style={{ color: "var(--fg)" }}>
          Dispositivos
        </p>
        {byDevice.length > 0 ? (
          <ResponsiveContainer width="100%" height={200}>
            <PieChart>
              <Pie data={byDevice} dataKey="count" nameKey="device" cx="50%" cy="50%" outerRadius={70} label={({ name, percent }) => `${name} ${((percent ?? 0) * 100).toFixed(0)}%`} labelLine={false}>
                {byDevice.map((_, i) => (
                  <Cell key={i} fill={COLORS[i % COLORS.length]} />
                ))}
              </Pie>
              <Tooltip contentStyle={{ background: "var(--surface-2)", border: "1px solid var(--border)", borderRadius: 8, fontSize: 12 }} />
            </PieChart>
          </ResponsiveContainer>
        ) : (
          <div className="h-[200px] flex items-center justify-center text-sm" style={{ color: "var(--fg-muted)" }}>
            Sin datos aún
          </div>
        )}
      </div>

      {/* Fuentes de tráfico */}
      <div
        className="md:col-span-3 rounded-2xl border p-5"
        style={{ background: "var(--surface)", borderColor: "var(--border)" }}
      >
        <p className="text-sm font-semibold mb-4" style={{ color: "var(--fg)" }}>
          Fuentes de tráfico
        </p>
        {topSources.length > 0 ? (
          <ResponsiveContainer width="100%" height={160}>
            <BarChart data={topSources} layout="vertical" margin={{ left: 16 }}>
              <XAxis type="number" tick={{ fontSize: 11, fill: "var(--fg-muted)" }} axisLine={false} tickLine={false} />
              <YAxis type="category" dataKey="source" tick={{ fontSize: 12, fill: "var(--fg)" }} axisLine={false} tickLine={false} width={80} />
              <Tooltip contentStyle={{ background: "var(--surface-2)", border: "1px solid var(--border)", borderRadius: 8, fontSize: 12 }} />
              <Bar dataKey="count" name="Visitas" radius={[0, 6, 6, 0]}>
                {topSources.map((_, i) => (
                  <Cell key={i} fill={COLORS[i % COLORS.length]} />
                ))}
              </Bar>
            </BarChart>
          </ResponsiveContainer>
        ) : (
          <div className="h-[160px] flex items-center justify-center text-sm" style={{ color: "var(--fg-muted)" }}>
            Sin datos aún
          </div>
        )}
      </div>
    </div>
  );
}
