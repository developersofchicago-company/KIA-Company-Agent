import { Clock, Phone, PhoneIncoming, PhoneMissed } from "lucide-react";

import { createServerSupabase } from "@/lib/supabase-server";
import { getDashboardStats } from "@/lib/db";
import { formatDuration } from "@/lib/format";
import {
  StatsCard,
  StatsCardSkeleton,
} from "@/components/dashboard/StatsCard";

export async function StatsRow() {
  const supabase = createServerSupabase();
  const stats = await getDashboardStats(supabase);

  return (
    <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
      <StatsCard
        title="Total Calls Today"
        value={stats.totalCallsToday.toLocaleString()}
        icon={Phone}
        iconColorClass="text-dc-blue bg-dc-blue/10"
        changePct={stats.totalChangePct}
      />
      <StatsCard
        title="Inbound Calls"
        value={stats.inboundToday.toLocaleString()}
        icon={PhoneIncoming}
        iconColorClass="text-emerald-600 bg-emerald-100"
        hint={`${stats.outboundToday.toLocaleString()} outbound`}
      />
      <StatsCard
        title="Average Duration"
        value={
          stats.avgDurationToday > 0
            ? formatDuration(Math.round(stats.avgDurationToday))
            : "—"
        }
        icon={Clock}
        iconColorClass="text-violet-600 bg-violet-100"
        changePct={stats.avgDurationChangePct}
      />
      <StatsCard
        title="Missed Calls"
        value={stats.missedToday.toLocaleString()}
        icon={PhoneMissed}
        iconColorClass="text-rose-600 bg-rose-100"
        changePct={stats.missedChangePct}
        invertColor
      />
    </div>
  );
}

export function StatsRowSkeleton() {
  return (
    <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
      {Array.from({ length: 4 }).map((_, i) => (
        <StatsCardSkeleton key={i} />
      ))}
    </div>
  );
}
