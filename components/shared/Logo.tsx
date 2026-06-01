import Image from "next/image";
import { cn } from "@/lib/utils";

type LogoSize = "sm" | "md" | "lg";
type LogoVariant = "full" | "icon-only";

interface LogoProps {
  size?: LogoSize;
  variant?: LogoVariant;
  className?: string;
}

const sizeMap: Record<LogoSize, { img: number; sub: string; gap: string }> = {
  sm: { img: 32, sub: "text-[10px]", gap: "gap-1.5" },
  md: { img: 40, sub: "text-xs", gap: "gap-2" },
  lg: { img: 56, sub: "text-sm", gap: "gap-2.5" },
};

export function Logo({ size = "md", variant = "full", className }: LogoProps) {
  const s = sizeMap[size];

  return (
    <div className={cn("flex items-center", s.gap, className)}>
      <Image
        src="/logo.png"
        alt="DC Logo"
        width={s.img}
        height={s.img}
        className="object-contain"
        priority
      />
      {variant === "full" && (
        <span
          className={cn(
            "font-medium uppercase tracking-wider text-dc-navy/70 leading-none",
            s.sub,
          )}
        >
          AI&nbsp;Receptionist
        </span>
      )}
      <span className="sr-only">DC AI Receptionist</span>
    </div>
  );
}
