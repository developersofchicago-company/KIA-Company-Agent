"use client";

import { useEffect, useState, useCallback } from "react";
import { toast } from "sonner";
import { Loader2, Save, MessageSquare, Clock, MoonStar } from "lucide-react";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Separator } from "@/components/ui/separator";

interface SettingRow {
  id: string;
  key: string;
  value: Record<string, string> | null;
  updated_at: string;
}

const META: Record<
  string,
  { label: string; description: string; icon: typeof Clock; multiline?: boolean }
> = {
  ivr_greeting: {
    label: "IVR Greeting",
    description: "The first thing callers hear when they connect.",
    icon: MessageSquare,
    multiline: true,
  },
  business_hours_default: {
    label: "Business Hours",
    description: "Default office hours and timezone used by the assistant.",
    icon: Clock,
  },
  after_hours_message: {
    label: "After-Hours Message",
    description: "Played when callers reach the line outside business hours.",
    icon: MoonStar,
    multiline: true,
  },
};

function SettingCard({
  setting,
  onSaved,
}: {
  setting: SettingRow;
  onSaved: () => void;
}) {
  const meta = META[setting.key];
  const Icon = meta?.icon ?? MessageSquare;
  const [fields, setFields] = useState<Record<string, string>>(
    (setting.value as Record<string, string>) ?? {},
  );
  const [saving, setSaving] = useState(false);

  const handleSave = async () => {
    setSaving(true);
    try {
      const res = await fetch("/api/settings", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ key: setting.key, value: fields }),
      });
      if (!res.ok) {
        const d = await res.json();
        throw new Error(d.error ?? "Save failed");
      }
      toast.success(`${meta?.label ?? setting.key} updated`);
      onSaved();
    } catch (err) {
      toast.error((err as Error).message);
    } finally {
      setSaving(false);
    }
  };

  return (
    <Card className="border-border/60">
      <CardHeader className="pb-3">
        <CardTitle className="flex items-center gap-2 text-lg text-dc-navy">
          <Icon className="h-5 w-5 text-dc-blue" />
          {meta?.label ?? setting.key}
        </CardTitle>
        {meta?.description && (
          <CardDescription>{meta.description}</CardDescription>
        )}
      </CardHeader>
      <Separator />
      <CardContent className="space-y-4 pt-4">
        {Object.entries(fields).map(([k, v]) => (
          <div key={k} className="space-y-1">
            <Label htmlFor={`${setting.key}-${k}`} className="capitalize">
              {k.replace(/_/g, " ")}
            </Label>
            {meta?.multiline ? (
              <Textarea
                id={`${setting.key}-${k}`}
                value={v}
                rows={2}
                onChange={(e) =>
                  setFields((p) => ({ ...p, [k]: e.target.value }))
                }
              />
            ) : (
              <Input
                id={`${setting.key}-${k}`}
                value={v}
                onChange={(e) =>
                  setFields((p) => ({ ...p, [k]: e.target.value }))
                }
              />
            )}
          </div>
        ))}
        <Button
          onClick={handleSave}
          disabled={saving}
          size="sm"
          className="bg-dc-blue text-white hover:bg-dc-blue-dark"
        >
          {saving ? (
            <Loader2 className="mr-2 h-4 w-4 animate-spin" />
          ) : (
            <Save className="mr-2 h-4 w-4" />
          )}
          Save
        </Button>
      </CardContent>
    </Card>
  );
}

export function SystemSettings() {
  const [settings, setSettings] = useState<SettingRow[]>([]);
  const [loading, setLoading] = useState(true);

  const fetchAll = useCallback(async () => {
    setLoading(true);
    try {
      const res = await fetch("/api/settings");
      if (res.ok) setSettings(await res.json());
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchAll();
  }, [fetchAll]);

  return (
    <section className="space-y-4">
      <div>
        <h2 className="text-xl font-semibold text-dc-navy">
          Assistant Messages & Hours
        </h2>
        <p className="text-sm text-muted-foreground">
          Control the greeting, business hours, and after-hours message.
        </p>
      </div>

      {loading ? (
        <div className="flex items-center justify-center py-12">
          <Loader2 className="h-6 w-6 animate-spin text-dc-blue" />
        </div>
      ) : settings.length === 0 ? (
        <Card className="py-10 text-center">
          <p className="text-sm text-muted-foreground">
            No settings found. Run the seed SQL to populate defaults.
          </p>
        </Card>
      ) : (
        <div className="grid gap-4 lg:grid-cols-2">
          {settings.map((s) => (
            <SettingCard key={s.id} setting={s} onSaved={fetchAll} />
          ))}
        </div>
      )}
    </section>
  );
}
