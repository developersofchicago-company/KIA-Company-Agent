import { endOfDay, startOfDay, startOfMonth, startOfWeek } from "date-fns";
import type { CallsQuery } from "@/lib/db";

const DIRECTIONS = new Set(["inbound", "outbound"]);
const STATUSES = new Set(["completed", "missed", "failed", "in_progress"]);

export type RawSearchParams =
  | URLSearchParams
  | Record<string, string | string[] | undefined>;

function getParam(src: RawSearchParams, key: string): string | undefined {
  if (src instanceof URLSearchParams) return src.get(key) ?? undefined;
  const v = src[key];
  if (Array.isArray(v)) return v[0];
  return v;
}

export function parseCallsSearchParams(src: RawSearchParams): CallsQuery {
  const filters: CallsQuery = {};

  const search = getParam(src, "search")?.trim();
  if (search) filters.search = search;

  const department = getParam(src, "department");
  if (department) filters.departmentId = department;

  const direction = getParam(src, "direction");
  if (direction && DIRECTIONS.has(direction)) {
    filters.direction = direction as "inbound" | "outbound";
  }

  const status = getParam(src, "status");
  if (status && STATUSES.has(status)) {
    filters.status = status as CallsQuery["status"];
  }

  const range = getParam(src, "range");
  if (range === "today") {
    const now = new Date();
    filters.dateFrom = startOfDay(now).toISOString();
    filters.dateTo = endOfDay(now).toISOString();
  } else if (range === "week") {
    filters.dateFrom = startOfWeek(new Date(), { weekStartsOn: 1 }).toISOString();
  } else if (range === "month") {
    filters.dateFrom = startOfMonth(new Date()).toISOString();
  } else if (range === "custom") {
    const from = getParam(src, "dateFrom");
    const to = getParam(src, "dateTo");
    if (from) filters.dateFrom = from;
    if (to) filters.dateTo = to;
  }

  return filters;
}

export function parsePagination(
  src: RawSearchParams,
  defaultPageSize = 25,
): { page: number; pageSize: number; offset: number; limit: number } {
  const pageRaw = Number(getParam(src, "page") ?? 1);
  const page = Number.isFinite(pageRaw) && pageRaw > 0 ? Math.floor(pageRaw) : 1;
  const pageSize = defaultPageSize;
  return { page, pageSize, offset: (page - 1) * pageSize, limit: pageSize };
}
