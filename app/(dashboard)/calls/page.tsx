import { createServerSupabase } from "@/lib/supabase-server";
import {
  getCallsCount,
  getCallsWithFilters,
} from "@/lib/db";
import { parseCallsSearchParams, parsePagination } from "@/lib/calls-search";
import { CallsFiltersBar } from "@/components/calls/CallsFiltersBar";
import { CallsTable } from "@/components/calls/CallsTable";
import { CallsPagination } from "@/components/calls/CallsPagination";
import { CallsEmptyState } from "@/components/calls/CallsEmptyState";

export const dynamic = "force-dynamic";

interface PageProps {
  searchParams: Record<string, string | string[] | undefined>;
}

export default async function CallsPage({ searchParams }: PageProps) {
  const supabase = createServerSupabase();
  const filters = parseCallsSearchParams(searchParams);
  const { page, pageSize, offset, limit } = parsePagination(searchParams);

  const [calls, total, deptResp] = await Promise.all([
    getCallsWithFilters(supabase, { ...filters, offset, limit }),
    getCallsCount(supabase, filters),
    supabase.from("departments").select("*").order("name"),
  ]);

  const departments = (deptResp.data ?? []) as Awaited<
    ReturnType<typeof import("@/lib/db").getDepartments>
  >;

  const hasActiveFilters =
    !!filters.search ||
    !!filters.departmentId ||
    !!filters.direction ||
    !!filters.status ||
    !!filters.dateFrom ||
    !!filters.dateTo;

  return (
    <div className="space-y-5">
      <div>
        <h1 className="text-3xl font-bold tracking-tight text-dc-navy">Calls</h1>
        <p className="text-sm text-muted-foreground">
          {total === 0
            ? "No calls in this view."
            : `${total.toLocaleString()} total call${total === 1 ? "" : "s"}`}
        </p>
      </div>

      <CallsFiltersBar departments={departments} />

      {calls.length === 0 ? (
        <CallsEmptyState variant={hasActiveFilters ? "no-results" : "no-data"} />
      ) : (
        <>
          <CallsTable calls={calls} departments={departments} />
          <CallsPagination page={page} pageSize={pageSize} total={total} />
        </>
      )}
    </div>
  );
}
