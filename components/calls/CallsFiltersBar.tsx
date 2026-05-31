"use client";

import { useEffect, useMemo, useState, useTransition } from "react";
import { usePathname, useRouter, useSearchParams } from "next/navigation";
import { CalendarIcon, Filter, Search, X } from "lucide-react";
import { format as formatDate } from "date-fns";
import type { DateRange } from "react-day-picker";

import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Calendar } from "@/components/ui/calendar";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
  SheetTrigger,
} from "@/components/ui/sheet";
import { ExportButton } from "@/components/calls/ExportButton";
import type { Department } from "@/lib/types";

const ALL = "all";

const RANGE_OPTIONS = [
  { value: "all", label: "All time" },
  { value: "today", label: "Today" },
  { value: "week", label: "This week" },
  { value: "month", label: "This month" },
  { value: "custom", label: "Custom" },
];

interface Props {
  departments: Department[];
}

export function CallsFiltersBar({ departments }: Props) {
  const router = useRouter();
  const pathname = usePathname();
  const params = useSearchParams();
  const [isPending, startTransition] = useTransition();

  // Local search state for debounce
  const [search, setSearch] = useState(params.get("search") ?? "");
  useEffect(() => {
    setSearch(params.get("search") ?? "");
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [params.get("search")]);

  // Debounced URL push for search
  useEffect(() => {
    const current = params.get("search") ?? "";
    if (search === current) return;
    const t = setTimeout(() => {
      pushParam("search", search || null);
    }, 300);
    return () => clearTimeout(t);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [search]);

  function pushParams(updates: Record<string, string | null>) {
    const next = new URLSearchParams(params.toString());
    for (const [k, v] of Object.entries(updates)) {
      if (v == null || v === "" || v === ALL) next.delete(k);
      else next.set(k, v);
    }
    // Reset pagination on filter change
    if (Object.keys(updates).some((k) => k !== "page")) next.delete("page");
    startTransition(() => {
      router.push(`${pathname}?${next.toString()}`);
    });
  }

  function pushParam(key: string, value: string | null) {
    pushParams({ [key]: value });
  }

  // ---- Date range state derived from URL ----
  const rangeKey = params.get("range") ?? ALL;
  const dateFromParam = params.get("dateFrom");
  const dateToParam = params.get("dateTo");

  const customRange: DateRange | undefined = useMemo(() => {
    if (rangeKey !== "custom") return undefined;
    return {
      from: dateFromParam ? new Date(dateFromParam) : undefined,
      to: dateToParam ? new Date(dateToParam) : undefined,
    };
  }, [rangeKey, dateFromParam, dateToParam]);

  function onRangeChange(value: string) {
    if (value === "custom") {
      pushParams({ range: "custom" });
    } else {
      pushParams({ range: value, dateFrom: null, dateTo: null });
    }
  }

  function onCustomRangePicked(r: DateRange | undefined) {
    pushParams({
      range: "custom",
      dateFrom: r?.from ? r.from.toISOString() : null,
      dateTo: r?.to ? r.to.toISOString() : null,
    });
  }

  function resetAll() {
    startTransition(() => {
      router.push(pathname);
    });
  }

  const hasActive =
    !!params.get("search") ||
    !!params.get("range") ||
    !!params.get("department") ||
    !!params.get("direction") ||
    !!params.get("status");

  const departmentSelected = params.get("department") ?? ALL;
  const directionSelected = params.get("direction") ?? ALL;
  const statusSelected = params.get("status") ?? ALL;

  // -------------------------------------------------------------------------
  // Shared control fragments (so desktop bar and mobile sheet use the same)
  // -------------------------------------------------------------------------

  const rangeControl = (
    <div className="flex items-center gap-2">
      <Select value={rangeKey} onValueChange={onRangeChange}>
        <SelectTrigger className="w-full md:w-[150px]">
          <SelectValue placeholder="All time" />
        </SelectTrigger>
        <SelectContent>
          {RANGE_OPTIONS.map((o) => (
            <SelectItem key={o.value} value={o.value}>
              {o.label}
            </SelectItem>
          ))}
        </SelectContent>
      </Select>
      {rangeKey === "custom" && (
        <Popover>
          <PopoverTrigger asChild>
            <Button
              variant="outline"
              size="sm"
              className={cn(
                "h-9 justify-start text-left font-normal",
                !customRange?.from && "text-muted-foreground",
              )}
            >
              <CalendarIcon className="mr-2 h-4 w-4" />
              {customRange?.from
                ? customRange.to
                  ? `${formatDate(customRange.from, "LLL d")} – ${formatDate(customRange.to, "LLL d")}`
                  : formatDate(customRange.from, "LLL d, y")
                : "Pick dates"}
            </Button>
          </PopoverTrigger>
          <PopoverContent className="w-auto p-0" align="start">
            <Calendar
              mode="range"
              numberOfMonths={2}
              selected={customRange}
              onSelect={onCustomRangePicked}
              defaultMonth={customRange?.from}
              autoFocus
            />
          </PopoverContent>
        </Popover>
      )}
    </div>
  );

  const deptControl = (
    <Select
      value={departmentSelected}
      onValueChange={(v) => pushParam("department", v === ALL ? null : v)}
    >
      <SelectTrigger className="w-full md:w-[170px]">
        <SelectValue placeholder="All departments" />
      </SelectTrigger>
      <SelectContent>
        <SelectItem value={ALL}>All departments</SelectItem>
        {departments.map((d) => (
          <SelectItem key={d.id} value={d.id}>
            {d.name}
          </SelectItem>
        ))}
      </SelectContent>
    </Select>
  );

  const directionControl = (
    <Select
      value={directionSelected}
      onValueChange={(v) => pushParam("direction", v === ALL ? null : v)}
    >
      <SelectTrigger className="w-full md:w-[140px]">
        <SelectValue placeholder="All directions" />
      </SelectTrigger>
      <SelectContent>
        <SelectItem value={ALL}>All directions</SelectItem>
        <SelectItem value="inbound">Inbound</SelectItem>
        <SelectItem value="outbound">Outbound</SelectItem>
      </SelectContent>
    </Select>
  );

  const statusControl = (
    <Select
      value={statusSelected}
      onValueChange={(v) => pushParam("status", v === ALL ? null : v)}
    >
      <SelectTrigger className="w-full md:w-[150px]">
        <SelectValue placeholder="All statuses" />
      </SelectTrigger>
      <SelectContent>
        <SelectItem value={ALL}>All statuses</SelectItem>
        <SelectItem value="completed">Completed</SelectItem>
        <SelectItem value="in_progress">In progress</SelectItem>
        <SelectItem value="missed">Missed</SelectItem>
        <SelectItem value="failed">Failed</SelectItem>
      </SelectContent>
    </Select>
  );

  const searchControl = (
    <div className="relative w-full md:w-[230px]">
      <Search
        className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground"
        aria-hidden="true"
      />
      <Input
        type="search"
        placeholder="Search phone, name, transcript…"
        value={search}
        onChange={(e) => setSearch(e.target.value)}
        className="h-9 pl-9"
        aria-label="Search calls"
      />
    </div>
  );

  return (
    <div
      className={cn(
        "flex flex-wrap items-center gap-2 rounded-lg border border-border bg-card p-3 transition-opacity",
        isPending && "opacity-70",
      )}
    >
      {/* Desktop layout */}
      <div className="hidden flex-wrap items-center gap-2 md:flex">
        {rangeControl}
        {deptControl}
        {directionControl}
        {statusControl}
        {searchControl}
        {hasActive && (
          <Button
            variant="ghost"
            size="sm"
            onClick={resetAll}
            className="h-9 gap-1 text-muted-foreground hover:text-dc-navy"
          >
            <X className="h-4 w-4" />
            Reset
          </Button>
        )}
        <div className="ml-auto">
          <ExportButton />
        </div>
      </div>

      {/* Mobile layout */}
      <div className="flex w-full items-center gap-2 md:hidden">
        <div className="flex-1">{searchControl}</div>
        <Sheet>
          <SheetTrigger asChild>
            <Button variant="outline" size="icon" aria-label="Open filters">
              <Filter className="h-4 w-4" />
            </Button>
          </SheetTrigger>
          <SheetContent side="right" className="w-[85vw] sm:w-[380px]">
            <SheetHeader>
              <SheetTitle>Filters</SheetTitle>
            </SheetHeader>
            <div className="mt-6 space-y-4">
              <div className="space-y-1.5">
                <p className="text-xs font-medium text-muted-foreground">Date range</p>
                {rangeControl}
              </div>
              <div className="space-y-1.5">
                <p className="text-xs font-medium text-muted-foreground">Department</p>
                {deptControl}
              </div>
              <div className="space-y-1.5">
                <p className="text-xs font-medium text-muted-foreground">Direction</p>
                {directionControl}
              </div>
              <div className="space-y-1.5">
                <p className="text-xs font-medium text-muted-foreground">Status</p>
                {statusControl}
              </div>
              <div className="flex items-center gap-2 pt-2">
                {hasActive && (
                  <Button variant="ghost" size="sm" onClick={resetAll} className="gap-1">
                    <X className="h-4 w-4" /> Reset
                  </Button>
                )}
                <div className="ml-auto">
                  <ExportButton />
                </div>
              </div>
            </div>
          </SheetContent>
        </Sheet>
        <ExportButton />
      </div>
    </div>
  );
}
