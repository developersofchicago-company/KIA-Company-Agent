"use client";

import { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";

import { cn } from "@/lib/utils";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { createBrowserSupabase } from "@/lib/supabase";
import {
  formatDuration,
  formatFullTimestamp,
  formatPhone,
  formatRelativeTime,
  phoneFlag,
  transcriptPreview,
} from "@/lib/format";
import {
  DepartmentBadge,
  DirectionBadge,
  StatusBadge,
} from "@/components/calls/CallBadges";
import type { Call, Department } from "@/lib/types";

interface Props {
  calls: Call[];
  departments: Department[];
}

export function CallsTable({ calls, departments }: Props) {
  const router = useRouter();
  const [live, setLive] = useState(false);
  const [pulse, setPulse] = useState(false);

  const departmentName = useMemo(() => {
    const map = new Map<string, string>();
    for (const d of departments) map.set(d.id, d.name);
    return (id: string | null | undefined) =>
      id ? map.get(id) ?? null : null;
  }, [departments]);

  // Subscribe to realtime changes; refresh the server component on any event
  useEffect(() => {
    const supabase = createBrowserSupabase();
    const channel = supabase
      .channel("calls-list")
      .on(
        "postgres_changes",
        { event: "*", schema: "public", table: "calls" },
        () => {
          setPulse(true);
          // brief debounce so a burst of events triggers one refresh
          window.setTimeout(() => {
            setPulse(false);
            router.refresh();
          }, 250);
        },
      )
      .subscribe((status) => {
        setLive(status === "SUBSCRIBED");
      });

    return () => {
      supabase.removeChannel(channel);
    };
  }, [router]);

  return (
    <div className="space-y-3">
      <div className="flex items-center gap-2 text-xs text-muted-foreground">
        <span
          className={cn(
            "relative inline-flex h-2 w-2 rounded-full",
            live ? "bg-emerald-500" : "bg-muted-foreground",
          )}
        >
          {live && pulse && (
            <span className="absolute inset-0 animate-ping rounded-full bg-emerald-500/60" />
          )}
        </span>
        {live ? "Live" : "Connecting…"}
      </div>

      {/* Desktop table */}
      <div className="hidden overflow-x-auto rounded-lg border border-border bg-card md:block">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead className="w-[120px]">Time</TableHead>
              <TableHead>Phone</TableHead>
              <TableHead>Caller</TableHead>
              <TableHead className="w-[120px]">Direction</TableHead>
              <TableHead>Department</TableHead>
              <TableHead className="w-[110px]">Duration</TableHead>
              <TableHead className="w-[130px]">Status</TableHead>
              <TableHead>Transcript</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {calls.map((c) => (
              <TableRow
                key={c.id}
                className="cursor-pointer hover:bg-dc-blue/5"
                onClick={() => router.push(`/calls/${c.id}`)}
              >
                <TableCell
                  className="font-medium text-dc-navy"
                  title={formatFullTimestamp(c.created_at)}
                >
                  {formatRelativeTime(c.created_at)}
                </TableCell>
                <TableCell className="font-mono text-sm">
                  <span className="mr-2" aria-hidden="true">
                    {phoneFlag(c.phone_number)}
                  </span>
                  {formatPhone(c.phone_number)}
                </TableCell>
                <TableCell>
                  {c.caller_name ?? (
                    <span className="text-muted-foreground">Unknown</span>
                  )}
                </TableCell>
                <TableCell>
                  <DirectionBadge direction={c.direction} />
                </TableCell>
                <TableCell>
                  <DepartmentBadge
                    name={departmentName(c.department_id) ?? c.department_selected}
                  />
                </TableCell>
                <TableCell className="text-sm">
                  {formatDuration(c.duration_seconds)}
                </TableCell>
                <TableCell>
                  <StatusBadge status={c.status} />
                </TableCell>
                <TableCell
                  className="max-w-[280px] truncate text-sm text-muted-foreground"
                  title={c.transcript ?? undefined}
                >
                  {transcriptPreview(c.transcript) || (
                    <span className="italic text-muted-foreground/70">No transcript</span>
                  )}
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </div>

      {/* Mobile card list */}
      <ul className="space-y-2 md:hidden">
        {calls.map((c) => (
          <li key={c.id}>
            <Link
              href={`/calls/${c.id}`}
              className="block rounded-lg border border-border bg-card p-4 shadow-sm hover:bg-dc-blue/5"
            >
              <div className="flex items-start justify-between gap-2">
                <div>
                  <p className="font-mono text-sm font-medium text-dc-navy">
                    {phoneFlag(c.phone_number)} {formatPhone(c.phone_number)}
                  </p>
                  <p className="mt-0.5 text-xs text-muted-foreground">
                    {c.caller_name ?? "Unknown"} · {formatRelativeTime(c.created_at)}
                  </p>
                </div>
                <StatusBadge status={c.status} />
              </div>
              <div className="mt-3 flex flex-wrap items-center gap-2">
                <DirectionBadge direction={c.direction} />
                <DepartmentBadge
                  name={departmentName(c.department_id) ?? c.department_selected}
                />
                <Badge variant="secondary" className="border-0 bg-muted text-muted-foreground">
                  {formatDuration(c.duration_seconds)}
                </Badge>
              </div>
              {transcriptPreview(c.transcript) && (
                <p className="mt-3 line-clamp-2 text-xs text-muted-foreground">
                  {transcriptPreview(c.transcript, 120)}
                </p>
              )}
            </Link>
          </li>
        ))}
      </ul>
    </div>
  );
}
