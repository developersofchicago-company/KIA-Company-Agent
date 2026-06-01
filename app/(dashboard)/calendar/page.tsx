"use client";

import { useEffect, useState, useCallback } from "react";
import Link from "next/link";
import { toast } from "sonner";
import {
  CalendarDays,
  Clock,
  ExternalLink,
  Loader2,
  Plus,
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
import { createBrowserSupabase } from "@/lib/supabase";

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
  const [hasConnection, setHasConnection] = useState<boolean | null>(null);
  const [profile, setProfile] = useState<CalProfile | null>(null);
  const [eventTypes, setEventTypes] = useState<CalEventType[]>([]);
  const [slots, setSlots] = useState<Record<string, CalSlot[]>>({});
  const [loading, setLoading] = useState(true);
  const [loadingSlots, setLoadingSlots] = useState(false);
  const supabase = createBrowserSupabase();

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

  // Check if calendar is connected
  const checkConnection = useCallback(async () => {
    setLoading(true);
    try {
      const {
        data: { user },
        error: userErr,
      } = await supabase.auth.getUser();
      if (userErr || !user) {
        setHasConnection(false);
        return;
      }

      const { data, error } = await supabase
        .from("calendar_connections")
        .select("id")
        .eq("connected_by", user.id)
        .eq("provider", "calcom")
        .eq("is_active", true)
        .limit(1);

      if (error) {
        console.error("[calendar] connection check failed:", error);
        setHasConnection(false);
        return;
      }

      const connected = (data ?? []).length > 0;
      setHasConnection(connected);

      if (connected) {
        // Fetch profile and slots separately so errors don't reset hasConnection
        try {
          await fetchProfile();
        } catch (profileErr) {
          console.error("[calendar] profile fetch failed:", profileErr);
          toast.error("Failed to load Cal.com profile");
        }
        try {
          await fetchSlots();
        } catch (slotsErr) {
          console.error("[calendar] slots fetch failed:", slotsErr);
          toast.error("Failed to load available slots");
        }
      }
    } catch (err) {
      console.error("[calendar] connection check error:", err);
      setHasConnection(false);
    } finally {
      setLoading(false);
    }
  }, [fetchProfile, fetchSlots, supabase]);

  useEffect(() => {
    checkConnection();
  }, [checkConnection]);

  // Refresh when page becomes visible (user comes back from settings)
  useEffect(() => {
    function handleVisibilityChange() {
      if (document.visibilityState === "visible") {
        checkConnection();
      }
    }
    document.addEventListener("visibilitychange", handleVisibilityChange);
    return () => document.removeEventListener("visibilitychange", handleVisibilityChange);
  }, [checkConnection]);

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

      {loading || hasConnection === null ? (
        <div className="flex items-center justify-center py-20">
          <Loader2 className="h-8 w-8 animate-spin text-dc-blue" />
        </div>
      ) : !hasConnection ? (
        <Card className="border-border/60">
          <CardContent className="flex flex-col items-center justify-center py-16 text-center">
            <div className="flex h-16 w-16 items-center justify-center rounded-full bg-muted mb-4">
              <CalendarDays className="h-8 w-8 text-muted-foreground" />
            </div>
            <h3 className="text-lg font-semibold text-dc-navy">
              No Calendar Connected
            </h3>
            <p className="mt-2 max-w-sm text-sm text-muted-foreground">
              Connect your Cal.com account so the AI assistant can check availability and book appointments with callers.
            </p>
            <div className="mt-6 flex gap-3">
              <Link href="/settings">
                <Button>
                  <Plus className="mr-2 h-4 w-4" />
                  Connect Calendar
                </Button>
              </Link>
              <Button variant="outline" onClick={checkConnection}>
                <Loader2 className="mr-2 h-4 w-4" />
                Refresh
              </Button>
            </div>
          </CardContent>
        </Card>
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
