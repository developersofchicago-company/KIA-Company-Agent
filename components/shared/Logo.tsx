import { cn } from "@/lib/utils";

type LogoSize = "sm" | "md" | "lg";
type LogoVariant = "full" | "icon-only";

interface LogoProps {
  size?: LogoSize;
  variant?: LogoVariant;
  className?: string;
}

const sizeClasses: Record<LogoSize, { mark: string; sub: string; gap: string }> = {
  sm: { mark: "text-xl", sub: "text-[10px]", gap: "gap-1.5" },
  md: { mark: "text-2xl", sub: "text-xs", gap: "gap-2" },
  lg: { mark: "text-4xl", sub: "text-sm", gap: "gap-2.5" },
};

export function Logo({ size = "md", variant = "full", className }: LogoProps) {
  const s = sizeClasses[size];

  return (
    <div className={cn("flex items-center", s.gap, className)}>
      <span
        className={cn(
          "font-extrabold tracking-tight text-dc-blue leading-none",
          s.mark,
        )}
        aria-hidden="true"
      >
        DC
      </span>
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
