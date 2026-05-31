"use client";

import {
  Area,
  AreaChart,
  CartesianGrid,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";

import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import type { ActivityBucket } from "@/lib/db";

interface Props {
  data: ActivityBucket[];
}

interface TooltipPayload {
  payload?: ActivityBucket;
  value?: number;
}

function CustomTooltip({
  active,
  payload,
}: {
  active?: boolean;
  payload?: TooltipPayload[];
}) {
  if (!active || !payload?.length) return null;
  const bucket = payload[0].payload;
  if (!bucket) return null;
  return (
    <div className="rounded-md border border-border bg-popover px-3 py-2 text-xs shadow-sm">
      <p className="font-medium text-dc-navy">{bucket.label}</p>
      <p className="text-muted-foreground">
        <span className="font-mono text-sm font-semibold text-dc-blue">
          {bucket.count}
        </span>{" "}
        call{bucket.count === 1 ? "" : "s"}
      </p>
    </div>
  );
}

export function CallsActivityChart({ data }: Props) {
  const peak = data.reduce<ActivityBucket | null>(
    (best, b) => (best == null || b.count > best.count ? b : best),
    null,
  );
  const totalToday = data.reduce((sum, b) => sum + b.count, 0);
  const subtitle =
    totalToday === 0
      ? "No calls yet today"
      : peak && peak.count > 0
        ? `Peak hour: ${peak.label} (${peak.count} call${peak.count === 1 ? "" : "s"})`
        : "—";

  return (
    <Card className="h-full">
      <CardHeader className="pb-2">
        <CardTitle className="text-base font-semibold text-dc-navy">
          Today&rsquo;s call activity
        </CardTitle>
        <p className="text-xs text-muted-foreground">{subtitle}</p>
      </CardHeader>
      <CardContent>
        {totalToday === 0 ? (
          <div className="flex h-[260px] items-center justify-center text-sm text-muted-foreground">
            Once calls land today, you&rsquo;ll see them here.
          </div>
        ) : (
          <div className="h-[260px] w-full">
            <ResponsiveContainer width="100%" height="100%">
              <AreaChart
                data={data}
                margin={{ top: 8, right: 8, bottom: 0, left: -16 }}
              >
                <defs>
                  <linearGradient id="dcBlueFill" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="0%" stopColor="#0066FF" stopOpacity={0.35} />
                    <stop offset="100%" stopColor="#0066FF" stopOpacity={0.02} />
                  </linearGradient>
                </defs>
                <CartesianGrid
                  strokeDasharray="3 3"
                  vertical={false}
                  stroke="hsl(var(--border))"
                />
                <XAxis
                  dataKey="label"
                  tick={{ fontSize: 11, fill: "hsl(var(--muted-foreground))" }}
                  tickLine={false}
                  axisLine={false}
                />
                <YAxis
                  allowDecimals={false}
                  tick={{ fontSize: 11, fill: "hsl(var(--muted-foreground))" }}
                  tickLine={false}
                  axisLine={false}
                  width={32}
                />
                <Tooltip content={<CustomTooltip />} cursor={{ stroke: "#0066FF", strokeOpacity: 0.2 }} />
                <Area
                  type="monotone"
                  dataKey="count"
                  stroke="#0066FF"
                  strokeWidth={2}
                  fill="url(#dcBlueFill)"
                  dot={{ r: 3, fill: "#0066FF" }}
                  activeDot={{ r: 5 }}
                />
              </AreaChart>
            </ResponsiveContainer>
          </div>
        )}
      </CardContent>
    </Card>
  );
}
