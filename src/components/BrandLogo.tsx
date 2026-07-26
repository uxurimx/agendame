"use client";

import Image from "next/image";

interface BrandLogoProps {
  compact?: boolean;
}

export default function BrandLogo({ compact = false }: BrandLogoProps) {
  const width = compact ? 168 : 208;
  const height = compact ? 76 : 94;

  return (
    <div className="inline-flex items-center justify-center w-full">
      <Image
        src="/agendame-logo.png"
        alt="Agendame"
        width={width}
        height={height}
        priority
        style={{
          width: "auto",
          height: compact ? "3rem" : "4.1rem",
          maxWidth: compact ? "10.5rem" : "13rem",
        }}
      />
    </div>
  );
}
