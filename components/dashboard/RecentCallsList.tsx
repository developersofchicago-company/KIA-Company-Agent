"use client";

import { useEffect, useRef, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { ArrowUpRight } from "lucide-react";
import { toast } from "sonner";

import { cn } from "@/lib/utils";
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { LiveBadge } from "@/components/shared/LiveBadge";
import {
  DepartmentBadge,
  DirectionBadge,
  StatusBadge,
} from "@/components/calls/CallBadges";
import {
  formatDuration,
  formatFullTimestamp,
  formatPhone,
  formatRelativeTime,
  phoneFlag,
} from "@/lib/format";
import { createBrowserSupabase } from "@/lib/supabase";
import type { Call, Department } from "@/lib/types";

interface Props {
  calls: Call[];
  departments: Department[];
}

export function RecentCallsList({ calls, departments }: Props) {
  const router = useRouter();
  const [live, setLive] = useState(false);
  const [highlight, setHighlight] = useState<Set<string>>(new Set());
  const seenIds = useRef(new Set(calls.map((c) => c.id)));

  const deptName = (id: string | null | undefined): string | null => {
    if (!id) return null;
    return departments.find((d) => d.id === id)?.name ?? null;
  };

  // Update seen IDs whenever new server data arrives
  useEffect(() => {
    const fresh = new Set<string>();
    for (const c of calls) {
      if (!seenIds.current.has(c.id)) fresh.add(c.id);
      seenIds.current.add(c.id);
    }
    if (fresh.size === 0) return;
    setHighlight(fresh);
    const t = window.setTimeout(() => setHighlight(new Set()), 2500);
    return () => window.clearTimeout(t);
  }, [calls]);

  // Realtime: refresh on every change, show a toast for inserts
  useEffect(() => {
    const supabase = createBrowserSupabase();
    const channel = supabase
      .channel("dashboard-recent-calls")
      .on(
        "postgres_changes",
        { event: "INSERT", schema: "public", table: "calls" },
        (payload) => {
          const row = payload.new as Partial<Call>;
          toast.message("New call", {
            description: row.phone_number
              ? `From ${formatPhone(row.phone_number)}`
              : "Incoming call",
          });
          router.refresh();
        },
      )
      .on(
        "postgres_changes",
        { event: "UPDATE", schema: "public", table: "calls" },
        () => router.refresh(),
      )
      .on(
        "postgres_changes",
        { event: "DELETE", schema: "public", table: "calls" },
        () => router.refresh(),
      )
      .subscribe((status) => {
        setLive(status === "SUBSCRIBED");
      });

    return () => {
      supabase.removeChannel(channel);
    };
  }, [router]);

  return (
    <Card>
      <CardHeader className="flex flex-row items-center justify-between gap-3 space-y-0 pb-3">
        <div className="flex items-center gap-2">
          <CardTitle className="text-base font-semibold text-dc-navy">
            Recent calls
          </CardTitle>
          <LiveBadge active={live} label={live ? "Live" : "Offline"} />
        </div>
        <Link
          href="/calls"
          className="inline-flex items-center gap-1 text-sm font-medium text-dc-blue hover:text-dc-blue-dark hover:underline"
        >
          View all
          <ArrowUpRight className="h-3.5 w-3.5" />
        </Link>
      </CardHeader>
      <CardContent className="p-0">
        {calls.length === 0 ? (
          <div className="px-6 py-12 text-center">
            <p className="text-sm font-medium text-dc-navy">No calls yet</p>
            <p className="mt-1 text-xs text-muted-foreground">
              Your AI receptionist is ready to receive calls.
            </p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead className="w-[120px]">Time</TableHead>
                  <TableHead>Phone</TableHead>
                  <TableHead className="hidden md:table-cell w-[110px]">Direction</TableHead>
                  <TableHead className="hidden md:table-cell">Department</TableHead>
                  <TableHead className="w-[90px]">Duration</TableHead>
                  <TableHead className="w-[120px]">Status</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {calls.map((c) => {
                  const isNew = highlight.has(c.id);
                  return (
                    <TableRow
                      key={c.id}
                      onClick={() => router.push(`/calls/${c.id}`)}
                      className={cn(
                        "cursor-pointer transition-colors",
                        isNew && "bg-emerald-50/80 animate-in fade-in-50 slide-in-from-top-2",
                        !isNew && "hover:bg-dc-blue/5",
                      )}
                    >
                      <TableCell
                        className="font-medium text-dc-navy"
                        title={formatFullTimestamp(c.created_at)}
                      >
                        {formatRelativeTime(c.created_at)}
                      </TableCell>
                      <TableCell className="font-mono text-sm">
                        <span className="mr-1.5" aria-hidden="true">
                          {phoneFlag(c.phone_number)}
                        </span>
                        {formatPhone(c.phone_number)}
                      </TableCell>
                      <TableCell className="hidden md:table-cell">
                        <DirectionBadge direction={c.direction} />
                      </TableCell>
                      <TableCell className="hidden md:table-cell">
                        <DepartmentBadge
                          name={deptName(c.department_id) ?? c.department_selected}
                        />
                      </TableCell>
                      <TableCell className="text-sm text-muted-foreground">
                        {formatDuration(c.duration_seconds)}
                      </TableCell>
                      <TableCell>
                        <StatusBadge status={c.status} />
                      </TableCell>
                    </TableRow>
                  );
                })}
              </TableBody>
            </Table>
          </div>
        )}
      </CardContent>
    </Card>
  );
}
