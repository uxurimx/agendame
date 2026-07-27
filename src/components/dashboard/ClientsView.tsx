"use client";

import { useRef, useState, useEffect } from "react";
import { Search, ChevronRight, X, Phone, Mail, Calendar, Star, Loader2, Image, Upload } from "lucide-react";
import { formatTime } from "@/lib/time";
import { ReferenceImageModal } from "@/components/dashboard/ReferenceImageModal";
import { useUploadThing } from "@/lib/uploadthing";

export interface ClientItem {
  id:                string;
  name:              string;
  phone:             string;
  email:             string | null;
  notes:             string | null;
  isPreferred:       boolean;
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
  history?: Array<{
    id: string;
    eventType: string;
    reason: string;
    fromDate: string | null;
    fromStartTime: string | null;
    toDate: string | null;
    toStartTime: string | null;
    createdAt: string | null;
  }>;
}

interface ClientPhotoItem {
  id: string;
  url: string;
  notes: string | null;
  createdAt: string | null;
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

const EVENT_LABELS: Record<string, string> = {
  moved: "Movida",
  cancelled: "Cancelada",
};

function PhotoUploader({ clientId, onSaved }: { clientId: string; onSaved: (p: ClientPhotoItem) => void }) {
  const inputRef = useRef<HTMLInputElement>(null);

  const { startUpload, isUploading } = useUploadThing("clientPhoto", {
    onClientUploadComplete: async (files) => {
      for (const f of files) {
        const res = await fetch("/api/client-photos", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ clientId, url: f.ufsUrl }),
        });
        if (res.ok) onSaved(await res.json());
      }
    },
    onUploadError: (err) => alert(`Error al subir: ${err.message}`),
  });

  return (
    <>
      <input
        ref={inputRef}
        type="file"
        accept="image/jpeg,image/png,image/webp"
        multiple
        style={{ display: "none" }}
        onChange={(e) => {
          const files = Array.from(e.target.files ?? []).slice(0, 4);
          if (files.length) startUpload(files);
          e.target.value = "";
        }}
      />
      <button
        type="button"
        className="cl-upload-btn"
        disabled={isUploading}
        onClick={() => inputRef.current?.click()}
      >
        {isUploading ? <Loader2 size={13} className="spin" /> : <Upload size={13} />}
        {isUploading ? "Subiendo…" : "Subir foto"}
      </button>
    </>
  );
}

function ClientDetail({
  client,
  onClose,
  onSaved,
}: {
  client: ClientItem;
  onClose: () => void;
  onSaved: (client: ClientItem) => void;
}) {
  const [history, setHistory] = useState<AptHistory[]>([]);
  const [photos, setPhotos] = useState<ClientPhotoItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [photosLoading, setPhotosLoading] = useState(true);
  const [selectedPhoto, setSelectedPhoto] = useState<ClientPhotoItem | null>(null);
  const [notes, setNotes] = useState(client.notes ?? "");
  const [isPreferred, setIsPreferred] = useState(client.isPreferred);
  const [savingProfile, setSavingProfile] = useState(false);
  const [profileMessage, setProfileMessage] = useState("");

  useEffect(() => {
    fetch(`/api/appointments?clientId=${client.id}`)
      .then((r) => r.json())
      .then((d) => { setHistory(d); setLoading(false); });

    fetch(`/api/client-photos?clientId=${client.id}`)
      .then((r) => r.json())
      .then((d) => { setPhotos(Array.isArray(d) ? d : []); setPhotosLoading(false); });
  }, [client.id]);

  useEffect(() => {
    setNotes(client.notes ?? "");
    setIsPreferred(client.isPreferred);
    setProfileMessage("");
  }, [client.id, client.notes, client.isPreferred]);

  const trimmedNotes = notes.trim();
  const initialNotes = client.notes ?? "";
  const isDirty = trimmedNotes !== initialNotes || isPreferred !== client.isPreferred;

  async function saveProfile() {
    setSavingProfile(true);
    setProfileMessage("");
    try {
      const res = await fetch(`/api/clients/${client.id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          notes: trimmedNotes,
          isPreferred,
        }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error ?? "No pude guardar el perfil");
      onSaved({
        ...client,
        notes: data.client.notes,
        isPreferred: data.client.isPreferred,
      });
      setProfileMessage("Guardado");
    } catch (error: unknown) {
      setProfileMessage(error instanceof Error ? error.message : "No pude guardar el perfil");
    } finally {
      setSavingProfile(false);
    }
  }

  return (
    <div className="cl-detail-backdrop" onClick={onClose}>
      <div className="cl-detail" onClick={(e) => e.stopPropagation()}>
        {selectedPhoto && (
          <ReferenceImageModal
            imageUrl={selectedPhoto.url}
            title={`Referencia de ${client.name}`}
            onClose={() => setSelectedPhoto(null)}
          />
        )}
        <div className="cl-detail-header">
          <div>
            <h3 className="cl-detail-name">{client.name}</h3>
            <div className="cl-detail-meta">
              <span><Phone size={12} /> {client.phone}</span>
              {client.email && <span><Mail size={12} /> {client.email}</span>}
              {isPreferred && <span><Star size={12} fill="currentColor" /> Preferencial</span>}
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
        <div className="cl-pref-row">
          <button
            type="button"
            onClick={() => setIsPreferred((current) => !current)}
            className={`cl-pref-toggle${isPreferred ? " cl-pref-toggle--active" : ""}`}
          >
            <Star size={14} fill={isPreferred ? "currentColor" : "none"} />
            Cliente especial
          </button>
          <button
            type="button"
            onClick={saveProfile}
            disabled={!isDirty || savingProfile}
            className="cl-save-btn"
          >
            {savingProfile && <Loader2 size={13} className="spin" />}
            Guardar
          </button>
        </div>
        <label className="svc-label" style={{ marginBottom: "1rem" }}>
          Notas
          <textarea
            className="svc-input"
            value={notes}
            onChange={(e) => setNotes(e.target.value)}
            placeholder="Preferencias de atención o información relevante"
            rows={4}
            maxLength={500}
          />
        </label>
        {profileMessage && (
          <p className={`cl-profile-msg${profileMessage === "Guardado" ? " cl-profile-msg--ok" : ""}`}>
            {profileMessage}
          </p>
        )}
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
                {apt.history && apt.history.length > 0 && (
                  <div style={{ marginTop: ".45rem", display: "grid", gap: ".35rem" }}>
                    {apt.history.map((event) => (
                      <div key={event.id} style={{ fontSize: ".76rem", color: "var(--fg-muted)", lineHeight: 1.35 }}>
                        <strong style={{ color: "var(--fg)" }}>{EVENT_LABELS[event.eventType] ?? event.eventType}:</strong> {event.reason}
                        {event.eventType === "moved" && event.fromDate && event.fromStartTime && event.toDate && event.toStartTime && (
                          <span>{` · ${event.fromDate} ${formatTime(event.fromStartTime)} -> ${event.toDate} ${formatTime(event.toStartTime)}`}</span>
                        )}
                      </div>
                    ))}
                  </div>
                )}
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
        <div className="cl-photos-header">
          <h4 className="cl-hist-title" style={{ margin: 0 }}>Referencias visuales</h4>
          <PhotoUploader clientId={client.id} onSaved={(p) => setPhotos((prev) => [p, ...prev])} />
        </div>
        {photosLoading && <div className="bk-slots-loading"><Loader2 size={16} className="spin" /> Cargando…</div>}
        {!photosLoading && photos.length === 0 && <p className="apt-empty">Sin imágenes registradas</p>}
        <div className="cl-photo-grid">
          {photos.map((photo) => (
            <button key={photo.id} type="button" className="cl-photo-card" onClick={() => setSelectedPhoto(photo)}>
              <img src={photo.url} alt={`Referencia de ${client.name}`} className="cl-photo-thumb" />
              <span className="cl-photo-meta">
                <Image size={12} /> {photo.createdAt ? new Date(photo.createdAt).toLocaleDateString("es-MX") : "Sin fecha"}
              </span>
            </button>
          ))}
        </div>
      </div>
    </div>
  );
}

export function ClientsView({
  clients,
  todayClientsCount,
}: {
  clients: ClientItem[];
  todayClientsCount: number;
}) {
  const [search, setSearch] = useState("");
  const [selected, setSelected] = useState<ClientItem | null>(null);
  const [sortMode, setSortMode] = useState<"alphabetical" | "latest">("alphabetical");
  const [items, setItems] = useState<ClientItem[]>(clients);

  useEffect(() => {
    setItems(clients);
  }, [clients]);

  const filtered = items.filter((c) => {
    const q = search.toLowerCase();
    return c.name.toLowerCase().includes(q) || c.phone.includes(q);
  });

  const ordered = [...filtered].sort((a, b) => {
    if (sortMode === "latest") {
      const aTime = a.lastVisit ? new Date(`${a.lastVisit}T12:00:00`).getTime() : 0;
      const bTime = b.lastVisit ? new Date(`${b.lastVisit}T12:00:00`).getTime() : 0;
      if (bTime !== aTime) return bTime - aTime;
    }
    return a.name.localeCompare(b.name, "es-MX", { sensitivity: "base" });
  });

  function handleSavedClient(nextClient: ClientItem) {
    setItems((current) => current.map((item) => item.id === nextClient.id ? nextClient : item));
    setSelected(nextClient);
  }

  return (
    <div>
      {selected && <ClientDetail client={selected} onClose={() => setSelected(null)} onSaved={handleSavedClient} />}

      <div className="cl-summary">
        <div className="cl-kpi">
          <span className="cl-kpi-label">Clientes</span>
          <strong className="cl-kpi-value">{items.length}</strong>
        </div>
        <div className="cl-kpi">
          <span className="cl-kpi-label">Hoy</span>
          <strong className="cl-kpi-value">{todayClientsCount}</strong>
        </div>
      </div>

      <div className="cl-toolbar">
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
        <button
          type="button"
          onClick={() => setSortMode((current) => current === "alphabetical" ? "latest" : "alphabetical")}
          className={`cl-filter-btn${sortMode === "latest" ? " cl-filter-btn--active" : ""}`}
          title={sortMode === "latest" ? "Ordenado por última cita" : "Ordenado de A-Z"}
        >
          <Calendar size={16} />
          <span>{sortMode === "latest" ? "Última cita" : "A-Z"}</span>
        </button>
      </div>

      {ordered.length === 0 ? (
        <div className="apt-empty"><p>Sin resultados</p></div>
      ) : (
        <div className="cl-list">
          {ordered.map((c) => (
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
                <div className="cl-item-topline">
                  <span className="cl-item-count">{c.totalAppointments} citas</span>
                  {c.isPreferred && <Star size={13} className="cl-item-star" fill="currentColor" />}
                </div>
                <ChevronRight size={16} style={{ color: "var(--fg-muted)" }} />
              </div>
            </button>
          ))}
        </div>
      )}
    </div>
  );
}
