import { Suspense } from "react";
import { format as formatDate } from "date-fns";

import { createServerSupabase } from "@/lib/supabase-server";
import { StatsRow, StatsRowSkeleton } from "@/components/dashboard/StatsRow";
import {
  ChartsRow,
  ChartsRowSkeleton,
} from "@/components/dashboard/ChartsRow";
import {
  RecentCallsSection,
  RecentCallsSkeleton,
} from "@/components/dashboard/RecentCallsSection";

export const dynamic = "force-dynamic";

export default async function DashboardPage() {
  const supabase = createServerSupabase();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  const email = user?.email ?? "";
  const meta = (user?.user_metadata ?? {}) as {
    full_name?: string;
    name?: string;
  };
  const firstName =
    (meta.full_name ?? meta.name ?? email.split("@")[0] ?? "there").split(
      /\s+/,
    )[0];

  const today = new Date();
  const formattedDate = formatDate(today, "EEEE, MMMM d, yyyy");

  return (
    <div className="space-y-6">
      <header className="flex flex-wrap items-end justify-between gap-3">
        <div>
          <h1 className="text-3xl font-bold tracking-tight text-dc-navy">
            Dashboard
          </h1>
          <p className="mt-1 text-sm text-muted-foreground">
            Welcome back, {firstName}.
          </p>
        </div>
        <div className="rounded-lg border border-border bg-card px-3 py-1.5 text-xs">
          <span className="text-muted-foreground">Today, </span>
          <span className="font-medium text-dc-navy">{formattedDate}</span>
        </div>
      </header>

      <Suspense fallback={<StatsRowSkeleton />}>
        <StatsRow />
      </Suspense>

      <Suspense fallback={<ChartsRowSkeleton />}>
        <ChartsRow />
      </Suspense>

      <Suspense fallback={<RecentCallsSkeleton />}>
        <RecentCallsSection />
      </Suspense>
    </div>
  );
}
