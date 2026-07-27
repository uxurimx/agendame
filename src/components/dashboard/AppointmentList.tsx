"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { Clock, User, Scissors, CheckCircle, XCircle, AlertCircle } from "lucide-react";
import { formatTime } from "@/lib/time";
import { CompletePaymentModal } from "@/components/dashboard/CompletePaymentModal";

type Status = "pending" | "confirmed" | "completed" | "cancelled" | "no_show";
export interface AptItem {
  id:            string;
  startTime:     string;
  endTime:       string;
  status:        string;
  pricePaid:     string | null;
  paymentStatus: string;
  paymentMethod: string | null;
  notes:         string | null;
  service:       { name: string; price: string } | null;
  professional:  { name: string } | null;
  client:        { name: string; phone: string } | null;
}

const STATUS_LABELS: Record<string, string> = {
  pending:   "Pendiente",
  confirmed: "Confirmada",
  completed: "Completada",
  cancelled: "Cancelada",
  no_show:   "No asistió",
};
const STATUS_COLORS: Record<string, string> = {
  pending:   "apt-badge--pending",
  confirmed: "apt-badge--confirmed",
  completed: "apt-badge--completed",
  cancelled: "apt-badge--cancelled",
  no_show:   "apt-badge--noshow",
};
const PAY_LABELS: Record<"cash" | "card" | "transfer", string> = {
  cash:     "Efectivo",
  card:     "Tarjeta",
  transfer: "Transferencia",
};

export function AppointmentList({ appointments }: { appointments: AptItem[] }) {
  const [completing, setCompleting] = useState<string | null>(null);
  const [, startTransition] = useTransition();
  const router = useRouter();

  async function updateStatus(id: string, status: Status) {
    await fetch(`/api/appointments/${id}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ status }),
    });
    startTransition(() => router.refresh());
  }

  if (appointments.length === 0) {
    return (
      <div className="apt-empty">
        <AlertCircle size={32} opacity={0.3} />
        <p>Sin citas para hoy</p>
      </div>
    );
  }

  return (
    <div className="apt-list">
      {completing && (
        <CompletePaymentModal
          appointmentId={completing}
          defaultAmount={appointments.find((a) => a.id === completing)?.pricePaid ?? appointments.find((a) => a.id === completing)?.service?.price ?? "0"}
          onClose={() => setCompleting(null)}
          onSuccess={() => startTransition(() => router.refresh())}
        />
      )}
      {appointments.map((apt) => (
        <div key={apt.id} className={`apt-card apt-card--${apt.status}`}>
          <div className="apt-time-col">
            <span className="apt-time">{formatTime(apt.startTime)}</span>
            <span className="apt-time-end">{formatTime(apt.endTime)}</span>
          </div>
          <div className="apt-info">
            <div className="apt-row">
              <User size={13} />
              <span className="apt-client-name">{apt.client?.name ?? "—"}</span>
              <span className="apt-phone">{apt.client?.phone}</span>
            </div>
            <div className="apt-row">
              <Scissors size={13} />
              <span className="apt-svc">{apt.service?.name ?? "—"}</span>
              <span className="apt-price">${Number(apt.pricePaid ?? apt.service?.price ?? 0).toLocaleString("es-MX")}</span>
            </div>
            {apt.professional && (
              <div className="apt-row">
                <Clock size={13} />
                <span className="apt-pro">{apt.professional.name}</span>
              </div>
            )}
            {apt.paymentMethod && apt.status === "completed" && (
              <span className="apt-pay-badge">{PAY_LABELS[apt.paymentMethod as keyof typeof PAY_LABELS] ?? apt.paymentMethod}</span>
            )}
          </div>
          <div className="apt-actions-col">
            <span className={`apt-badge ${STATUS_COLORS[apt.status] ?? ""}`}>
              {STATUS_LABELS[apt.status] ?? apt.status}
            </span>
            {(apt.status === "pending" || apt.status === "confirmed") && (
              <div className="apt-btns">
                <button
                  type="button"
                  onClick={() => setCompleting(apt.id)}
                  className="apt-btn apt-btn--complete"
                  title="Completar"
                >
                  <CheckCircle size={15} />
                </button>
                <button
                  type="button"
                  onClick={() => updateStatus(apt.id, "cancelled")}
                  className="apt-btn apt-btn--cancel"
                  title="Cancelar"
                >
                  <XCircle size={15} />
                </button>
              </div>
            )}
          </div>
        </div>
      ))}
    </div>
  );
}
