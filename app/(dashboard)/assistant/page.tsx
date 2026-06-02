"use client";

import { useEffect, useState, useCallback } from "react";
import { toast } from "sonner";
import { Bot, Loader2, Save, MessageSquare, Settings2 } from "lucide-react";

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
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Switch } from "@/components/ui/switch";
import { Separator } from "@/components/ui/separator";
import type { VapiAssistant } from "@/lib/types";

// Supported models for the demo configuration
const MODEL_OPTIONS = [
  { value: "gpt-4o", label: "GPT-4o (Recommended)" },
  { value: "gpt-4o-mini", label: "GPT-4o-Mini (Fast & Cheap)" },
  { value: "gpt-3.5-turbo", label: "GPT-3.5 Turbo (Legacy)" },
];

// Supported languages for the transcriber
const LANGUAGE_OPTIONS = [
  { value: "en", label: "English" },
  { value: "ur", label: "Urdu" },
  { value: "en-US", label: "English (US)" },
  { value: "multi", label: "Multilingual" },
];

export default function AssistantPage() {
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);

  // Form states
  const [name, setName] = useState("");
  const [firstMessage, setFirstMessage] = useState("");
  const [systemPrompt, setSystemPrompt] = useState("");
  const [model, setModel] = useState("gpt-4o");
  const [temperature, setTemperature] = useState(0.7);
  const [language, setLanguage] = useState("en");
  const [recordingEnabled, setRecordingEnabled] = useState(true);

  // Fetch current assistant configuration
  const fetchAssistant = useCallback(async () => {
    setLoading(true);
    try {
      const res = await fetch("/api/vapi/assistant");
      if (!res.ok) {
        throw new Error("Failed to load assistant configuration");
      }
      const data: VapiAssistant = await res.json();

      // Populate form fields
      setName(data.name ?? "");
      setFirstMessage(data.firstMessage ?? "");
      setSystemPrompt(data.model?.systemPrompt ?? "");
      setModel(data.model?.model ?? "gpt-4o");
      setTemperature(data.model?.temperature ?? 0.7);
      setLanguage(data.transcriber?.language ?? "en");
      setRecordingEnabled(data.recordingEnabled ?? true);
    } catch (err) {
      toast.error((err as Error).message);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchAssistant();
  }, [fetchAssistant]);

  // Update assistant configuration
  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!name.trim()) return toast.error("Assistant name is required");
    setSaving(true);

    // Calendar tools for checking availability and booking
    const calendarTools = [
      {
        type: "function",
        function: {
          name: "list_services",
          description: "List all available appointment services/types from the connected Cal.com calendar. Call this first when the caller wants to book, so they can choose which service they need.",
          parameters: {
            type: "object",
            properties: {},
            required: [],
          },
        },
      },
      {
        type: "function",
        function: {
          name: "check_availability",
          description: "Check available appointment slots for a specific service from the connected Cal.com calendar. Call this after the caller has chosen a service from list_services.",
          parameters: {
            type: "object",
            properties: {
              service_name: {
                type: "string",
                description: "The exact service name the caller chose (e.g., 'Discovery Call' or 'Security Consultation for Vibe Coded Apps')",
              },
              days: {
                type: "number",
                description: "Number of days to look ahead for availability (default 7, max 30)",
                default: 7,
              },
            },
            required: ["service_name"],
          },
        },
      },
      {
        type: "function",
        function: {
          name: "book_appointment",
          description: "Book an appointment on the Cal.com calendar. Only call this after the caller has confirmed a specific time slot from the availability results.",
          parameters: {
            type: "object",
            properties: {
              start_time: {
                type: "string",
                description: "Exact ISO 8601 datetime of the chosen slot (from check_availability results)",
              },
              service_name: {
                type: "string",
                description: "The service name they selected (e.g., 'Discovery Call')",
              },
              name: {
                type: "string",
                description: "Full name of the person booking",
              },
              email: {
                type: "string",
                description: "Email address of the person booking",
              },
              phone: {
                type: "string",
                description: "Phone number of the person booking",
              },
            },
            required: ["start_time", "service_name", "name", "email"],
          },
        },
      },
    ];

    // Merge changes into nested format expected by Vapi
    const updatePayload = {
      name: name.trim(),
      firstMessage: firstMessage.trim(),
      recordingEnabled,
      model: {
        provider: "openai",
        model,
        temperature,
        systemPrompt: systemPrompt.trim(),
      },
      transcriber: {
        provider: "deepgram",
        language,
        model: "nova-2",
      },
      tools: calendarTools,
    };

    try {
      const res = await fetch("/api/vapi/assistant", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(updatePayload),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error ?? "Failed to save settings");
      toast.success("Assistant configuration updated successfully");
    } catch (err) {
      toast.error((err as Error).message);
    } finally {
      setSaving(false);
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center py-20">
        <Loader2 className="h-8 w-8 animate-spin text-dc-blue" />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-bold tracking-tight text-dc-navy flex items-center gap-2">
          <Bot className="h-8 w-8 text-dc-blue" /> Assistant Config
        </h1>
        <p className="mt-1 text-sm text-muted-foreground">
          Configure the core behavior, prompt, model, and properties of the AI Voice Assistant.
        </p>
      </div>

      <form onSubmit={handleSave} className="grid gap-6 lg:grid-cols-3">
        {/* Left Column: Prompt & Messaging */}
        <div className="lg:col-span-2 space-y-6">
          <Card className="border-border/60 shadow-lg shadow-dc-navy/5">
            <CardHeader className="pb-3 flex flex-row items-center gap-3">
              <MessageSquare className="h-5 w-5 text-dc-blue shrink-0" />
              <div>
                <CardTitle className="text-lg text-dc-navy">System Instructions</CardTitle>
                <CardDescription>
                  Define the personality, goals, and logic of the voice agent.
                </CardDescription>
              </div>
            </CardHeader>
            <Separator />
            <CardContent className="space-y-4 pt-4">
              <div className="space-y-1">
                <Label htmlFor="assistant-name">Assistant UI Name</Label>
                <Input
                  id="assistant-name"
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  placeholder="e.g. DC AI Receptionist"
                />
              </div>

              <div className="space-y-1">
                <Label htmlFor="first-message">Greeting Message</Label>
                <Textarea
                  id="first-message"
                  value={firstMessage}
                  onChange={(e) => setFirstMessage(e.target.value)}
                  placeholder="Assalam-o-Alaikum! Welcome to Developers of Chicago. How can I help you today?"
                  rows={2}
                />
              </div>

              <div className="space-y-1">
                <Label htmlFor="system-prompt">System Prompt</Label>
                <Textarea
                  id="system-prompt"
                  value={systemPrompt}
                  onChange={(e) => setSystemPrompt(e.target.value)}
                  placeholder="Describe role, constraints, Urdu-English routing, etc..."
                  rows={12}
                  className="font-mono text-sm leading-relaxed"
                />
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Right Column: Model & Performance Settings */}
        <div className="space-y-6">
          <Card className="border-border/60 shadow-lg shadow-dc-navy/5">
            <CardHeader className="pb-3 flex flex-row items-center gap-3">
              <Settings2 className="h-5 w-5 text-dc-blue shrink-0" />
              <div>
                <CardTitle className="text-lg text-dc-navy">LLM & Audio Settings</CardTitle>
                <CardDescription>
                  Configure LLM engines, temperatures, and audio features.
                </CardDescription>
              </div>
            </CardHeader>
            <Separator />
            <CardContent className="space-y-5 pt-4">
              <div className="space-y-1">
                <Label>Model Engine</Label>
                <Select value={model} onValueChange={setModel}>
                  <SelectTrigger>
                    <SelectValue placeholder="Select model" />
                  </SelectTrigger>
                  <SelectContent>
                    {MODEL_OPTIONS.map((opt) => (
                      <SelectItem key={opt.value} value={opt.value}>
                        {opt.label}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              <div className="space-y-2">
                <div className="flex items-center justify-between">
                  <Label htmlFor="temperature">Temperature ({temperature})</Label>
                </div>
                <input
                  id="temperature"
                  type="range"
                  min="0"
                  max="1"
                  step="0.05"
                  value={temperature}
                  onChange={(e) => setTemperature(parseFloat(e.target.value))}
                  className="w-full h-2 bg-secondary rounded-lg appearance-none cursor-pointer accent-dc-blue"
                />
                <p className="text-xs text-muted-foreground">
                  Lower values make responses more predictable; higher values make them creative.
                </p>
              </div>

              <div className="space-y-1">
                <Label>Speech Transcriber Language</Label>
                <Select value={language} onValueChange={setLanguage}>
                  <SelectTrigger>
                    <SelectValue placeholder="Select language" />
                  </SelectTrigger>
                  <SelectContent>
                    {LANGUAGE_OPTIONS.map((opt) => (
                      <SelectItem key={opt.value} value={opt.value}>
                        {opt.label}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              <Separator />

              <div className="flex items-center justify-between pt-2">
                <div className="space-y-0.5">
                  <Label htmlFor="recording-enabled">Enable Recordings</Label>
                  <p className="text-xs text-muted-foreground">
                    Record audio of calls for review in the logs.
                  </p>
                </div>
                <Switch
                  id="recording-enabled"
                  checked={recordingEnabled}
                  onCheckedChange={setRecordingEnabled}
                />
              </div>
            </CardContent>
          </Card>

          <Button
            type="submit"
            disabled={saving}
            className="w-full bg-dc-blue text-white hover:bg-dc-blue-dark py-6 text-base"
          >
            {saving ? (
              <>
                <Loader2 className="mr-2 h-5 w-5 animate-spin" /> Updating Assistant...
              </>
            ) : (
              <>
                <Save className="mr-2 h-5 w-5" /> Save Configuration
              </>
            )}
          </Button>
        </div>
      </form>
    </div>
  );
}
