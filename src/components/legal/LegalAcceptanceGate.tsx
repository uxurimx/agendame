"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import { SignUp } from "@clerk/nextjs";
import {
  LEGAL_ACCEPTANCE_STORAGE_KEY,
  LEGAL_CHECKBOX_LABEL,
  LEGAL_PATHS,
  LEGAL_VERSIONS,
  type LegalAcceptancePayload,
} from "@/lib/legal";

function readStoredAcceptance(): LegalAcceptancePayload | null {
  if (typeof window === "undefined") return null;
  try {
    const raw = sessionStorage.getItem(LEGAL_ACCEPTANCE_STORAGE_KEY);
    if (!raw) return null;
    const parsed = JSON.parse(raw) as Partial<LegalAcceptancePayload>;
    if (
      parsed.accepted === true &&
      parsed.termsVersion === LEGAL_VERSIONS.terms &&
      parsed.privacyVersion === LEGAL_VERSIONS.privacy
    ) {
      return parsed as LegalAcceptancePayload;
    }
  } catch {}
  return null;
}

export default function LegalAcceptanceGate() {
  const [accepted, setAccepted] = useState(false);
  const [ready, setReady] = useState(false);

  useEffect(() => {
    const stored = readStoredAcceptance();
    setTimeout(() => {
      setAccepted(!!stored);
      setReady(true);
    }, 0);
  }, []);

  function continueToSignUp() {
    const payload: LegalAcceptancePayload = {
      accepted: true,
      termsVersion: LEGAL_VERSIONS.terms,
      privacyVersion: LEGAL_VERSIONS.privacy,
    };
    sessionStorage.setItem(LEGAL_ACCEPTANCE_STORAGE_KEY, JSON.stringify(payload));
    setAccepted(true);
  }

  if (!ready) return null;

  if (accepted) {
    return <SignUp forceRedirectUrl="/onboarding" />;
  }

  return (
    <div
      style={{
        width: "100%",
        maxWidth: 460,
        background: "white",
        borderRadius: "1.5rem",
        padding: "1.5rem",
        border: "1px solid rgba(118, 83, 159, 0.12)",
        boxShadow: "0 20px 50px rgba(64, 36, 91, 0.12)",
      }}
    >
      <p style={{ fontSize: ".76rem", fontWeight: 700, color: "#7d34b3", letterSpacing: ".08em", textTransform: "uppercase", marginBottom: ".75rem" }}>
        Antes de crear tu cuenta
      </p>
      <h1 style={{ fontSize: "1.5rem", lineHeight: 1.15, color: "#231b2f", marginBottom: ".75rem" }}>
        Revisa los documentos legales de Agéndame
      </h1>
      <p style={{ color: "#6f677a", fontSize: ".92rem", lineHeight: 1.65, marginBottom: "1rem" }}>
        Para continuar necesitamos tu aceptación de los términos y el reconocimiento del aviso de privacidad vigente.
      </p>

      <div style={{ display: "flex", gap: ".75rem", flexWrap: "wrap", marginBottom: "1rem" }}>
        <Link href={LEGAL_PATHS.terms} target="_blank" rel="noopener noreferrer" style={{ color: "#6E2A96", fontWeight: 600, textDecoration: "none" }}>
          Ver Términos y Condiciones
        </Link>
        <Link href={LEGAL_PATHS.privacy} target="_blank" rel="noopener noreferrer" style={{ color: "#6E2A96", fontWeight: 600, textDecoration: "none" }}>
          Ver Aviso de Privacidad
        </Link>
      </div>

      <label style={{ display: "flex", alignItems: "flex-start", gap: ".75rem", marginBottom: "1.15rem", cursor: "pointer" }}>
        <input type="checkbox" checked={accepted} onChange={(e) => setAccepted(e.target.checked)} style={{ marginTop: 3 }} />
        <span style={{ color: "#3f374a", fontSize: ".9rem", lineHeight: 1.6 }}>{LEGAL_CHECKBOX_LABEL}</span>
      </label>

      <button
        type="button"
        onClick={continueToSignUp}
        disabled={!accepted}
        style={{
          width: "100%",
          padding: ".95rem 1rem",
          borderRadius: "1rem",
          border: "none",
          background: accepted ? "linear-gradient(135deg,#6E2A96,#E8631F)" : "#d8d0e2",
          color: "white",
          fontWeight: 700,
          cursor: accepted ? "pointer" : "not-allowed",
        }}
      >
        Continuar al registro
      </button>
    </div>
  );
}
