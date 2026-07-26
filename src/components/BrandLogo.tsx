"use client";

import Image from "next/image";

interface BrandLogoProps {
  compact?: boolean;
  align?: "left" | "center";
}

export default function BrandLogo({ compact = false, align = "left" }: BrandLogoProps) {
  const width = compact ? 152 : 232;
  const height = compact ? 58 : 108;
  const justifyContent = align === "center" ? "center" : "flex-start";

  return (
    <div className="inline-flex items-center w-full" style={{ justifyContent }}>
      <Image
        src="/agendame-logo.png"
        alt="Agendame"
        width={width}
        height={height}
        priority
        style={{
          width: "auto",
          height: compact ? "2.3rem" : "5.6rem",
          maxWidth: compact ? "9.5rem" : "14.5rem",
        }}
      />
    </div>
  );
}
