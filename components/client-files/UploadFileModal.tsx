"use client";

import { useRef, useState } from "react";
import { Upload, X, Loader2 } from "lucide-react";
import { toast } from "sonner";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { cn } from "@/lib/utils";

interface UploadFileModalProps {
  open: boolean;
  onClose: () => void;
  onUploaded: () => void;
}

const CATEGORIES = [
  { value: "wave_recording", label: "Wave Call Recordings" },
  { value: "sales_report",   label: "Sales Reports" },
  { value: "training",       label: "Training Documents" },
  { value: "call_log",       label: "Call Logs" },
  { value: "other",          label: "Other" },
];

const ACCEPTED = ".wav,.mp3,.pdf,.xlsx,.xls,.csv,.docx,.doc,.txt,.zip,.rar,.jpg,.jpeg,.png";

function formatBytes(bytes: number) {
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
}

export function UploadFileModal({ open, onClose, onUploaded }: UploadFileModalProps) {
  const [files, setFiles] = useState<File[]>([]);
  const [category, setCategory] = useState("other");
  const [notes, setNotes] = useState("");
  const [dragging, setDragging] = useState(false);
  const [uploading, setUploading] = useState(false);
  const inputRef = useRef<HTMLInputElement>(null);

  function handleDrop(e: React.DragEvent) {
    e.preventDefault();
    setDragging(false);
    const dropped = Array.from(e.dataTransfer.files);
    setFiles((prev) => [...prev, ...dropped]);
  }

  function handleFiles(e: React.ChangeEvent<HTMLInputElement>) {
    const selected = Array.from(e.target.files ?? []);
    setFiles((prev) => [...prev, ...selected]);
    e.target.value = "";
  }

  function removeFile(index: number) {
    setFiles((prev) => prev.filter((_, i) => i !== index));
  }

  async function handleUpload() {
    if (files.length === 0) {
      toast.error("Please select at least one file.");
      return;
    }
    setUploading(true);
    let successCount = 0;
    let failCount = 0;

    for (const file of files) {
      try {
        const formData = new FormData();
        formData.append("file", file);
        formData.append("category", category);
        formData.append("notes", notes);

        const res = await fetch("/api/client-files/upload", {
          method: "POST",
          body: formData,
        });

        if (!res.ok) {
          const err = await res.json();
          throw new Error(err.error ?? "Upload failed");
        }
        successCount++;
      } catch (err) {
        failCount++;
        console.error(err);
      }
    }

    setUploading(false);

    if (successCount > 0) {
      toast.success(`${successCount} file${successCount > 1 ? "s" : ""} uploaded successfully.`);
      setFiles([]);
      setCategory("other");
      setNotes("");
      onUploaded();
      onClose();
    }
    if (failCount > 0) {
      toast.error(`${failCount} file${failCount > 1 ? "s" : ""} failed to upload.`);
    }
  }

  function handleClose() {
    if (uploading) return;
    setFiles([]);
    setCategory("other");
    setNotes("");
    onClose();
  }

  return (
    <Dialog open={open} onOpenChange={handleClose}>
      <DialogContent className="sm:max-w-lg overflow-hidden">
        <DialogHeader>
          <DialogTitle>Upload Files</DialogTitle>
        </DialogHeader>

        <div className="min-w-0 space-y-4">
          {/* Drop zone */}
          <div
            className={cn(
              "relative flex flex-col items-center justify-center rounded-lg border-2 border-dashed p-8 transition-colors cursor-pointer",
              dragging
                ? "border-dc-blue bg-dc-blue/5"
                : "border-border hover:border-dc-blue/50 hover:bg-muted/30",
            )}
            onDragOver={(e) => { e.preventDefault(); setDragging(true); }}
            onDragLeave={() => setDragging(false)}
            onDrop={handleDrop}
            onClick={() => inputRef.current?.click()}
          >
            <input
              ref={inputRef}
              type="file"
              multiple
              accept={ACCEPTED}
              className="hidden"
              onChange={handleFiles}
            />
            <Upload className="mb-2 h-8 w-8 text-muted-foreground" />
            <p className="text-sm font-medium text-dc-navy">
              Drop files here or <span className="text-dc-blue">browse</span>
            </p>
            <p className="mt-1 text-xs text-muted-foreground">
              WAV, MP3, PDF, XLSX, CSV, DOCX, TXT, ZIP, JPG, PNG
            </p>
          </div>

          {/* Selected files list */}
          {files.length > 0 && (
            <ul className="max-h-40 space-y-1 overflow-y-auto rounded-md border p-2">
              {files.map((f, i) => (
                <li
                  key={i}
                  className="flex items-center gap-2 rounded-md bg-muted/40 px-2.5 py-1.5 text-sm"
                >
                  <span className="min-w-0 flex-1 truncate text-dc-navy" title={f.name}>
                    {f.name}
                  </span>
                  <span className="shrink-0 text-xs tabular-nums text-muted-foreground">
                    {formatBytes(f.size)}
                  </span>
                  <button
                    type="button"
                    onClick={(e) => { e.stopPropagation(); removeFile(i); }}
                    className="shrink-0 rounded-sm p-0.5 text-muted-foreground hover:text-destructive"
                  >
                    <X className="h-3.5 w-3.5" />
                  </button>
                </li>
              ))}
            </ul>
          )}

          {/* Category */}
          <div className="space-y-1.5">
            <Label htmlFor="category">Category</Label>
            <Select value={category} onValueChange={setCategory}>
              <SelectTrigger id="category">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {CATEGORIES.map((c) => (
                  <SelectItem key={c.value} value={c.value}>
                    {c.label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          {/* Notes */}
          <div className="space-y-1.5">
            <Label htmlFor="notes">Notes (optional)</Label>
            <Textarea
              id="notes"
              placeholder="Add a note about this file"
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              rows={2}
            />
          </div>

          {/* Actions */}
          <div className="flex justify-end gap-2">
            <Button variant="outline" onClick={handleClose} disabled={uploading}>
              Cancel
            </Button>
            <Button
              onClick={handleUpload}
              disabled={uploading || files.length === 0}
              className="bg-dc-blue hover:bg-dc-blue-dark text-white"
            >
              {uploading && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
              {uploading ? "Uploading…" : `Upload${files.length > 1 ? ` (${files.length})` : ""}`}
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}
