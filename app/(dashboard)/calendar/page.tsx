"use client";

import { useEffect, useState, useCallback } from "react";
import { toast } from "sonner";
import {
  CalendarDays,
  Clock,
  ExternalLink,
  Loader2,
  User,
  Video,
} from "lucide-react";

import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Separator } from "@/components/ui/separator";

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

interface CalSlot {
  time: string;
}

interface CalEventType {
  id: number;
  title: string;
  slug: string;
  lengthInMinutes: number;
  description: string | null;
  bookingUrl: string;
}

interface CalProfile {
  id: number;
  name: string;
  email: string;
  username: string;
  timeZone: string;
  avatarUrl: string;
}

// ---------------------------------------------------------------------------
// Slot Badge
// ---------------------------------------------------------------------------

function SlotBadge({ time }: { time: string }) {
  const d = new Date(time);
  return (
    <span className="inline-flex items-center gap-1 rounded-md bg-dc-blue/10 px-2.5 py-1 text-xs font-medium text-dc-blue">
      <Clock className="h-3 w-3" />
      {d.toLocaleTimeString("en-US", {
        hour: "numeric",
        minute: "2-digit",
        timeZone: "America/Chicago",
      })}
    </span>
  );
}

// ---------------------------------------------------------------------------
// Page
// ---------------------------------------------------------------------------

export default function CalendarPage() {
  const [profile, setProfile] = useState<CalProfile | null>(null);
  const [eventTypes, setEventTypes] = useState<CalEventType[]>([]);
  const [slots, setSlots] = useState<Record<string, CalSlot[]>>({});
  const [loading, setLoading] = useState(true);
  const [loadingSlots, setLoadingSlots] = useState(false);

  const fetchProfile = useCallback(async () => {
    setLoading(true);
    try {
      const res = await fetch("/api/cal");
      if (!res.ok) throw new Error("Failed to load Cal.com data");
      const data = await res.json();
      setProfile(data.profile);
      setEventTypes(data.eventTypes);
    } catch (err) {
      toast.error((err as Error).message);
    } finally {
      setLoading(false);
    }
  }, []);

  const fetchSlots = useCallback(async () => {
    setLoadingSlots(true);
    try {
      const now = new Date();
      const end = new Date(now.getTime() + 7 * 24 * 60 * 60 * 1000);
      const res = await fetch("/api/cal", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          startTime: now.toISOString(),
          endTime: end.toISOString(),
        }),
      });
      if (!res.ok) throw new Error("Failed to load slots");
      const data = await res.json();
      setSlots(data.slots);
    } catch (err) {
      toast.error((err as Error).message);
    } finally {
      setLoadingSlots(false);
    }
  }, []);

  useEffect(() => {
    fetchProfile();
    fetchSlots();
  }, [fetchProfile, fetchSlots]);

  const totalSlots = Object.values(slots).reduce(
    (sum, daySlots) => sum + daySlots.length,
    0,
  );

  return (
    <div className="space-y-6">
      <header>
        <h1 className="text-3xl font-bold tracking-tight text-dc-navy">
          Calendar
        </h1>
        <p className="mt-1 text-sm text-muted-foreground">
          Cal.com integration — the AI assistant checks this availability during calls.
        </p>
      </header>

      {loading ? (
        <div className="flex items-center justify-center py-20">
          <Loader2 className="h-8 w-8 animate-spin text-dc-blue" />
        </div>
      ) : (
        <>
          {/* Profile + Stats */}
          <div className="grid gap-4 sm:grid-cols-3">
            <Card className="border-border/60">
              <CardHeader className="pb-2">
                <CardDescription>Connected Account</CardDescription>
                <CardTitle className="text-lg text-dc-navy flex items-center gap-2">
                  <User className="h-5 w-5 text-dc-blue" />
                  {profile?.name ?? "Not connected"}
                </CardTitle>
              </CardHeader>
              <CardContent>
                <p className="text-sm text-muted-foreground">{profile?.email}</p>
                <p className="text-xs text-muted-foreground mt-1">
                  Timezone: {profile?.timeZone}
                </p>
              </CardContent>
            </Card>

            <Card className="border-border/60">
              <CardHeader className="pb-2">
                <CardDescription>Event Types</CardDescription>
                <CardTitle className="text-lg text-dc-navy flex items-center gap-2">
                  <Video className="h-5 w-5 text-dc-blue" />
                  {eventTypes.length}
                </CardTitle>
              </CardHeader>
              <CardContent>
                <p className="text-sm text-muted-foreground">
                  Active booking types configured
                </p>
              </CardContent>
            </Card>

            <Card className="border-border/60">
              <CardHeader className="pb-2">
                <CardDescription>Available This Week</CardDescription>
                <CardTitle className="text-lg text-dc-navy flex items-center gap-2">
                  <CalendarDays className="h-5 w-5 text-dc-blue" />
                  {loadingSlots ? (
                    <Loader2 className="h-4 w-4 animate-spin" />
                  ) : (
                    totalSlots
                  )}
                </CardTitle>
              </CardHeader>
              <CardContent>
                <p className="text-sm text-muted-foreground">
                  Open appointment slots
                </p>
              </CardContent>
            </Card>
          </div>

          {/* Event Types */}
          <Card className="border-border/60">
            <CardHeader>
              <CardTitle className="text-lg text-dc-navy">
                Event Types
              </CardTitle>
              <CardDescription>
                These are the appointment types the AI assistant can book.
              </CardDescription>
            </CardHeader>
            <Separator />
            <CardContent className="pt-4">
              {eventTypes.length === 0 ? (
                <p className="text-sm text-muted-foreground py-4 text-center">
                  No event types found. Create one in Cal.com.
                </p>
              ) : (
                <div className="space-y-3">
                  {eventTypes.map((et) => (
                    <div
                      key={et.id}
                      className="flex items-center justify-between rounded-lg border border-border/60 p-4"
                    >
                      <div>
                        <p className="font-medium text-dc-navy">{et.title}</p>
                        <p className="text-sm text-muted-foreground">
                          {et.lengthInMinutes} minutes
                        </p>
                      </div>
                      <a
                        href={et.bookingUrl}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="text-dc-blue hover:text-dc-blue-dark"
                      >
                        <ExternalLink className="h-4 w-4" />
                      </a>
                    </div>
                  ))}
                </div>
              )}
            </CardContent>
          </Card>

          {/* Available Slots */}
          <Card className="border-border/60">
            <CardHeader className="flex flex-row items-center justify-between">
              <div>
                <CardTitle className="text-lg text-dc-navy">
                  Available Slots — Next 7 Days
                </CardTitle>
                <CardDescription>
                  The AI assistant will offer these times to callers.
                </CardDescription>
              </div>
              <Button
                variant="outline"
                size="sm"
                onClick={fetchSlots}
                disabled={loadingSlots}
              >
                {loadingSlots ? (
                  <Loader2 className="h-4 w-4 animate-spin" />
                ) : (
                  "Refresh"
                )}
              </Button>
            </CardHeader>
            <Separator />
            <CardContent className="pt-4">
              {loadingSlots ? (
                <div className="flex justify-center py-8">
                  <Loader2 className="h-6 w-6 animate-spin text-dc-blue" />
                </div>
              ) : Object.keys(slots).length === 0 ? (
                <p className="text-sm text-muted-foreground py-4 text-center">
                  No available slots found.
                </p>
              ) : (
                <div className="space-y-4">
                  {Object.entries(slots).map(([date, daySlots]) => {
                    const d = new Date(date + "T00:00:00");
                    return (
                      <div key={date}>
                        <p className="text-sm font-semibold text-dc-navy mb-2">
                          {d.toLocaleDateString("en-US", {
                            weekday: "long",
                            month: "long",
                            day: "numeric",
                          })}
                        </p>
                        <div className="flex flex-wrap gap-2">
                          {daySlots.map((slot) => (
                            <SlotBadge key={slot.time} time={slot.time} />
                          ))}
                        </div>
                      </div>
                    );
                  })}
                </div>
              )}
            </CardContent>
          </Card>
        </>
      )}
    </div>
  );
}
