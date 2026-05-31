import { createServerSupabase } from "@/lib/supabase-server";
import { getRecentCalls } from "@/lib/db";
import { Card, CardContent, CardHeader } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { RecentCallsList } from "@/components/dashboard/RecentCallsList";
import type { Department } from "@/lib/types";

export async function RecentCallsSection() {
  const supabase = createServerSupabase();
  const [calls, deptResp] = await Promise.all([
    getRecentCalls(supabase, 10),
    supabase.from("departments").select("*"),
  ]);
  const departments = (deptResp.data ?? []) as Department[];
  return <RecentCallsList calls={calls} departments={departments} />;
}

export function RecentCallsSkeleton() {
  return (
    <Card>
      <CardHeader className="space-y-2">
        <Skeleton className="h-4 w-32" />
      </CardHeader>
      <CardContent className="p-6 pt-0">
        <div className="space-y-2">
          {Array.from({ length: 5 }).map((_, i) => (
            <Skeleton key={i} className="h-10 w-full" />
          ))}
        </div>
      </CardContent>
    </Card>
  );
}
