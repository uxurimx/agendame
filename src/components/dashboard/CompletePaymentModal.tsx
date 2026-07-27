"use client";

import { useState } from "react";
import { Loader2, CheckCircle } from "lucide-react";

type PayMethod = "cash" | "card" | "transfer";

const PAY_LABELS: Record<PayMethod, string> = {
  cash: "Efectivo",
  card: "Tarjeta",
  transfer: "Transferencia",
};

interface CompletePaymentModalProps {
  appointmentId: string;
  defaultAmount: string;
  onClose: () => void;
  onSuccess?: () => void;
}

export function CompletePaymentModal({
  appointmentId,
  defaultAmount,
  onClose,
  onSuccess,
}: CompletePaymentModalProps) {
  const [method, setMethod] = useState<PayMethod>("cash");
  const [amount, setAmount] = useState(defaultAmount);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  async function confirm() {
    const normalizedAmount = Number(amount);
    if (!Number.isFinite(normalizedAmount) || normalizedAmount < 0) {
      setError("Ingresa un monto valido.");
      return;
    }

    setLoading(true);
    setError("");

    try {
      const res = await fetch(`/api/appointments/${appointmentId}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          status: "completed",
          paymentStatus: "paid",
          paymentMethod: method,
          pricePaid: normalizedAmount,
        }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error ?? "Error al registrar pago");
      onSuccess?.();
      onClose();
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : "Error al registrar pago");
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="apt-modal-backdrop" onClick={onClose}>
      <div className="apt-modal" onClick={(e) => e.stopPropagation()}>
        <h3 className="apt-modal-title">Registrar pago</h3>
        <p className="apt-modal-price">${Number(defaultAmount).toLocaleString("es-MX")} MXN</p>

        <div className="apt-modal-field">
          <label htmlFor="payment-amount" className="apt-modal-label">Monto recibido</label>
          <input
            id="payment-amount"
            type="number"
            min="0"
            step="0.01"
            inputMode="decimal"
            value={amount}
            onChange={(e) => setAmount(e.target.value)}
            className="apt-modal-input"
            placeholder="0.00"
          />
        </div>

        <div className="apt-modal-field">
          <p className="apt-modal-label">Metodo de pago</p>
          <div className="apt-pay-options">
            {(["cash", "card", "transfer"] as PayMethod[]).map((m) => (
              <button
                key={m}
                type="button"
                onClick={() => setMethod(m)}
                className={`apt-pay-opt${method === m ? " apt-pay-opt--selected" : ""}`}
              >
                {PAY_LABELS[m]}
              </button>
            ))}
          </div>
        </div>

        {error && <p className="apt-modal-error">{error}</p>}

        <div className="apt-modal-actions">
          <button type="button" onClick={onClose} className="apt-btn-ghost">Cancelar</button>
          <button type="button" onClick={confirm} disabled={loading} className="apt-btn-confirm">
            {loading ? <Loader2 size={14} className="spin" /> : <CheckCircle size={14} />}
            Confirmar pago
          </button>
        </div>
      </div>
    </div>
  );
}
