"use client";

import Image from "next/image";

interface BrandLogoProps {
  compact?: boolean;
}

export default function BrandLogo({ compact = false }: BrandLogoProps) {
  const width = compact ? 124 : 152;
  const height = compact ? 42 : 52;

  return (
    <div
      className="inline-flex items-center justify-center rounded-2xl border shadow-sm"
      style={{
        background: "rgba(255,255,255,0.96)",
        borderColor: "rgba(255,255,255,0.18)",
        boxShadow: "0 10px 28px rgba(15,15,26,0.08)",
        padding: compact ? "0.35rem 0.7rem" : "0.45rem 0.85rem",
      }}
    >
      <Image
        src="/agendame-logo.png"
        alt="Agendame"
        width={width}
        height={height}
        priority
        style={{ width: "auto", height: compact ? "1.9rem" : "2.35rem" }}
      />
    </div>
  );
}
