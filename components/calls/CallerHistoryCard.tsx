import Link from "next/link";
import { ChevronRight } from "lucide-react";

import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { StatusBadge } from "@/components/calls/CallBadges";
import {
  formatDuration,
  formatRelativeTime,
} from "@/lib/format";
import type { Call } from "@/lib/types";

interface Props {
  calls: Call[];
}

export function CallerHistoryCard({ calls }: Props) {
  return (
    <Card>
      <CardHeader>
        <CardTitle className="text-base font-semibold text-dc-navy">
          Caller history
        </CardTitle>
      </CardHeader>
      <CardContent>
        {calls.length === 0 ? (
          <p className="text-sm text-muted-foreground">
            No other calls from this number.
          </p>
        ) : (
          <ul className="divide-y divide-border">
            {calls.map((c) => (
              <li key={c.id}>
                <Link
                  href={`/calls/${c.id}`}
                  className="-mx-2 flex items-center justify-between gap-3 rounded-md px-2 py-2 hover:bg-dc-blue/5"
                >
                  <div className="min-w-0">
                    <p className="truncate text-sm font-medium text-dc-navy">
                      {formatRelativeTime(c.created_at)}
                    </p>
                    <p className="text-xs text-muted-foreground">
                      {formatDuration(c.duration_seconds)}
                      {c.department_selected ? ` · ${c.department_selected}` : ""}
                    </p>
                  </div>
                  <div className="flex items-center gap-2">
                    <StatusBadge status={c.status} />
                    <ChevronRight className="h-4 w-4 text-muted-foreground" />
                  </div>
                </Link>
              </li>
            ))}
          </ul>
        )}
      </CardContent>
    </Card>
  );
}
