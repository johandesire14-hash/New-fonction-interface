import React from "react";

type BrandLogoName = "wave" | "orange" | "mtn" | "moov" | "visa" | "mastercard";
interface BrandLogoProps {
  name: BrandLogoName;
  className?: string;
}

const config: Record<BrandLogoName, { label: string; background: string; foreground: string }> = {
  wave: { label: "W", background: "#1DC3FD", foreground: "#062332" },
  orange: { label: "OM", background: "#FF7900", foreground: "#ffffff" },
  mtn: { label: "MTN", background: "#FFCC00", foreground: "#111111" },
  moov: { label: "moov", background: "#005BAA", foreground: "#ffffff" },
  visa: { label: "VISA", background: "#1A1F71", foreground: "#ffffff" },
  mastercard: { label: "MC", background: "#EB001B", foreground: "#ffffff" },
};

export const BrandLogo: React.FC<BrandLogoProps> = ({ name, className = "size-9" }) => {
  const item = config[name];
  return (
    <span
      aria-label={name}
      role="img"
      className={
        "inline-flex shrink-0 items-center justify-center rounded-lg px-1.5 text-[10px] font-black tracking-tight " +
        className
      }
      style={{ backgroundColor: item.background, color: item.foreground }}
    >
      {item.label}
    </span>
  );
};
