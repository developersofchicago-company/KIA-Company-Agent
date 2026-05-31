import { createServerSupabase } from "@/lib/supabase-server";
import { getCallsActivityToday, getCallsByDepartment } from "@/lib/db";
import { Card, CardContent, CardHeader } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { CallsActivityChart } from "@/components/dashboard/CallsActivityChart";
import { DepartmentBreakdownChart } from "@/components/dashboard/DepartmentBreakdownChart";

export async function ChartsRow() {
  const supabase = createServerSupabase();
  const [activity, byDept] = await Promise.all([
    getCallsActivityToday(supabase),
    getCallsByDepartment(supabase, 7),
  ]);

  return (
    <div className="grid grid-cols-1 gap-4 lg:grid-cols-2">
      <CallsActivityChart data={activity} />
      <DepartmentBreakdownChart data={byDept} />
    </div>
  );
}

export function ChartsRowSkeleton() {
  return (
    <div className="grid grid-cols-1 gap-4 lg:grid-cols-2">
      {Array.from({ length: 2 }).map((_, i) => (
        <Card key={i}>
          <CardHeader className="pb-2">
            <Skeleton className="h-4 w-40" />
            <Skeleton className="mt-2 h-3 w-24" />
          </CardHeader>
          <CardContent>
            <Skeleton className="h-[260px] w-full rounded" />
          </CardContent>
        </Card>
      ))}
    </div>
  );
}
