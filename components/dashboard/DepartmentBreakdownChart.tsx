"use client";

import { Cell, Pie, PieChart, ResponsiveContainer, Tooltip } from "recharts";

import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import type { DepartmentBreakdownRow } from "@/lib/db";

const DC_PALETTE = ["#0066FF", "#3385FF", "#66A3FF", "#99C2FF", "#CCDFFF"];

interface Props {
  data: DepartmentBreakdownRow[];
}

interface TooltipPayload {
  name?: string;
  value?: number;
  payload?: DepartmentBreakdownRow;
}

function CustomTooltip({
  active,
  payload,
  total,
}: {
  active?: boolean;
  payload?: TooltipPayload[];
  total: number;
}) {
  if (!active || !payload?.length) return null;
  const row = payload[0].payload;
  if (!row) return null;
  const pct = total > 0 ? ((row.count / total) * 100).toFixed(0) : "0";
  return (
    <div className="rounded-md border border-border bg-popover px-3 py-2 text-xs shadow-sm">
      <p className="font-medium text-dc-navy">{row.departmentName}</p>
      <p className="text-muted-foreground">
        <span className="font-mono text-sm font-semibold text-dc-blue">
          {row.count}
        </span>{" "}
        call{row.count === 1 ? "" : "s"} · {pct}%
      </p>
    </div>
  );
}

export function DepartmentBreakdownChart({ data }: Props) {
  const total = data.reduce((s, r) => s + r.count, 0);

  return (
    <Card className="h-full">
      <CardHeader className="pb-2">
        <CardTitle className="text-base font-semibold text-dc-navy">
          Calls by department
        </CardTitle>
        <p className="text-xs text-muted-foreground">Last 7 days</p>
      </CardHeader>
      <CardContent>
        {total === 0 ? (
          <div className="flex h-[260px] items-center justify-center text-sm text-muted-foreground">
            Routing data will appear once your assistant starts directing calls.
          </div>
        ) : (
          <div className="grid grid-cols-1 items-center gap-6 sm:grid-cols-2">
            <div className="relative h-[220px] w-full">
              <ResponsiveContainer width="100%" height="100%">
                <PieChart>
                  <Pie
                    data={data}
                    dataKey="count"
                    nameKey="departmentName"
                    innerRadius={60}
                    outerRadius={88}
                    paddingAngle={2}
                    strokeWidth={2}
                    stroke="hsl(var(--card))"
                  >
                    {data.map((_, i) => (
                      <Cell
                        key={i}
                        fill={DC_PALETTE[i % DC_PALETTE.length]}
                      />
                    ))}
                  </Pie>
                  <Tooltip content={<CustomTooltip total={total} />} />
                </PieChart>
              </ResponsiveContainer>
              <div className="pointer-events-none absolute inset-0 flex flex-col items-center justify-center">
                <span className="text-2xl font-bold text-dc-navy">
                  {total.toLocaleString()}
                </span>
                <span className="text-[10px] uppercase tracking-wider text-muted-foreground">
                  Total
                </span>
              </div>
            </div>

            <ul className="space-y-2">
              {data.map((row, i) => {
                const pct = ((row.count / total) * 100).toFixed(0);
                return (
                  <li
                    key={`${row.departmentName}-${i}`}
                    className="flex items-center justify-between gap-3 text-sm"
                  >
                    <span className="flex min-w-0 items-center gap-2">
                      <span
                        className="h-2.5 w-2.5 shrink-0 rounded-sm"
                        style={{
                          background: DC_PALETTE[i % DC_PALETTE.length],
                        }}
                      />
                      <span className="truncate text-dc-navy">
                        {row.departmentName}
                      </span>
                    </span>
                    <span className="font-mono text-xs text-muted-foreground">
                      {row.count} · {pct}%
                    </span>
                  </li>
                );
              })}
            </ul>
          </div>
        )}
      </CardContent>
    </Card>
  );
}
