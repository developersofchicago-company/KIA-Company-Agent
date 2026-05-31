"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import {
  Forward,
  Loader2,
  Plus,
  Star,
  Trash2,
  X,
} from "lucide-react";
import { toast } from "sonner";

import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Label } from "@/components/ui/label";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { createBrowserSupabase } from "@/lib/supabase";
import type { Call } from "@/lib/types";

const IMPORTANT_TAG = "important";

interface Props {
  call: Call;
}

export function CallActions({ call }: Props) {
  const router = useRouter();
  const [tags, setTags] = useState<string[]>(call.tags ?? []);
  const [notes, setNotes] = useState<string>(call.notes ?? "");
  const [newTag, setNewTag] = useState("");
  const [savingNotes, setSavingNotes] = useState(false);
  const [deleting, setDeleting] = useState(false);

  const supabase = createBrowserSupabase();
  const isImportant = tags.includes(IMPORTANT_TAG);

  async function saveTags(next: string[]) {
    const { error } = await supabase
      .from("calls")
      .update({ tags: next })
      .eq("id", call.id);
    if (error) {
      toast.error(error.message);
      throw error;
    }
  }

  async function onSaveNotes() {
    setSavingNotes(true);
    const { error } = await supabase
      .from("calls")
      .update({ notes })
      .eq("id", call.id);
    setSavingNotes(false);
    if (error) {
      toast.error(error.message);
      return;
    }
    toast.success("Note saved");
    router.refresh();
  }

  async function addTag(raw: string) {
    const t = raw.trim().toLowerCase();
    if (!t) return;
    if (tags.includes(t)) {
      setNewTag("");
      return;
    }
    const next = [...tags, t];
    setTags(next);
    setNewTag("");
    try {
      await saveTags(next);
      router.refresh();
    } catch {
      setTags(tags); // rollback
    }
  }

  async function removeTag(t: string) {
    const next = tags.filter((x) => x !== t);
    setTags(next);
    try {
      await saveTags(next);
      router.refresh();
    } catch {
      setTags(tags); // rollback
    }
  }

  async function toggleImportant() {
    if (isImportant) await removeTag(IMPORTANT_TAG);
    else await addTag(IMPORTANT_TAG);
  }

  async function onDelete() {
    setDeleting(true);
    const { error } = await supabase.from("calls").delete().eq("id", call.id);
    setDeleting(false);
    if (error) {
      toast.error(error.message);
      return;
    }
    toast.success("Call deleted");
    router.push("/calls");
    router.refresh();
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle className="text-base font-semibold text-dc-navy">
          Actions
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-5">
        {/* Notes */}
        <div className="space-y-2">
          <Label htmlFor="call-notes">Notes</Label>
          <Textarea
            id="call-notes"
            value={notes}
            onChange={(e) => setNotes(e.target.value)}
            placeholder="Internal notes about this call…"
            rows={3}
          />
          <div className="flex justify-end">
            <Button
              size="sm"
              onClick={onSaveNotes}
              disabled={savingNotes || notes === (call.notes ?? "")}
              className="bg-dc-blue hover:bg-dc-blue-dark"
            >
              {savingNotes && (
                <Loader2 className="mr-1.5 h-3.5 w-3.5 animate-spin" />
              )}
              Save note
            </Button>
          </div>
        </div>

        {/* Tags */}
        <div className="space-y-2">
          <Label>Tags</Label>
          <div className="flex flex-wrap gap-1.5">
            {tags
              .filter((t) => t !== IMPORTANT_TAG)
              .map((t) => (
                <Badge
                  key={t}
                  variant="secondary"
                  className="border-0 bg-muted pl-2.5 pr-1 text-xs"
                >
                  {t}
                  <button
                    type="button"
                    onClick={() => removeTag(t)}
                    aria-label={`Remove tag ${t}`}
                    className="ml-1 rounded p-0.5 hover:bg-background"
                  >
                    <X className="h-3 w-3" />
                  </button>
                </Badge>
              ))}
            {tags.length === 0 && (
              <p className="text-xs text-muted-foreground">No tags yet</p>
            )}
          </div>
          <form
            onSubmit={(e) => {
              e.preventDefault();
              addTag(newTag);
            }}
            className="flex gap-2"
          >
            <Input
              value={newTag}
              onChange={(e) => setNewTag(e.target.value)}
              placeholder="Add a tag…"
              className="h-9"
            />
            <Button type="submit" variant="outline" size="sm" className="h-9 gap-1">
              <Plus className="h-3.5 w-3.5" /> Add
            </Button>
          </form>
        </div>

        {/* Important toggle */}
        <button
          type="button"
          onClick={toggleImportant}
          className={cn(
            "flex w-full items-center justify-between rounded-md border border-input bg-background px-3 py-2 text-sm font-medium shadow-sm transition-colors",
            isImportant
              ? "text-amber-700 hover:bg-amber-50"
              : "text-dc-navy hover:bg-muted",
          )}
        >
          <span className="inline-flex items-center gap-2">
            <Star
              className={cn(
                "h-4 w-4",
                isImportant && "fill-amber-400 text-amber-500",
              )}
            />
            Mark as important
          </span>
          <span className="text-xs text-muted-foreground">
            {isImportant ? "On" : "Off"}
          </span>
        </button>

        {/* Forward (stub) */}
        <button
          type="button"
          onClick={() =>
            toast.info(
              "Team forwarding will land with the Settings/Team step.",
            )
          }
          className="flex w-full items-center justify-between rounded-md border border-input bg-background px-3 py-2 text-sm font-medium text-dc-navy shadow-sm hover:bg-muted"
        >
          <span className="inline-flex items-center gap-2">
            <Forward className="h-4 w-4" />
            Forward to team member
          </span>
          <span className="text-xs text-muted-foreground">Coming soon</span>
        </button>

        {/* Delete */}
        <Dialog>
          <DialogTrigger asChild>
            <Button variant="outline" className="w-full gap-2 text-destructive hover:text-destructive">
              <Trash2 className="h-4 w-4" />
              Delete call
            </Button>
          </DialogTrigger>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>Delete this call?</DialogTitle>
              <DialogDescription>
                This permanently removes the call record, transcript, and any
                notes. The recording at Vapi is not affected.
              </DialogDescription>
            </DialogHeader>
            <DialogFooter className="gap-2 sm:gap-2">
              <Button
                variant="destructive"
                onClick={onDelete}
                disabled={deleting}
              >
                {deleting && (
                  <Loader2 className="mr-1.5 h-4 w-4 animate-spin" />
                )}
                Delete
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      </CardContent>
    </Card>
  );
}
