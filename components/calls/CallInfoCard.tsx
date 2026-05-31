import { Phone } from "lucide-react";

import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import {
  DepartmentBadge,
  DirectionBadge,
  StatusBadge,
} from "@/components/calls/CallBadges";
import {
  formatDuration,
  formatFullTimestamp,
  formatPhone,
  phoneFlag,
} from "@/lib/format";
import type { Call, Department } from "@/lib/types";

interface Props {
  call: Call;
  department: Department | null;
}

export function CallInfoCard({ call, department }: Props) {
  const confidence =
    typeof call.ai_confidence === "number"
      ? Math.max(0, Math.min(1, call.ai_confidence))
      : null;

  return (
    <Card>
      <CardHeader>
        <CardTitle className="text-base font-semibold text-dc-navy">
          Call info
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-4 text-sm">
        <InfoRow label="Caller">
          {call.caller_name ?? (
            <span className="text-muted-foreground">Unknown</span>
          )}
        </InfoRow>

        <InfoRow label="Phone">
          <a
            href={`tel:${call.phone_number}`}
            className="inline-flex items-center gap-1.5 font-mono text-dc-navy hover:text-dc-blue hover:underline"
          >
            <Phone className="h-3.5 w-3.5 text-muted-foreground" />
            <span aria-hidden="true">{phoneFlag(call.phone_number)}</span>
            {formatPhone(call.phone_number)}
          </a>
        </InfoRow>

        <InfoRow label="Direction">
          <DirectionBadge direction={call.direction} />
        </InfoRow>

        <InfoRow label="Status">
          <StatusBadge status={call.status} />
        </InfoRow>

        <InfoRow label="Department">
          <DepartmentBadge name={department?.name ?? call.department_selected} />
        </InfoRow>

        <InfoRow label="Language">
          {call.language_selected ? (
            <span className="capitalize">{call.language_selected}</span>
          ) : (
            <span className="text-muted-foreground">—</span>
          )}
        </InfoRow>

        <InfoRow label="Started">
          {formatFullTimestamp(call.started_at ?? call.created_at)}
        </InfoRow>

        <InfoRow label="Duration">{formatDuration(call.duration_seconds)}</InfoRow>

        <InfoRow label="AI confidence">
          {confidence != null ? (
            <div className="flex items-center gap-2">
              <div className="h-1.5 w-24 overflow-hidden rounded-full bg-muted">
                <div
                  className="h-full rounded-full bg-dc-blue"
                  style={{ width: `${Math.round(confidence * 100)}%` }}
                />
              </div>
              <span className="font-mono text-xs text-muted-foreground">
                {(confidence * 100).toFixed(0)}%
              </span>
            </div>
          ) : (
            <span className="text-muted-foreground">—</span>
          )}
        </InfoRow>

        {(call.tags?.length ?? 0) > 0 && (
          <InfoRow label="Tags">
            <div className="flex flex-wrap gap-1">
              {call.tags?.map((t) => (
                <Badge
                  key={t}
                  variant="secondary"
                  className="border-0 bg-muted text-xs"
                >
                  {t}
                </Badge>
              ))}
            </div>
          </InfoRow>
        )}
      </CardContent>
    </Card>
  );
}

function InfoRow({
  label,
  children,
}: {
  label: string;
  children: React.ReactNode;
}) {
  return (
    <div className="flex items-start justify-between gap-3">
      <dt className="shrink-0 text-xs font-medium uppercase tracking-wider text-muted-foreground">
        {label}
      </dt>
      <dd className="text-right text-sm">{children}</dd>
    </div>
  );
}
