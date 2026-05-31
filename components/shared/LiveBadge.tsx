import { cn } from "@/lib/utils";

interface Props {
  className?: string;
  active?: boolean;
  label?: string;
}

export function LiveBadge({ className, active = true, label = "Live" }: Props) {
  return (
    <span
      className={cn(
        "inline-flex items-center gap-1.5 rounded-full bg-emerald-50 px-2 py-0.5 text-xs font-medium text-emerald-700",
        !active && "bg-muted text-muted-foreground",
        className,
      )}
    >
      <span className="relative inline-flex h-2 w-2">
        {active && (
          <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-emerald-500/60" />
        )}
        <span
          className={cn(
            "relative inline-flex h-2 w-2 rounded-full",
            active ? "bg-emerald-500" : "bg-muted-foreground",
          )}
        />
      </span>
      {label}
    </span>
  );
}
