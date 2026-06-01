import Link from "next/link";
import { notFound } from "next/navigation";
import { ArrowLeft } from "lucide-react";

import { createServerSupabase } from "@/lib/supabase-server";
import { getCallerHistory } from "@/lib/db";
import { getCall as getVapiCall } from "@/lib/vapi";
import {
  formatFullTimestamp,
  formatPhone,
  phoneFlag,
} from "@/lib/format";
import { Button } from "@/components/ui/button";
import {
  DirectionBadge,
  StatusBadge,
} from "@/components/calls/CallBadges";
import { CallAudioPlayer } from "@/components/calls/CallAudioPlayer";
import { CallTranscriptView } from "@/components/calls/CallTranscriptView";
import { CallInfoCard } from "@/components/calls/CallInfoCard";
import { CallActions } from "@/components/calls/CallActions";
import { CallerHistoryCard } from "@/components/calls/CallerHistoryCard";
import type { Call, Department } from "@/lib/types";

export const dynamic = "force-dynamic";

interface PageProps {
  params: { id: string };
}

export default async function CallDetailPage({ params }: PageProps) {
  const supabase = createServerSupabase();

  const { data: callRow, error } = await supabase
    .from("calls")
    .select("*")
    .eq("id", params.id)
    .maybeSingle();

  if (error) throw error;
  if (!callRow) notFound();

  const call = callRow as Call;

  const [{ data: deptRow }, history, vapiCall] = await Promise.all([
    call.department_id
      ? supabase
          .from("departments")
          .select("*")
          .eq("id", call.department_id)
          .maybeSingle()
      : Promise.resolve({ data: null }),
    getCallerHistory(supabase, call.phone_number, call.id, 8),
    call.vapi_call_id
      ? getVapiCall(call.vapi_call_id).catch(() => null)
      : Promise.resolve(null),
  ]);
  const department = (deptRow as Department | null) ?? null;

  // Merge: prefer Vapi data for recording URL and summary if not in Supabase
  const recordingUrl = call.recording_url ?? vapiCall?.recordingUrl ?? null;
  const transcript = call.transcript ?? vapiCall?.transcript ?? null;

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="space-y-3">
        <Button
          asChild
          variant="ghost"
          size="sm"
          className="-ml-2 h-8 gap-1 text-muted-foreground hover:text-dc-navy"
        >
          <Link href="/calls">
            <ArrowLeft className="h-4 w-4" />
            All calls
          </Link>
        </Button>

        <div className="flex flex-wrap items-center justify-between gap-3">
          <div>
            <h1 className="text-2xl font-bold tracking-tight text-dc-navy">
              <span className="mr-2" aria-hidden="true">
                {phoneFlag(call.phone_number)}
              </span>
              {formatPhone(call.phone_number)}
            </h1>
            <p className="mt-1 text-sm text-muted-foreground">
              {formatFullTimestamp(call.started_at ?? call.created_at)}
            </p>
          </div>
          <div className="flex items-center gap-2">
            <DirectionBadge direction={call.direction} />
            <StatusBadge status={call.status} />
          </div>
        </div>
      </div>

      {/* Two-column grid */}
      <div className="grid grid-cols-1 gap-6 lg:grid-cols-5">
        <div className="space-y-6 lg:col-span-3">
          <CallAudioPlayer
            src={recordingUrl}
            fallbackDurationSeconds={call.duration_seconds ?? null}
          />
          <CallTranscriptView
            transcript={transcript}
            status={call.status}
          />
        </div>

        <div className="space-y-6 lg:col-span-2">
          <CallInfoCard call={call} department={department} vapiCall={vapiCall} />
          <CallActions call={call} />
          <CallerHistoryCard calls={history} />
        </div>
      </div>
    </div>
  );
}
