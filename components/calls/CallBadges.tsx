import { PhoneIncoming, PhoneOutgoing, type LucideIcon } from "lucide-react";

import { cn } from "@/lib/utils";
import { Badge } from "@/components/ui/badge";
import type { CallDirection, CallStatus } from "@/lib/types";

interface StatusBadgeProps {
  status: CallStatus | null | undefined;
  className?: string;
}

export function StatusBadge({ status, className }: StatusBadgeProps) {
  const config: Record<CallStatus, { label: string; classes: string }> = {
    completed: {
      label: "Completed",
      classes: "bg-emerald-100 text-emerald-700 hover:bg-emerald-100",
    },
    in_progress: {
      label: "In progress",
      classes: "bg-amber-100 text-amber-700 hover:bg-amber-100",
    },
    missed: {
      label: "Missed",
      classes: "bg-rose-100 text-rose-700 hover:bg-rose-100",
    },
    failed: {
      label: "Failed",
      classes: "bg-rose-100 text-rose-700 hover:bg-rose-100",
    },
  };
  const fallback = { label: "—", classes: "bg-muted text-muted-foreground" };
  const { label, classes } = status ? config[status] : fallback;
  return (
    <Badge variant="secondary" className={cn("border-0 font-medium", classes, className)}>
      {label}
    </Badge>
  );
}

interface DirectionBadgeProps {
  direction: CallDirection | null | undefined;
  className?: string;
  showLabel?: boolean;
}

export function DirectionBadge({
  direction,
  className,
  showLabel = true,
}: DirectionBadgeProps) {
  const Icon: LucideIcon =
    direction === "outbound" ? PhoneOutgoing : PhoneIncoming;
  const label = direction === "outbound" ? "Outbound" : "Inbound";
  const colors =
    direction === "outbound"
      ? "text-violet-700 bg-violet-100"
      : "text-dc-blue bg-dc-blue/10";
  return (
    <span
      className={cn(
        "inline-flex items-center gap-1.5 rounded-md px-2 py-0.5 text-xs font-medium",
        colors,
        className,
      )}
    >
      <Icon className="h-3.5 w-3.5" aria-hidden="true" />
      {showLabel && <span>{label}</span>}
    </span>
  );
}

export function DepartmentBadge({
  name,
  className,
}: {
  name: string | null | undefined;
  className?: string;
}) {
  if (!name) {
    return (
      <span className={cn("text-xs text-muted-foreground", className)}>—</span>
    );
  }
  return (
    <Badge
      variant="secondary"
      className={cn(
        "border-0 bg-dc-blue/10 text-dc-blue-dark hover:bg-dc-blue/10",
        className,
      )}
    >
      {name}
    </Badge>
  );
}
