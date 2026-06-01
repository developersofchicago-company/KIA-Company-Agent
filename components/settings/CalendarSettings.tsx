"use client";

import { useEffect, useState } from "react";
import { Calendar, Check, Loader2, Plus, Trash2, X } from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { Badge } from "@/components/ui/badge";
import { createBrowserSupabase } from "@/lib/supabase";
import type { CalendarConnection, Department } from "@/lib/types";

interface Props {
  departments: Department[];
}

export function CalendarSettings({ departments }: Props) {
  const [connections, setConnections] = useState<CalendarConnection[]>([]);
  const [loading, setLoading] = useState(true);
  const [isAddOpen, setIsAddOpen] = useState(false);
  const supabase = createBrowserSupabase();

  // Form state
  const [departmentId, setDepartmentId] = useState<string>("__all__");
  const [calcomApiKey, setCalcomApiKey] = useState("");
  const [duration, setDuration] = useState(30);
  const [buffer, setBuffer] = useState(0);
  const [timezone, setTimezone] = useState("America/New_York");
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    loadConnections();
  }, []);

  async function loadConnections() {
    setLoading(true);
    const { data, error } = await supabase
      .from("calendar_connections")
      .select("*")
      .order("created_at", { ascending: false });

    if (error) {
      toast.error("Failed to load calendar connections");
    } else {
      setConnections(data || []);
    }
    setLoading(false);
  }

  async function handleAdd() {
    setSaving(true);

    try {
      if (!calcomApiKey.trim()) {
        toast.error("Cal.com API key is required");
        return;
      }

      // Validate the API key by fetching profile
      const profileRes = await fetch("https://api.cal.com/v2/me", {
        headers: { Authorization: `Bearer ${calcomApiKey}` },
      });

      if (!profileRes.ok) {
        toast.error("Invalid Cal.com API key. Please check and try again.");
        return;
      }

      const profile = await profileRes.json();

      const { data, error } = await supabase
        .from("calendar_connections")
        .insert({
          provider: "calcom",
          department_id: departmentId === "__all__" ? null : departmentId,
          calcom_api_key: calcomApiKey,
          provider_account_email: profile.data?.email || null,
          default_duration: duration,
          buffer_minutes: buffer,
          timezone,
        })
        .select()
        .single();

      if (error) throw error;

      toast.success("Cal.com connected successfully");
      setConnections([data as CalendarConnection, ...connections]);
      setIsAddOpen(false);
      resetForm();
    } catch (err) {
      toast.error((err as Error).message);
    } finally {
      setSaving(false);
    }
  }

  async function handleDelete(id: string) {
    if (!confirm("Remove this calendar connection?")) return;

    const { error } = await supabase
      .from("calendar_connections")
      .delete()
      .eq("id", id);

    if (error) {
      toast.error("Failed to remove connection");
    } else {
      toast.success("Calendar disconnected");
      setConnections(connections.filter((c) => c.id !== id));
    }
  }

  function resetForm() {
    setDepartmentId("__all__");
    setCalcomApiKey("");
    setDuration(30);
    setBuffer(0);
    setTimezone("America/New_York");
  }

  if (loading) {
    return (
      <Card>
        <CardHeader>
          <CardTitle className="text-base">Calendar Integration</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="flex items-center gap-2 text-sm text-muted-foreground">
            <Loader2 className="h-4 w-4 animate-spin" />
            Loading...
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <div className="space-y-4">
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <div>
              <CardTitle className="text-base">Calendar Integration</CardTitle>
              <CardDescription>
                Connect your Cal.com account so the AI can check availability and book appointments
              </CardDescription>
            </div>
            <Dialog open={isAddOpen} onOpenChange={setIsAddOpen}>
              <DialogTrigger asChild>
                <Button size="sm">
                  <Plus className="mr-2 h-4 w-4" />
                  Connect Cal.com
                </Button>
              </DialogTrigger>
              <DialogContent className="max-w-md">
                <DialogHeader>
                  <DialogTitle>Connect Cal.com</DialogTitle>
                  <DialogDescription>
                    Link your Cal.com account to enable AI-powered appointment scheduling.
                  </DialogDescription>
                </DialogHeader>

                <div className="space-y-4 py-4">
                  <div className="space-y-2">
                    <Label>Cal.com API Key</Label>
                    <Input
                      type="password"
                      placeholder="cal_live_..."
                      value={calcomApiKey}
                      onChange={(e) => setCalcomApiKey(e.target.value)}
                    />
                    <p className="text-xs text-muted-foreground">
                      Get this from your{" "}
                      <a
                        href="https://app.cal.com/settings/developer/api-keys"
                        target="_blank"
                        rel="noopener noreferrer"
                        className="underline"
                      >
                        Cal.com API settings
                      </a>
                    </p>
                  </div>

                  <div className="space-y-2">
                    <Label>Department (Optional)</Label>
                    <Select
                      value={departmentId}
                      onValueChange={setDepartmentId}
                    >
                      <SelectTrigger>
                        <SelectValue placeholder="All departments" />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="__all__">All departments</SelectItem>
                        {departments.map((d) => (
                          <SelectItem key={d.id} value={d.id}>
                            {d.name}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                    <p className="text-xs text-muted-foreground">
                      Link to a specific agent or leave empty for all
                    </p>
                  </div>

                  <div className="grid grid-cols-2 gap-4">
                    <div className="space-y-2">
                      <Label>Default Duration (min)</Label>
                      <Input
                        type="number"
                        value={duration}
                        onChange={(e) => setDuration(Number(e.target.value))}
                        min={15}
                        step={15}
                      />
                    </div>
                    <div className="space-y-2">
                      <Label>Buffer (min)</Label>
                      <Input
                        type="number"
                        value={buffer}
                        onChange={(e) => setBuffer(Number(e.target.value))}
                        min={0}
                        step={5}
                      />
                    </div>
                  </div>

                  <div className="space-y-2">
                    <Label>Timezone</Label>
                    <Select value={timezone} onValueChange={setTimezone}>
                      <SelectTrigger>
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="America/New_York">Eastern Time</SelectItem>
                        <SelectItem value="America/Chicago">Central Time</SelectItem>
                        <SelectItem value="America/Denver">Mountain Time</SelectItem>
                        <SelectItem value="America/Los_Angeles">Pacific Time</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                </div>

                <DialogFooter>
                  <Button variant="outline" onClick={() => setIsAddOpen(false)}>
                    Cancel
                  </Button>
                  <Button onClick={handleAdd} disabled={saving}>
                    {saving && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                    Connect
                  </Button>
                </DialogFooter>
              </DialogContent>
            </Dialog>
          </div>
        </CardHeader>
        <CardContent>
          {connections.length === 0 ? (
            <div className="rounded-lg border border-dashed p-6 text-center">
              <Calendar className="mx-auto h-8 w-8 text-muted-foreground" />
              <h3 className="mt-2 font-medium">No calendars connected</h3>
              <p className="text-sm text-muted-foreground">
                Connect your Cal.com account so the AI can schedule appointments with callers
              </p>
            </div>
          ) : (
            <div className="space-y-3">
              {connections.map((conn) => (
                <div
                  key={conn.id}
                  className="flex items-center justify-between rounded-lg border p-4"
                >
                  <div className="flex items-center gap-3">
                    <div className="flex h-10 w-10 items-center justify-center rounded-full bg-muted">
                      <span className="text-lg">📅</span>
                    </div>
                    <div>
                      <div className="flex items-center gap-2">
                        <p className="font-medium">Cal.com</p>
                        {conn.is_active ? (
                          <Badge variant="secondary" className="text-xs">
                            <Check className="mr-1 h-3 w-3" />
                            Active
                          </Badge>
                        ) : (
                          <Badge variant="outline" className="text-xs">
                            <X className="mr-1 h-3 w-3" />
                            Inactive
                          </Badge>
                        )}
                      </div>
                      <p className="text-sm text-muted-foreground">
                        {conn.provider_account_email || "Connected"}
                        {conn.department_id && (
                          <span className="ml-2">
                            •{" "}
                            {departments.find((d) => d.id === conn.department_id)?.name ||
                              "Unknown department"}
                          </span>
                        )}
                      </p>
                      <p className="text-xs text-muted-foreground">
                        {conn.default_duration} min appointments •{" "}
                        {conn.buffer_minutes} min buffer • {conn.timezone}
                      </p>
                    </div>
                  </div>
                  <div className="flex items-center gap-2">
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => handleDelete(conn.id)}
                    >
                      <Trash2 className="h-4 w-4 text-muted-foreground" />
                    </Button>
                  </div>
                </div>
              ))}
            </div>
          )}

          <div className="mt-6 rounded-lg border bg-muted/50 p-4">
            <h4 className="font-medium">How it works</h4>
            <ul className="mt-2 space-y-1 text-sm text-muted-foreground">
              <li>• AI asks callers for their preferred date and time</li>
              <li>• Checks your Cal.com availability in real-time</li>
              <li>• Books appointments automatically during the call</li>
              <li>• Saves appointments to your Cal.com calendar</li>
            </ul>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
