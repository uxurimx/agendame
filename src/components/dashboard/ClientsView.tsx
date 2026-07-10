"use client";

import { useState, useEffect } from "react";
import { Search, ChevronRight, X, Phone, Mail, Calendar, Star, Loader2 } from "lucide-react";
import { formatTime } from "@/lib/time";

export interface ClientItem {
  id:                string;
  name:              string;
  phone:             string;
  email:             string | null;
  loyaltyPoints:     number;
  createdAt:         string | null;
  totalAppointments: number;
  lastVisit:         string | null;
}

interface AptHistory {
  id:           string;
  date:         string;
  startTime:    string;
  status:       string;
  pricePaid:    string | null;
  service:      { name: string } | null;
  professional: { name: string } | null;
}

const STATUS_LABELS: Record<string, string> = {
  pending:   "Pendiente",
  confirmed: "Confirmada",
  completed: "Completada",
  cancelled: "Cancelada",
  no_show:   "No asistió",
};
const STATUS_COLORS: Record<string, string> = {
  pending:   "#e8631f",
  confirmed: "#6E2A96",
  completed: "#3E7C74",
  cancelled: "#9ca3af",
  no_show:   "#9ca3af",
};

function ClientDetail({ client, onClose }: { client: ClientItem; onClose: () => void }) {
  const [history, setHistory] = useState<AptHistory[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetch(`/api/appointments?clientId=${client.id}`)
      .then((r) => r.json())
      .then((d) => { setHistory(d); setLoading(false); });
  }, [client.id]);

  return (
    <div className="cl-detail-backdrop" onClick={onClose}>
      <div className="cl-detail" onClick={(e) => e.stopPropagation()}>
        <div className="cl-detail-header">
          <div>
            <h3 className="cl-detail-name">{client.name}</h3>
            <div className="cl-detail-meta">
              <span><Phone size={12} /> {client.phone}</span>
              {client.email && <span><Mail size={12} /> {client.email}</span>}
            </div>
          </div>
          <button type="button" onClick={onClose} className="svc-icon-btn"><X size={18} /></button>
        </div>
        <div className="cl-detail-stats">
          <div className="cl-stat">
            <span className="cl-stat-val">{client.totalAppointments}</span>
            <span className="cl-stat-label">Citas</span>
          </div>
          <div className="cl-stat">
            <span className="cl-stat-val">{client.loyaltyPoints}</span>
            <span className="cl-stat-label">Puntos</span>
          </div>
          <div className="cl-stat">
            <span className="cl-stat-val">{client.lastVisit ?? "—"}</span>
            <span className="cl-stat-label">Última visita</span>
          </div>
        </div>
        <h4 className="cl-hist-title">Historial de citas</h4>
        {loading && <div className="bk-slots-loading"><Loader2 size={16} className="spin" /> Cargando…</div>}
        {!loading && history.length === 0 && <p className="apt-empty">Sin citas registradas</p>}
        <div className="cl-hist-list">
          {history.map((apt) => (
            <div key={apt.id} className="cl-hist-item">
              <div>
                <span className="cl-hist-svc">{apt.service?.name ?? "—"}</span>
                <span className="cl-hist-date">
                  <Calendar size={11} /> {apt.date} · {formatTime(apt.startTime)}
                </span>
                {apt.professional && <span className="cl-hist-pro">Con {apt.professional.name}</span>}
              </div>
              <div style={{ textAlign: "right", flexShrink: 0 }}>
                <span
                  className="apt-badge"
                  style={{ background: STATUS_COLORS[apt.status] + "20", color: STATUS_COLORS[apt.status] }}
                >
                  {STATUS_LABELS[apt.status] ?? apt.status}
                </span>
                {apt.pricePaid && (
                  <p style={{ fontSize: ".75rem", fontWeight: 700, marginTop: ".2rem" }}>
                    ${Number(apt.pricePaid).toLocaleString("es-MX")}
                  </p>
                )}
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}

export function ClientsView({ clients }: { clients: ClientItem[] }) {
  const [search,   setSearch]   = useState("");
  const [selected, setSelected] = useState<ClientItem | null>(null);

  const filtered = clients.filter((c) => {
    const q = search.toLowerCase();
    return c.name.toLowerCase().includes(q) || c.phone.includes(q);
  });

  return (
    <div>
      {selected && <ClientDetail client={selected} onClose={() => setSelected(null)} />}

      <div className="svc-header">
        <h2 className="dash-section-title">Clientes ({clients.length})</h2>
      </div>

      <div className="cl-search-wrap">
        <Search size={16} className="cl-search-icon" />
        <input
          type="text"
          placeholder="Buscar por nombre o teléfono…"
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          className="cl-search"
        />
        {search && (
          <button type="button" onClick={() => setSearch("")} className="cl-search-clear">
            <X size={14} />
          </button>
        )}
      </div>

      {filtered.length === 0 ? (
        <div className="apt-empty"><p>Sin resultados</p></div>
      ) : (
        <div className="cl-list">
          {filtered.map((c) => (
            <button
              key={c.id}
              type="button"
              onClick={() => setSelected(c)}
              className="cl-item"
            >
              <div className="cl-avatar">{c.name.charAt(0).toUpperCase()}</div>
              <div className="cl-item-info">
                <span className="cl-item-name">{c.name}</span>
                <span className="cl-item-meta">
                  <Phone size={11} /> {c.phone}
                  {c.lastVisit && <> · Última: {c.lastVisit}</>}
                </span>
              </div>
              <div className="cl-item-right">
                <span className="cl-item-count">{c.totalAppointments} citas</span>
                {c.loyaltyPoints > 0 && (
                  <span className="cl-pts"><Star size={11} /> {c.loyaltyPoints}</span>
                )}
                <ChevronRight size={16} style={{ color: "var(--fg-muted)" }} />
              </div>
            </button>
          ))}
        </div>
      )}
    </div>
  );
}
