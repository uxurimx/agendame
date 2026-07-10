"use client";

import { useState, useEffect, useCallback } from "react";
import { LifeBuoy, Plus, ChevronDown, ChevronUp, Send, RefreshCw, X, Trash2 } from "lucide-react";

type TicketType     = "bug" | "mejora" | "soporte" | "sugerencia" | "otro";
type TicketPriority = "baja" | "media" | "alta" | "urgente";
type TicketStatus   = "abierto" | "en_proceso" | "resuelto" | "cerrado";

interface Ticket {
  id:           string;
  businessName: string;
  userEmail:    string;
  title:        string;
  description:  string;
  type:         TicketType;
  priority:     TicketPriority;
  status:       TicketStatus;
  response:     string | null;
  respondedAt:  string | null;
  createdAt:    string;
}

const TYPE_CONFIG: Record<TicketType, { label: string; color: string }> = {
  bug:        { label: "Bug",        color: "#dc2626" },
  mejora:     { label: "Mejora",     color: "#2563eb" },
  soporte:    { label: "Soporte",    color: "#6E2A96" },
  sugerencia: { label: "Sugerencia", color: "#059669" },
  otro:       { label: "Otro",       color: "#64748b" },
};
const PRIORITY_CONFIG: Record<TicketPriority, { label: string; color: string }> = {
  baja:    { label: "Baja",    color: "#64748b" },
  media:   { label: "Media",   color: "#E8631F" },
  alta:    { label: "Alta",    color: "#dc2626" },
  urgente: { label: "URGENTE", color: "#7f1d1d" },
};
const STATUS_CONFIG: Record<TicketStatus, { label: string; color: string; bg: string }> = {
  abierto:    { label: "Abierto",     color: "#E8631F", bg: "#fff7ed" },
  en_proceso: { label: "En proceso",  color: "#2563eb", bg: "#eff6ff" },
  resuelto:   { label: "Resuelto",    color: "#059669", bg: "#f0fdf4" },
  cerrado:    { label: "Cerrado",     color: "#64748b", bg: "#f8fafc" },
};

function TypeBadge({ type }: { type: TicketType }) {
  const c = TYPE_CONFIG[type];
  return (
    <span style={{ background: c.color + "18", color: c.color, border: `1px solid ${c.color}33` }}
      className="inline-block px-2 py-0.5 rounded-full text-xs font-semibold">
      {c.label}
    </span>
  );
}
function PriorityBadge({ priority }: { priority: TicketPriority }) {
  const c = PRIORITY_CONFIG[priority];
  return (
    <span style={{ background: c.color + "18", color: c.color, border: `1px solid ${c.color}33` }}
      className="inline-block px-2 py-0.5 rounded-full text-xs font-semibold">
      {c.label}
    </span>
  );
}
function StatusBadge({ status }: { status: TicketStatus }) {
  const c = STATUS_CONFIG[status];
  return (
    <span style={{ background: c.bg, color: c.color, border: `1px solid ${c.color}33` }}
      className="inline-block px-2 py-0.5 rounded-full text-xs font-semibold">
      {c.label}
    </span>
  );
}

function NewTicketForm({ onCreated }: { onCreated: () => void }) {
  const [open, setOpen]         = useState(false);
  const [saving, setSaving]     = useState(false);
  const [form, setForm]         = useState({
    title:       "",
    description: "",
    type:        "soporte" as TicketType,
    priority:    "media"   as TicketPriority,
  });

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    setSaving(true);
    try {
      const res  = await fetch("/api/tickets", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify(form) });
      const data = await res.json();
      if (!res.ok) throw new Error(data?.error ?? `Error ${res.status}`);
      setForm({ title: "", description: "", type: "soporte", priority: "media" });
      setOpen(false);
      onCreated();
    } catch (err) {
      alert(`Error al enviar ticket: ${err instanceof Error ? err.message : "desconocido"}`);
    } finally {
      setSaving(false);
    }
  }

  if (!open) {
    return (
      <button onClick={() => setOpen(true)}
        className="flex items-center gap-2 px-4 py-2 rounded-xl text-sm font-semibold text-white"
        style={{ background: "var(--l-berry,#6E2A96)" }}>
        <Plus size={16} /> Nuevo ticket
      </button>
    );
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 backdrop-blur-sm p-4">
      <form onSubmit={submit}
        className="w-full max-w-lg rounded-2xl shadow-xl p-6 flex flex-col gap-4"
        style={{ background: "var(--surface,#fff)" }}>
        <div className="flex items-center justify-between">
          <h3 className="font-bold text-lg" style={{ color: "var(--fg,#0f172a)" }}>Nuevo ticket</h3>
          <button type="button" onClick={() => setOpen(false)} className="p-1 rounded-lg hover:bg-black/5"><X size={18} /></button>
        </div>

        <input required placeholder="Título corto del problema o solicitud"
          value={form.title} onChange={e => setForm(f => ({ ...f, title: e.target.value }))}
          className="w-full rounded-xl border px-3 py-2 text-sm outline-none focus:ring-2"
          style={{ borderColor: "var(--border,#e2e8f0)", background: "var(--surface-2,#f8fafc)", color: "var(--fg,#0f172a)" }} />

        <div className="flex gap-3">
          <label className="flex-1 flex flex-col gap-1">
            <span className="text-xs font-medium" style={{ color: "var(--fg-muted,#64748b)" }}>Tipo</span>
            <select value={form.type} onChange={e => setForm(f => ({ ...f, type: e.target.value as TicketType }))}
              className="rounded-xl border px-3 py-2 text-sm outline-none"
              style={{ borderColor: "var(--border,#e2e8f0)", background: "var(--surface-2,#f8fafc)", color: "var(--fg,#0f172a)" }}>
              <option value="soporte">🛟 Soporte</option>
              <option value="bug">🐛 Bug</option>
              <option value="mejora">✨ Mejora</option>
              <option value="sugerencia">💡 Sugerencia</option>
              <option value="otro">💬 Otro</option>
            </select>
          </label>
          <label className="flex-1 flex flex-col gap-1">
            <span className="text-xs font-medium" style={{ color: "var(--fg-muted,#64748b)" }}>Prioridad</span>
            <select value={form.priority} onChange={e => setForm(f => ({ ...f, priority: e.target.value as TicketPriority }))}
              className="rounded-xl border px-3 py-2 text-sm outline-none"
              style={{ borderColor: "var(--border,#e2e8f0)", background: "var(--surface-2,#f8fafc)", color: "var(--fg,#0f172a)" }}>
              <option value="baja">Baja</option>
              <option value="media">Media</option>
              <option value="alta">Alta</option>
              <option value="urgente">🔴 Urgente</option>
            </select>
          </label>
        </div>

        <textarea required rows={5} placeholder="Describe el problema o solicitud con detalle..."
          value={form.description} onChange={e => setForm(f => ({ ...f, description: e.target.value }))}
          className="w-full rounded-xl border px-3 py-2 text-sm outline-none resize-none"
          style={{ borderColor: "var(--border,#e2e8f0)", background: "var(--surface-2,#f8fafc)", color: "var(--fg,#0f172a)" }} />

        <div className="flex gap-3 justify-end">
          <button type="button" onClick={() => setOpen(false)}
            className="px-4 py-2 rounded-xl border text-sm font-medium"
            style={{ borderColor: "var(--border,#e2e8f0)", color: "var(--fg-muted,#64748b)" }}>
            Cancelar
          </button>
          <button type="submit" disabled={saving}
            className="flex items-center gap-2 px-4 py-2 rounded-xl text-sm font-semibold text-white disabled:opacity-50"
            style={{ background: "var(--l-berry,#6E2A96)" }}>
            <Send size={14} /> {saving ? "Enviando..." : "Enviar ticket"}
          </button>
        </div>
      </form>
    </div>
  );
}

function AdminResponsePanel({ ticket, onUpdated }: { ticket: Ticket; onUpdated: () => void }) {
  const [status,   setStatus]   = useState<TicketStatus>(ticket.status);
  const [response, setResponse] = useState(ticket.response ?? "");
  const [saving,   setSaving]   = useState(false);

  async function save() {
    setSaving(true);
    try {
      await fetch(`/api/tickets/${ticket.id}`, {
        method:  "PATCH",
        headers: { "Content-Type": "application/json" },
        body:    JSON.stringify({ status, response: response.trim() || undefined }),
      });
      onUpdated();
    } catch {
      alert("Error al actualizar.");
    } finally {
      setSaving(false);
    }
  }

  return (
    <div className="mt-3 pt-3 flex flex-col gap-3" style={{ borderTop: "1px solid var(--border,#e2e8f0)" }}>
      <div className="flex gap-3 items-center">
        <label className="text-xs font-medium shrink-0" style={{ color: "var(--fg-muted,#64748b)" }}>Estado:</label>
        <select value={status} onChange={e => setStatus(e.target.value as TicketStatus)}
          className="rounded-lg border px-2 py-1 text-xs outline-none"
          style={{ borderColor: "var(--border,#e2e8f0)", background: "var(--surface-2,#f8fafc)", color: "var(--fg,#0f172a)" }}>
          <option value="abierto">Abierto</option>
          <option value="en_proceso">En proceso</option>
          <option value="resuelto">Resuelto</option>
          <option value="cerrado">Cerrado</option>
        </select>
      </div>
      <textarea rows={3} placeholder="Respuesta para el cliente (se enviará por email)..."
        value={response} onChange={e => setResponse(e.target.value)}
        className="w-full rounded-xl border px-3 py-2 text-sm outline-none resize-none"
        style={{ borderColor: "var(--border,#e2e8f0)", background: "var(--surface-2,#f8fafc)", color: "var(--fg,#0f172a)" }} />
      <button onClick={save} disabled={saving}
        className="self-end flex items-center gap-2 px-3 py-1.5 rounded-xl text-xs font-semibold text-white disabled:opacity-50"
        style={{ background: "var(--l-berry,#6E2A96)" }}>
        <Send size={12} /> {saving ? "Guardando..." : "Guardar respuesta"}
      </button>
    </div>
  );
}

function TicketCard({ ticket, isAdmin, onUpdated, onDeleted }: { ticket: Ticket; isAdmin: boolean; onUpdated: () => void; onDeleted: () => void }) {
  const [expanded, setExpanded] = useState(false);
  const [deleting, setDeleting] = useState(false);

  async function handleDelete() {
    if (!confirm(`¿Eliminar ticket "${ticket.title}"?`)) return;
    setDeleting(true);
    await fetch(`/api/tickets/${ticket.id}`, { method: "DELETE" });
    onDeleted();
  }

  return (
    <div className="rounded-2xl border p-4 flex flex-col gap-2" style={{ background: "var(--surface,#fff)", borderColor: "var(--border,#e2e8f0)" }}>
      <div className="flex items-start gap-3">
        <div className="flex-1 min-w-0">
          <div className="flex flex-wrap items-center gap-2 mb-1">
            <TypeBadge type={ticket.type} />
            <PriorityBadge priority={ticket.priority} />
            <StatusBadge status={ticket.status} />
            {isAdmin && (
              <span className="text-xs ml-auto" style={{ color: "var(--fg-muted,#64748b)" }}>
                {ticket.businessName}
              </span>
            )}
          </div>
          <p className="font-semibold text-sm" style={{ color: "var(--fg,#0f172a)" }}>{ticket.title}</p>
          <p className="text-xs mt-0.5" style={{ color: "var(--fg-muted,#64748b)" }}>
            {new Date(ticket.createdAt).toLocaleDateString("es-MX", { day: "numeric", month: "short", year: "numeric" })}
          </p>
        </div>
        <div className="flex items-center gap-1 shrink-0">
          {isAdmin && (
            <button onClick={handleDelete} disabled={deleting}
              className="p-1 rounded-lg hover:bg-red-50 disabled:opacity-40 transition-colors"
              title="Eliminar ticket">
              <Trash2 size={14} style={{ color: "#dc2626" }} />
            </button>
          )}
          <button onClick={() => setExpanded(e => !e)} className="p-1 rounded-lg hover:bg-black/5">
            {expanded ? <ChevronUp size={16} /> : <ChevronDown size={16} />}
          </button>
        </div>
      </div>

      {expanded && (
        <div className="flex flex-col gap-3">
          <p className="text-sm whitespace-pre-wrap" style={{ color: "var(--fg,#0f172a)" }}>{ticket.description}</p>

          {ticket.response && (
            <div className="rounded-xl p-3" style={{ background: "#f0fdf4", borderLeft: "4px solid #059669" }}>
              <p className="text-xs font-semibold mb-1" style={{ color: "#059669" }}>Respuesta del equipo:</p>
              <p className="text-sm whitespace-pre-wrap" style={{ color: "#1a1420" }}>{ticket.response}</p>
            </div>
          )}

          {isAdmin && <AdminResponsePanel ticket={ticket} onUpdated={onUpdated} />}
        </div>
      )}
    </div>
  );
}

export function TicketsView({ isAdmin }: { isAdmin: boolean }) {
  const [tickets,  setTickets]  = useState<Ticket[]>([]);
  const [loading,  setLoading]  = useState(true);
  const [filter,   setFilter]   = useState<TicketStatus | "todos">("todos");

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const res  = await fetch("/api/tickets");
      const data = await res.json();
      setTickets(Array.isArray(data) ? data : []);
    } catch {
      setTickets([]);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { load(); }, [load]);

  const filtered = filter === "todos" ? tickets : tickets.filter(t => t.status === filter);

  return (
    <div className="flex flex-col gap-6">
      {/* Header */}
      <div className="flex items-center justify-between flex-wrap gap-3">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-2xl flex items-center justify-center"
            style={{ background: "linear-gradient(135deg,#6E2A96,#E8631F)" }}>
            <LifeBuoy size={20} className="text-white" />
          </div>
          <div>
            <h2 className="font-bold text-xl" style={{ color: "var(--fg,#0f172a)" }}>
              {isAdmin ? "Panel de Soporte" : "Soporte Poxelbit"}
            </h2>
            <p className="text-xs" style={{ color: "var(--fg-muted,#64748b)" }}>
              {isAdmin ? "Todos los tickets de la plataforma" : "Reporta problemas, mejoras o sugerencias"}
            </p>
          </div>
        </div>
        <div className="flex items-center gap-2">
          <button onClick={load} className="p-2 rounded-xl border hover:bg-black/5"
            style={{ borderColor: "var(--border,#e2e8f0)" }}>
            <RefreshCw size={16} style={{ color: "var(--fg-muted,#64748b)" }} />
          </button>
          <NewTicketForm onCreated={load} />
        </div>
      </div>

      {/* Filtros */}
      <div className="flex gap-2 flex-wrap">
        {(["todos", "abierto", "en_proceso", "resuelto", "cerrado"] as const).map(s => (
          <button key={s} onClick={() => setFilter(s)}
            className="px-3 py-1.5 rounded-xl text-xs font-semibold border transition-all"
            style={{
              background:   filter === s ? "var(--l-berry,#6E2A96)" : "var(--surface,#fff)",
              color:        filter === s ? "#fff"                    : "var(--fg-muted,#64748b)",
              borderColor:  filter === s ? "var(--l-berry,#6E2A96)" : "var(--border,#e2e8f0)",
            }}>
            {s === "todos" ? "Todos" : STATUS_CONFIG[s as TicketStatus].label}
            {s !== "todos" && (
              <span className="ml-1 opacity-70">
                ({tickets.filter(t => t.status === s).length})
              </span>
            )}
          </button>
        ))}
      </div>

      {/* Tickets */}
      {loading ? (
        <div className="flex items-center justify-center py-16 text-sm" style={{ color: "var(--fg-muted,#64748b)" }}>
          Cargando tickets...
        </div>
      ) : filtered.length === 0 ? (
        <div className="flex flex-col items-center justify-center py-16 gap-3">
          <LifeBuoy size={40} style={{ color: "var(--fg-muted,#64748b)", opacity: 0.3 }} />
          <p className="text-sm" style={{ color: "var(--fg-muted,#64748b)" }}>
            {filter === "todos" ? "No hay tickets aún" : `No hay tickets ${STATUS_CONFIG[filter as TicketStatus]?.label.toLowerCase()}`}
          </p>
        </div>
      ) : (
        <div className="flex flex-col gap-3">
          {filtered.map(t => (
            <TicketCard key={t.id} ticket={t} isAdmin={isAdmin} onUpdated={load} onDeleted={load} />
          ))}
        </div>
      )}
    </div>
  );
}
