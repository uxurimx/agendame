"use client";

import { useState } from "react";
import { UserButton } from "@clerk/nextjs";
import { AlertTriangle, Loader2 } from "lucide-react";

export default function AccountSettingsCard({
  fullName,
  email,
  blocked,
  deletionScheduledFor,
}: {
  fullName: string;
  email: string;
  blocked: boolean;
  deletionScheduledFor: string | null;
}) {
  const [confirmOpen, setConfirmOpen] = useState(false);
  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState("");
  const [scheduledFor, setScheduledFor] = useState(deletionScheduledFor);

  async function requestDeletion() {
    setLoading(true);
    setMessage("");
    try {
      const res = await fetch("/api/account/delete-request", { method: "POST" });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error ?? "No pude programar la eliminación");
      setScheduledFor(data.deletionScheduledFor ?? null);
      setConfirmOpen(false);
      setMessage(data.message ?? "La eliminación de la cuenta quedó programada.");
    } catch (error: unknown) {
      setMessage(error instanceof Error ? error.message : "No pude programar la eliminación");
    } finally {
      setLoading(false);
    }
  }

  return (
    <>
      <div className="settings-card" style={{ marginBottom: "1.5rem" }}>
        <h3 className="settings-section-label">Cuenta</h3>
        <div style={{ display: "flex", alignItems: "center", gap: ".875rem", padding: ".5rem 0" }}>
          <UserButton appearance={{ elements: { userButtonAvatarBox: "w-10 h-10 rounded-xl" } }} />
          <div>
            <p style={{ fontWeight: 600, fontSize: ".9rem", color: "var(--fg)" }}>{fullName}</p>
            <p style={{ fontSize: ".78rem", color: "var(--fg-muted)" }}>{email}</p>
          </div>
        </div>

        {blocked && (
          <div className="settings-danger-zone">
            <div>
              <p className="settings-danger-title">Eliminar cuenta</p>
              <p className="settings-danger-copy">
                Guardaremos la información de tu cuenta durante 30 días por si decides reactivarla. Después de ese plazo se eliminará por completo.
              </p>
              {scheduledFor && (
                <p className="settings-danger-note">
                  Eliminación programada para el {new Date(scheduledFor).toLocaleDateString("es-MX")}.
                </p>
              )}
              {message && <p className="settings-danger-note">{message}</p>}
            </div>
            <button
              type="button"
              onClick={() => setConfirmOpen(true)}
              className="settings-danger-btn"
              disabled={loading || !!scheduledFor}
            >
              {loading && <Loader2 size={14} className="spin" />}
              {scheduledFor ? "Eliminación programada" : "Eliminar cuenta"}
            </button>
          </div>
        )}
      </div>

      {confirmOpen && (
        <div className="settings-modal-backdrop" onClick={() => setConfirmOpen(false)}>
          <div className="settings-modal-card" onClick={(event) => event.stopPropagation()}>
            <div className="settings-modal-icon">
              <AlertTriangle size={18} />
            </div>
            <h4 className="settings-modal-title">Confirmar eliminación de cuenta</h4>
            <p className="settings-modal-copy">
              Tu cuenta quedará desactivada y guardaremos la información durante 30 días para que puedas reactivarla si cambias de opinión. Después de esos 30 días, eliminaremos la cuenta y sus datos por completo.
            </p>
            <div className="settings-modal-actions">
              <button type="button" className="settings-modal-cancel" onClick={() => setConfirmOpen(false)} disabled={loading}>
                Cancelar
              </button>
              <button type="button" className="settings-modal-confirm" onClick={requestDeletion} disabled={loading}>
                {loading && <Loader2 size={14} className="spin" />}
                Confirmar eliminación
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  );
}
