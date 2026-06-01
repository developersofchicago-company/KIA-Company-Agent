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
      const {
        data: { user },
        error: userErr,
      } = await supabase.auth.getUser();
      if (userErr || !user) {
        toast.error("You must be logged in to connect Cal.com");
        return;
      }

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
          connected_by: user.id,
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
      <h3 className="text-lg font-medium text-dc-navy">Calendar Integrations</h3>
      
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
        <Card className="flex flex-col">
          <CardHeader className="pb-4">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-3">
                <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-muted text-xl">
                  📅
                </div>
                <div>
                  <CardTitle className="text-base">Cal.com</CardTitle>
                </div>
              </div>
            </div>
            <CardDescription className="mt-3">
              Enable AI scheduling using your Cal.com event types and availability.
            </CardDescription>
          </CardHeader>

          <CardContent className="mt-auto flex flex-col gap-4">
            {connections.length > 0 ? (
              <div className="space-y-4">
                <div className="text-sm text-muted-foreground">
                  <p className="truncate font-medium text-dc-navy">
                    {connections[0].provider_account_email || "Connected"}
                  </p>
                  <p className="mt-1 flex items-center gap-1 text-xs">
                    <span className="inline-block h-1.5 w-1.5 rounded-full bg-green-500" />
                    Active connection
                  </p>
                </div>
                
                <Button
                  variant="outline"
                  className="w-full justify-between hover:bg-destructive/10 hover:text-destructive group transition-colors"
                  onClick={() => handleDelete(connections[0].id)}
                >
                  <span className="flex items-center gap-2">
                    <Check className="h-4 w-4 text-green-500 group-hover:hidden" />
                    <Trash2 className="h-4 w-4 hidden group-hover:block" />
                    <span className="group-hover:hidden">Connected</span>
                    <span className="hidden group-hover:inline">Disconnect</span>
                  </span>
                </Button>
              </div>
            ) : (
              <Dialog open={isAddOpen} onOpenChange={setIsAddOpen}>
                <DialogTrigger asChild>
                  <Button className="w-full">
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
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
