"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { Plus, Pencil, ToggleLeft, ToggleRight, X, Loader2, User } from "lucide-react";

export interface ProItem {
  id:              string;
  name:            string;
  phone:           string | null;
  email:           string | null;
  bio:             string | null;
  commissionType:  string;
  commissionValue: string;
  isActive:        boolean;
}

function ProModal({ pro, onClose }: { pro?: ProItem; onClose: () => void }) {
  const [name,      setName]      = useState(pro?.name ?? "");
  const [phone,     setPhone]     = useState(pro?.phone ?? "");
  const [email,     setEmail]     = useState(pro?.email ?? "");
  const [bio,       setBio]       = useState(pro?.bio ?? "");
  const [commType,  setCommType]  = useState<"percentage" | "fixed">(
    (pro?.commissionType as "percentage" | "fixed") ?? "percentage"
  );
  const [commVal,   setCommVal]   = useState(pro ? Number(pro.commissionValue) : 0);
  const [loading,   setLoading]   = useState(false);
  const [error,     setError]     = useState("");
  const router = useRouter();

  async function save() {
    if (!name.trim()) { setError("El nombre es obligatorio"); return; }
    setLoading(true);
    setError("");
    try {
      const res = await fetch(pro ? `/api/professionals/${pro.id}` : "/api/professionals", {
        method:  pro ? "PATCH" : "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          name:            name.trim(),
          phone:           phone.trim() || undefined,
          email:           email.trim() || undefined,
          bio:             bio.trim()   || undefined,
          commissionType:  commType,
          commissionValue: commVal,
        }),
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
          <h3>{pro ? "Editar profesional" : "Agregar al equipo"}</h3>
          <button type="button" onClick={onClose}><X size={18} /></button>
        </div>
        <div className="svc-form">
          <label className="svc-label">
            Nombre <span style={{ color: "var(--l-gold)" }}>*</span>
            <input className="svc-input" value={name} onChange={(e) => setName(e.target.value)} placeholder="Ej: María García" />
          </label>
          <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: ".75rem" }}>
            <label className="svc-label">
              Teléfono
              <input className="svc-input" type="tel" value={phone} onChange={(e) => setPhone(e.target.value)} placeholder="5512345678" />
            </label>
            <label className="svc-label">
              Email
              <input className="svc-input" type="email" value={email} onChange={(e) => setEmail(e.target.value)} placeholder="maria@..." />
            </label>
          </div>
          <label className="svc-label">
            Comisión
            <div style={{ display: "flex", gap: ".5rem", alignItems: "center" }}>
              <select className="svc-input" style={{ flex: 1 }} value={commType} onChange={(e) => setCommType(e.target.value as "percentage" | "fixed")}>
                <option value="percentage">Porcentaje (%)</option>
                <option value="fixed">Fijo (MXN)</option>
              </select>
              <input
                className="svc-input"
                style={{ width: 90 }}
                type="number"
                min={0}
                value={commVal}
                onChange={(e) => setCommVal(Number(e.target.value))}
                placeholder={commType === "percentage" ? "0 – 100" : "MXN"}
              />
            </div>
          </label>
          <label className="svc-label">
            Bio / Especialidad
            <input className="svc-input" value={bio} onChange={(e) => setBio(e.target.value)} placeholder="Ej: Especialista en uñas acrílicas" />
          </label>
          {error && <p style={{ color: "#e53e3e", fontSize: ".8rem" }}>{error}</p>}
        </div>
        <div className="apt-modal-actions">
          <button type="button" onClick={onClose} className="apt-btn-ghost">Cancelar</button>
          <button type="button" onClick={save} disabled={loading} className="apt-btn-confirm">
            {loading && <Loader2 size={14} className="spin" />}
            {pro ? "Guardar cambios" : "Agregar"}
          </button>
        </div>
      </div>
    </div>
  );
}

export function TeamManager({ professionals }: { professionals: ProItem[] }) {
  const [editing,  setEditing]  = useState<ProItem | null | "new">(null);
  const [, startTransition]     = useTransition();
  const router = useRouter();

  async function toggle(pro: ProItem) {
    await fetch(`/api/professionals/${pro.id}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ isActive: !pro.isActive }),
    });
    startTransition(() => router.refresh());
  }

  function commLabel(pro: ProItem) {
    const v = Number(pro.commissionValue);
    if (v === 0) return "Sin comisión";
    return pro.commissionType === "percentage" ? `${v}%` : `$${v} MXN`;
  }

  return (
    <div>
      {editing !== null && (
        <ProModal
          pro={editing === "new" ? undefined : editing}
          onClose={() => setEditing(null)}
        />
      )}

      <div className="svc-header" style={{ marginBottom: ".75rem" }}>
        <div>
          <h3 className="dash-section-title">Mi equipo</h3>
          <p style={{ fontSize: ".78rem", color: "var(--fg-muted)", marginTop: ".15rem" }}>
            Cada profesional activo aparece disponible en la página de reservas.
          </p>
        </div>
        <button type="button" onClick={() => setEditing("new")} className="dash-btn-primary">
          <Plus size={16} /> Agregar
        </button>
      </div>

      {professionals.length === 0 ? (
        <div className="tm-empty">
          <User size={32} opacity={0.3} />
          <p>Sin equipo registrado.</p>
          <p style={{ fontSize: ".8rem", color: "var(--fg-muted)" }}>
            Agrégate tú mismo para empezar a recibir citas.
          </p>
          <button type="button" onClick={() => setEditing("new")} className="dash-btn-primary" style={{ marginTop: ".5rem" }}>
            <Plus size={15} /> Agregarme como profesional
          </button>
        </div>
      ) : (
        <div className="svc-list">
          {professionals.map((pro) => (
            <div key={pro.id} className={`svc-item${!pro.isActive ? " svc-item--inactive" : ""}`}>
              <div style={{ display: "flex", alignItems: "center", gap: ".75rem", flex: 1 }}>
                <div className="bk-pro-avatar" style={{ width: 40, height: 40 }}>
                  {pro.name.charAt(0).toUpperCase()}
                </div>
                <div className="svc-item-info" style={{ flex: 1 }}>
                  <span className="svc-item-name">{pro.name}</span>
                  {pro.bio && <span className="svc-item-desc">{pro.bio}</span>}
                  <div className="svc-item-meta">
                    <span>{commLabel(pro)}</span>
                    {pro.phone && <span>{pro.phone}</span>}
                  </div>
                </div>
              </div>
              <div className="svc-item-actions">
                <button type="button" onClick={() => setEditing(pro)} className="svc-icon-btn" title="Editar">
                  <Pencil size={15} />
                </button>
                <button type="button" onClick={() => toggle(pro)} className="svc-icon-btn" title={pro.isActive ? "Desactivar" : "Activar"}>
                  {pro.isActive
                    ? <ToggleRight size={20} style={{ color: "var(--l-berry)" }} />
                    : <ToggleLeft size={20} style={{ color: "var(--fg-muted)" }} />}
                </button>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
