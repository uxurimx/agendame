import LegalAcceptanceGate from "@/components/legal/LegalAcceptanceGate";

export default function SignUpPage() {
  return (
    <div className="min-h-screen flex items-center justify-center" style={{ backgroundColor: "var(--bg)" }}>
      <LegalAcceptanceGate />
    </div>
  );
}
