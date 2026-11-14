import React from "react";

export type BrandLogoName =
  | "airtel"
  | "wave"
  | "orange"
  | "mtn"
  | "moov"
  | "free"
  | "mpesa"
  | "visa"
  | "mastercard";
interface BrandLogoProps {
  name: BrandLogoName;
  className?: string;
}

const config: Record<BrandLogoName, { label: string; background: string; foreground: string }> = {
  airtel: { label: "Airtel", background: "#ffffff", foreground: "#d71920" },
  wave: { label: "W", background: "#1DC3FD", foreground: "#062332" },
  orange: { label: "OM", background: "#FF7900", foreground: "#ffffff" },
  mtn: { label: "MTN", background: "#FFCC00", foreground: "#111111" },
  moov: { label: "moov", background: "#005BAA", foreground: "#ffffff" },
  free: { label: "Free", background: "#ffffff", foreground: "#cd1818" },
  mpesa: { label: "M-Pesa", background: "transparent", foreground: "#eeeeee" },
  visa: { label: "VISA", background: "#1A1F71", foreground: "#ffffff" },
  mastercard: { label: "MC", background: "#EB001B", foreground: "#ffffff" },
};

const operatorLogoNames: Record<string, BrandLogoName> = {
  airtel: "airtel",
  free: "free",
  mtn: "mtn",
  mtn_momo: "mtn",
  moov: "moov",
  moov_money: "moov",
  mpesa: "mpesa",
  orange: "orange",
  orange_money: "orange",
  wave: "wave",
};

export const getOperatorLogoName = (operatorId: string): BrandLogoName | null =>
  operatorLogoNames[operatorId.toLowerCase()] || null;

export const BrandLogo: React.FC<BrandLogoProps> = ({ name, className = "size-9" }) => {
  const item = config[name];
  const hasImage = ["airtel", "wave", "orange", "mtn", "moov", "free"].includes(name);

  if (hasImage) {
    return (
      <img
        src={`/operators/${name}.png`}
        alt={item.label}
        className={`inline-block shrink-0 rounded-lg object-contain ${className}`}
      />
    );
  }

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
