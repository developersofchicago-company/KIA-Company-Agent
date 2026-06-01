"use client";

import { useEffect, useState, useCallback } from "react";
import { toast } from "sonner";
import { Loader2, Save, Bot } from "lucide-react";

import { Button } from "@/components/ui/button";
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

export function AgentSettings() {
  const [name, setName] = useState("");
  const [firstMessage, setFirstMessage] = useState("");
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [available, setAvailable] = useState(true);

  const fetchAssistant = useCallback(async () => {
    setLoading(true);
    try {
      const res = await fetch("/api/vapi/assistant");
      if (!res.ok) {
        setAvailable(false);
        return;
      }
      const a = await res.json();
      setName(a.name ?? "");
      setFirstMessage(a.firstMessage ?? "");
    } catch {
      setAvailable(false);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchAssistant();
  }, [fetchAssistant]);

  const handleSave = async () => {
    setSaving(true);
    try {
      const res = await fetch("/api/vapi/assistant", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ firstMessage }),
      });
      if (!res.ok) {
        const d = await res.json().catch(() => ({}));
        throw new Error(d.error ?? "Save failed");
      }
      toast.success("Agent greeting updated");
    } catch (err) {
      toast.error((err as Error).message);
    } finally {
      setSaving(false);
    }
  };

  return (
    <section className="space-y-4">
      <div>
        <h2 className="text-xl font-semibold text-dc-navy">AI Agent</h2>
        <p className="text-sm text-muted-foreground">
          Edit the AI receptionist&apos;s opening greeting.
        </p>
      </div>

      <Card className="border-border/60">
        <CardHeader className="pb-3">
          <CardTitle className="flex items-center gap-2 text-lg text-dc-navy">
            <Bot className="h-5 w-5 text-dc-blue" />
            {loading ? "Loading…" : name || "Assistant"}
          </CardTitle>
          <CardDescription>
            This is the first line the agent says when a call connects.
          </CardDescription>
        </CardHeader>
        <Separator />
        <CardContent className="space-y-4 pt-4">
          {loading ? (
            <div className="flex items-center justify-center py-8">
              <Loader2 className="h-6 w-6 animate-spin text-dc-blue" />
            </div>
          ) : !available ? (
            <p className="text-sm text-muted-foreground">
              Could not load the assistant. Make sure VAPI_ASSISTANT_ID is set.
            </p>
          ) : (
            <>
              <div className="space-y-1">
                <Label htmlFor="first-message">Greeting (first message)</Label>
                <Textarea
                  id="first-message"
                  rows={3}
                  value={firstMessage}
                  onChange={(e) => setFirstMessage(e.target.value)}
                  placeholder="Hello, this is Zoe from..."
                />
              </div>
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
                Save Greeting
              </Button>
            </>
          )}
        </CardContent>
      </Card>
    </section>
  );
}
