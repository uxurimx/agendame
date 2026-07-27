"use client";

import { useEffect, useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { Plus, Pencil, ToggleLeft, ToggleRight, X, Loader2, Clock, DollarSign, GripVertical } from "lucide-react";

export interface ServiceItem {
  id:          string;
  name:        string;
  description: string | null;
  price:       string;
  durationMin: number;
  category:    string | null;
  isActive:    boolean;
}

const DURATIONS = [15,30,45,60,75,90,120,150,180,240];

function ServiceModal({
  svc,
  onClose,
}: {
  svc?: ServiceItem;
  onClose: () => void;
}) {
  const [name,        setName]        = useState(svc?.name        ?? "");
  const [description, setDescription] = useState(svc?.description ?? "");
  const [price,       setPrice]       = useState(svc?.price ?? "");
  const [duration,    setDuration]    = useState(svc?.durationMin ?? 60);
  const [category,    setCategory]    = useState(svc?.category    ?? "");
  const [loading,     setLoading]     = useState(false);
  const [error,       setError]       = useState("");
  const router = useRouter();

  async function save() {
    if (!name.trim()) { setError("El nombre es obligatorio"); return; }
    const parsedPrice = Number.parseFloat(price.replace(",", "."));
    if (!Number.isFinite(parsedPrice) || parsedPrice < 0) {
      setError("El precio debe ser un número válido");
      return;
    }
    setLoading(true);
    setError("");
    try {
      const res = await fetch(svc ? `/api/services/${svc.id}` : "/api/services", {
        method:  svc ? "PATCH" : "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ name: name.trim(), description: description.trim() || undefined, price: parsedPrice, durationMin: duration, category: category.trim() || undefined }),
      });
      if (!res.ok) { const d = await res.json(); throw new Error(d.error); }
      router.refresh();
      onClose();
    } catch (e: unknown) {
      setError(e instanceof Error ? e.message : "Error al guardar");
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="apt-modal-backdrop" onClick={onClose}>
      <div className="svc-modal" onClick={(e) => e.stopPropagation()}>
        <div className="svc-modal-header">
          <h3>{svc ? "Editar servicio" : "Nuevo servicio"}</h3>
          <button type="button" onClick={onClose}><X size={18} /></button>
        </div>
        <div className="svc-form">
          <label className="svc-label">
            Nombre <span style={{ color: "var(--l-gold)" }}>*</span>
            <input className="svc-input" value={name} onChange={(e) => setName(e.target.value)} placeholder="Ej: Manicura permanente" />
          </label>
          <label className="svc-label">
            Descripción
            <input className="svc-input" value={description} onChange={(e) => setDescription(e.target.value)} placeholder="Opcional" />
          </label>
          <div className="svc-price-row">
            <label className="svc-label svc-label--price">
              Precio (MXN) <span style={{ color: "var(--l-gold)" }}>*</span>
              <input
                className="svc-input"
                type="text"
                inputMode="decimal"
                value={price}
                onChange={(e) => setPrice(e.target.value.replace(/[^\d.,]/g, ""))}
                placeholder="700"
              />
            </label>
            <label className="svc-label">
              Duración
              <select className="svc-input" value={duration} onChange={(e) => setDuration(Number(e.target.value))}>
                {DURATIONS.map((d) => (
                  <option key={d} value={d}>{d < 60 ? `${d} min` : `${d / 60}h${d % 60 ? ` ${d % 60}m` : ""}`}</option>
                ))}
              </select>
            </label>
          </div>
          <label className="svc-label">
            Categoría
            <input className="svc-input" value={category} onChange={(e) => setCategory(e.target.value)} placeholder="Ej: Uñas, Cejas, Cabello…" />
          </label>
          {error && <p style={{ color: "#e53e3e", fontSize: ".8rem" }}>{error}</p>}
        </div>
        <div className="apt-modal-actions">
          <button type="button" onClick={onClose} className="apt-btn-ghost">Cancelar</button>
          <button type="button" onClick={save} disabled={loading} className="apt-btn-confirm">
            {loading && <Loader2 size={14} className="spin" />}
            {svc ? "Guardar cambios" : "Crear servicio"}
          </button>
        </div>
      </div>
    </div>
  );
}

export function ServicesManager({ services }: { services: ServiceItem[] }) {
  const [editing, setEditing] = useState<ServiceItem | null | "new">(null);
  const [items, setItems] = useState<ServiceItem[]>(services);
  const [draggingId, setDraggingId] = useState<string | null>(null);
  const [savingOrder, setSavingOrder] = useState(false);
  const [, startTransition] = useTransition();
  const router = useRouter();

  useEffect(() => {
    setItems(services);
  }, [services]);

  async function toggleActive(svc: ServiceItem) {
    await fetch(`/api/services/${svc.id}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ isActive: !svc.isActive }),
    });
    startTransition(() => router.refresh());
  }

  async function persistOrder(nextItems: ServiceItem[]) {
    setSavingOrder(true);
    try {
      const res = await fetch("/api/services/reorder", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ orderedIds: nextItems.map((item) => item.id) }),
      });
      if (!res.ok) {
        const data = await res.json();
        throw new Error(data.error ?? "No pude reordenar servicios");
      }
      startTransition(() => router.refresh());
    } catch (error) {
      console.error("[services reorder]", error);
      setItems(services);
    } finally {
      setSavingOrder(false);
      setDraggingId(null);
    }
  }

  function moveItem(sourceId: string, targetId: string) {
    if (sourceId === targetId) return null;
    const sourceIndex = items.findIndex((item) => item.id === sourceId);
    const targetIndex = items.findIndex((item) => item.id === targetId);
    if (sourceIndex === -1 || targetIndex === -1) return null;
    const next = [...items];
    const [moved] = next.splice(sourceIndex, 1);
    next.splice(targetIndex, 0, moved);
    setItems(next);
    return next;
  }

  function handleDrop(targetId: string) {
    if (!draggingId) return;
    const next = moveItem(draggingId, targetId);
    if (next) void persistOrder(next);
    else setDraggingId(null);
  }

  function fmtDuration(min: number) {
    return min < 60 ? `${min} min` : `${Math.floor(min / 60)}h${min % 60 ? ` ${min % 60}m` : ""}`;
  }

  return (
    <div>
      {editing !== null && (
        <ServiceModal
          svc={editing === "new" ? undefined : editing}
          onClose={() => setEditing(null)}
        />
      )}

      <div className="svc-header">
        <h2 className="dash-section-title">Servicios</h2>
        <button type="button" onClick={() => setEditing("new")} className="dash-btn-primary">
          <Plus size={16} /> Nuevo servicio
        </button>
      </div>

      {items.length === 0 ? (
        <div className="apt-empty">
          <p>Sin servicios. Crea el primero.</p>
        </div>
      ) : (
        <div className="svc-list">
          {items.map((svc) => (
            <div
              key={svc.id}
              draggable={!savingOrder}
              onDragStart={() => setDraggingId(svc.id)}
              onDragOver={(event) => event.preventDefault()}
              onDrop={() => handleDrop(svc.id)}
              onDragEnd={() => setDraggingId(null)}
              className={`svc-item${!svc.isActive ? " svc-item--inactive" : ""}${draggingId === svc.id ? " svc-item--dragging" : ""}`}
            >
              <button type="button" className="svc-drag-handle" title="Arrastrar para reordenar" aria-label="Arrastrar para reordenar">
                <GripVertical size={16} />
              </button>
              <div className="svc-item-info">
                <span className="svc-item-name">{svc.name}</span>
                {svc.category && <span className="svc-item-cat">{svc.category}</span>}
                {svc.description && <span className="svc-item-desc">{svc.description}</span>}
                <div className="svc-item-meta">
                  <span><DollarSign size={12} /> {Number(svc.price).toLocaleString("es-MX")}</span>
                  <span><Clock size={12} /> {fmtDuration(svc.durationMin)}</span>
                </div>
              </div>
              <div className="svc-item-actions">
                <button type="button" onClick={() => setEditing(svc)} className="svc-icon-btn" title="Editar">
                  <Pencil size={15} />
                </button>
                <button type="button" onClick={() => toggleActive(svc)} className="svc-icon-btn" title={svc.isActive ? "Desactivar" : "Activar"}>
                  {svc.isActive ? <ToggleRight size={20} style={{ color: "var(--l-berry)" }} /> : <ToggleLeft size={20} style={{ color: "var(--fg-muted)" }} />}
                </button>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
