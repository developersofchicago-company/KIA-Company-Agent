"use client";

import { useEffect, useState } from "react";
import { toast } from "sonner";
import { Loader2 } from "lucide-react";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import type { Department } from "@/lib/types";

interface DepartmentDialogProps {
  open: boolean;
  department?: Department | null;
  onClose: () => void;
  onSaved: (department: Department) => void;
}

const EMPTY_FORM = {
  name: "",
  phone_numbers: "",
  hours_start: "",
  hours_end: "",
  languages: "urdu, english",
  routing_keywords: "",
  is_active: true,
};

export function DepartmentDialog({ open, department, onClose, onSaved }: DepartmentDialogProps) {
  const [form, setForm] = useState(EMPTY_FORM);
  const [saving, setSaving] = useState(false);
  const isEditing = !!department;

  useEffect(() => {
    if (department) {
      setForm({
        name: department.name,
        phone_numbers: department.phone_numbers?.join(", ") ?? "",
        hours_start: department.hours_start ?? "",
        hours_end: department.hours_end ?? "",
        languages: department.languages?.join(", ") ?? "urdu, english",
        routing_keywords: department.routing_keywords?.join(", ") ?? "",
        is_active: department.is_active,
      });
    } else {
      setForm(EMPTY_FORM);
    }
  }, [department, open]);

  const set = (key: keyof typeof EMPTY_FORM, value: string | boolean) =>
    setForm((prev) => ({ ...prev, [key]: value }));

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!form.name.trim()) return toast.error("Name is required");
    setSaving(true);

    const body = {
      name: form.name.trim(),
      phone_numbers: form.phone_numbers ? form.phone_numbers.split(",").map((s) => s.trim()).filter(Boolean) : [],
      hours_start: form.hours_start || null,
      hours_end: form.hours_end || null,
      languages: form.languages ? form.languages.split(",").map((s) => s.trim().toLowerCase()).filter(Boolean) : ["urdu", "english"],
      routing_keywords: form.routing_keywords ? form.routing_keywords.split(",").map((s) => s.trim()).filter(Boolean) : [],
      is_active: form.is_active,
    };

    try {
      const res = await fetch(
        isEditing ? `/api/departments/${department!.id}` : "/api/departments",
        {
          method: isEditing ? "PATCH" : "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(body),
        }
      );
      const data = await res.json();
      if (!res.ok) throw new Error(data.error ?? "Failed to save");
      toast.success(isEditing ? "Department updated" : "Department created");
      onSaved(data as Department);
      onClose();
    } catch (err) {
      toast.error((err as Error).message);
    } finally {
      setSaving(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={(v) => !v && onClose()}>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle>{isEditing ? "Edit Department" : "Add Department"}</DialogTitle>
        </DialogHeader>

        <form onSubmit={handleSubmit} className="space-y-4 py-2">
          <div className="space-y-1">
            <Label htmlFor="dept-name">Name *</Label>
            <Input id="dept-name" value={form.name} onChange={(e) => set("name", e.target.value)} placeholder="Appointment Scheduler" required />
          </div>

          <div className="space-y-1">
            <Label htmlFor="dept-phones">Phone Numbers</Label>
            <Input id="dept-phones" value={form.phone_numbers} onChange={(e) => set("phone_numbers", e.target.value)} placeholder="+1234567890, +0987654321" />
            <p className="text-xs text-muted-foreground">Comma-separated</p>
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-1">
              <Label htmlFor="hours-start">Hours Start</Label>
              <Input id="hours-start" type="time" value={form.hours_start} onChange={(e) => set("hours_start", e.target.value)} />
            </div>
            <div className="space-y-1">
              <Label htmlFor="hours-end">Hours End</Label>
              <Input id="hours-end" type="time" value={form.hours_end} onChange={(e) => set("hours_end", e.target.value)} />
            </div>
          </div>

          <div className="space-y-1">
            <Label htmlFor="dept-languages">Languages</Label>
            <Input id="dept-languages" value={form.languages} onChange={(e) => set("languages", e.target.value)} placeholder="urdu, english" />
            <p className="text-xs text-muted-foreground">Comma-separated</p>
          </div>

          <div className="space-y-1">
            <Label htmlFor="dept-keywords">Routing Keywords</Label>
            <Input id="dept-keywords" value={form.routing_keywords} onChange={(e) => set("routing_keywords", e.target.value)} placeholder="appointment, schedule, booking" />
            <p className="text-xs text-muted-foreground">Comma-separated — AI uses these to route calls</p>
          </div>

          <div className="flex items-center justify-between pt-1">
            <Label htmlFor="dept-active">Active</Label>
            <Switch id="dept-active" checked={form.is_active} onCheckedChange={(v) => set("is_active", v)} />
          </div>

          <DialogFooter className="pt-2">
            <Button type="button" variant="outline" onClick={onClose} disabled={saving}>Cancel</Button>
            <Button type="submit" disabled={saving} className="bg-dc-blue hover:bg-dc-blue-dark text-white">
              {saving ? <><Loader2 className="mr-2 h-4 w-4 animate-spin" /> Saving…</> : isEditing ? "Update" : "Create"}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
