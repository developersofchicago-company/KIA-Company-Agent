import { ArrowDown, ArrowRight, ArrowUp, type LucideIcon } from "lucide-react";

import { cn } from "@/lib/utils";
import { Card, CardContent } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";

export type StatsTrend = "up" | "down" | "neutral";

interface StatsCardProps {
  title: string;
  value: string | number;
  icon: LucideIcon;
  iconColorClass?: string; // e.g. "text-dc-blue bg-dc-blue/10"
  changePct?: number | null;
  trend?: StatsTrend;
  /** When true, "down" is good (e.g. missed calls). */
  invertColor?: boolean;
  hint?: string;
}

export function StatsCard({
  title,
  value,
  icon: Icon,
  iconColorClass = "text-dc-blue bg-dc-blue/10",
  changePct,
  trend,
  invertColor = false,
  hint,
}: StatsCardProps) {
  const effectiveTrend: StatsTrend =
    trend ??
    (changePct == null
      ? "neutral"
      : changePct > 0
        ? "up"
        : changePct < 0
          ? "down"
          : "neutral");

  // "down is good" inverts color logic
  const isPositive =
    effectiveTrend === "neutral"
      ? false
      : invertColor
        ? effectiveTrend === "down"
        : effectiveTrend === "up";
  const isNegative =
    effectiveTrend === "neutral"
      ? false
      : invertColor
        ? effectiveTrend === "up"
        : effectiveTrend === "down";

  const Arrow =
    effectiveTrend === "up"
      ? ArrowUp
      : effectiveTrend === "down"
        ? ArrowDown
        : ArrowRight;

  return (
    <Card className="group transition-all hover:-translate-y-0.5 hover:shadow-md">
      <CardContent className="p-5">
        <div className="flex items-start justify-between gap-3">
          <div className="space-y-1.5">
            <p className="text-xs font-medium uppercase tracking-wider text-muted-foreground">
              {title}
            </p>
            <p className="text-3xl font-bold tracking-tight text-dc-navy">
              {value}
            </p>
            {changePct != null ? (
              <p
                className={cn(
                  "inline-flex items-center gap-1 text-xs font-medium",
                  isPositive && "text-emerald-600",
                  isNegative && "text-rose-600",
                  effectiveTrend === "neutral" && "text-muted-foreground",
                )}
              >
                <Arrow className="h-3.5 w-3.5" aria-hidden="true" />
                {Math.abs(changePct).toFixed(0)}%
                <span className="font-normal text-muted-foreground">
                  vs yesterday
                </span>
              </p>
            ) : hint ? (
              <p className="text-xs text-muted-foreground">{hint}</p>
            ) : (
              <p className="text-xs text-muted-foreground">No data yet</p>
            )}
          </div>
          <div
            className={cn(
              "flex h-10 w-10 shrink-0 items-center justify-center rounded-full",
              iconColorClass,
            )}
          >
            <Icon className="h-5 w-5" aria-hidden="true" />
          </div>
        </div>
      </CardContent>
    </Card>
  );
}

export function StatsCardSkeleton() {
  return (
    <Card>
      <CardContent className="p-5">
        <div className="flex items-start justify-between gap-3">
          <div className="space-y-2">
            <Skeleton className="h-3 w-24" />
            <Skeleton className="h-9 w-16" />
            <Skeleton className="h-3 w-28" />
          </div>
          <Skeleton className="h-10 w-10 rounded-full" />
        </div>
      </CardContent>
    </Card>
  );
}
