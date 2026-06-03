"use client";

import { useRef, useState } from "react";
import { Upload, X, Loader2, CheckCircle2, AlertCircle } from "lucide-react";
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
  const [fileStatuses, setFileStatuses] = useState<("pending" | "uploading" | "done" | "error")[]>([]);
  const inputRef = useRef<HTMLInputElement>(null);

  const showProgress = files.length > 3;

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

  // Upload a single file using presigned URL
  async function uploadSingleFile(file: File, index: number) {
    setFileStatuses((prev) => {
      const next = [...prev];
      next[index] = "uploading";
      return next;
    });

    try {
      // Step 1: Get presigned URL from server
      const presignRes = await fetch("/api/client-files/presign", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          fileName: file.name,
          fileType: file.type || "application/octet-stream",
          fileSize: file.size,
          category,
        }),
      });

      if (!presignRes.ok) {
        const err = await presignRes.json();
        throw new Error(err.error ?? "Failed to get upload URL");
      }

      const { uploadUrl, key } = await presignRes.json();

      // Step 2: Upload directly to Wasabi S3 (bypassing Vercel)
      let uploadRes;
      try {
        uploadRes = await fetch(uploadUrl, {
          method: "PUT",
          body: file,
          headers: {
            "Content-Type": file.type || "application/octet-stream",
          },
        });
      } catch (networkErr) {
        console.error("Network/CORS error:", networkErr);
        throw new Error(
          "Failed to connect to storage. This is likely a CORS configuration issue. " +
          "Please check that your Wasabi bucket allows PUT requests from " + window.location.origin
        );
      }

      if (!uploadRes.ok) {
        const errorText = await uploadRes.text().catch(() => "Unknown error");
        console.error("Wasabi upload error:", uploadRes.status, errorText);
        throw new Error(`Upload failed: ${uploadRes.status} ${uploadRes.statusText}`);
      }

      // Step 3: Confirm upload and save to database
      const confirmRes = await fetch("/api/client-files/confirm", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          key,
          fileName: file.name,
          fileSize: file.size,
          fileType: file.type || "application/octet-stream",
          category,
          notes,
        }),
      });

      if (!confirmRes.ok) {
        const err = await confirmRes.json();
        throw new Error(err.error ?? "Failed to save file record");
      }

      setFileStatuses((prev) => {
        const next = [...prev];
        next[index] = "done";
        return next;
      });

      return { success: true };
    } catch (err) {
      console.error(`Upload failed for ${file.name}:`, err);
      setFileStatuses((prev) => {
        const next = [...prev];
        next[index] = "error";
        return next;
      });
      return { success: false, error: (err as Error).message };
    }
  }

  // Process files in parallel with concurrency limit
  async function handleUpload() {
    if (files.length === 0) {
      toast.error("Please select at least one file.");
      return;
    }

    // Check file sizes (100MB limit per file)
    const MAX_FILE_SIZE = 100 * 1024 * 1024;
    const oversizedFiles = files.filter(f => f.size > MAX_FILE_SIZE);
    if (oversizedFiles.length > 0) {
      toast.error(`${oversizedFiles.length} file(s) exceed 100MB limit`);
      return;
    }

    setUploading(true);
    setFileStatuses(files.map(() => "pending"));

    const CONCURRENCY = 5; // Upload 5 files at a time
    let successCount = 0;
    let failCount = 0;

    // Create batches of indices
    const indices = files.map((_, i) => i);
    const batches: number[][] = [];
    for (let i = 0; i < indices.length; i += CONCURRENCY) {
      batches.push(indices.slice(i, i + CONCURRENCY));
    }

    // Process batches sequentially, files within batch in parallel
    for (const batch of batches) {
      const results = await Promise.all(
        batch.map(async (index) => uploadSingleFile(files[index], index))
      );

      results.forEach((r) => {
        if (r.success) successCount++;
        else failCount++;
      });
    }

    setUploading(false);

    if (successCount > 0) {
      toast.success(`${successCount} file${successCount > 1 ? "s" : ""} uploaded successfully.`);
      onUploaded();
    }
    if (failCount > 0) {
      toast.error(`${failCount} file${failCount > 1 ? "s" : ""} failed to upload.`);
    }

    // Clear completed files, keep failed ones for retry
    const failedFiles = files.filter((_, i) => fileStatuses[i] === "error" || (fileStatuses[i] !== "done" && uploading === false));
    if (failedFiles.length === 0) {
      setFiles([]);
      setFileStatuses([]);
      setCategory("other");
      setFileType("all");
      setNotes("");
      onClose();
    } else {
      setFiles(failedFiles);
      setFileStatuses(failedFiles.map(() => "pending"));
      toast.info(`${failedFiles.length} file(s) remaining. You can retry them.`);
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
              className="hidden"
              onChange={handleFiles}
            />
            <Upload className="mb-2 h-8 w-8 text-muted-foreground" />
            <p className="text-sm font-medium text-dc-navy">
              Drop files here or <span className="text-dc-blue">browse</span>
            </p>
            <p className="mt-1 text-xs text-muted-foreground">
              All file types accepted
            </p>
          </div>

          {/* Progress bar for batch uploads */}
          {showProgress && uploading && (
            <div className="space-y-2 rounded-md border bg-muted/30 p-3">
              <div className="flex items-center justify-between text-sm">
                <span className="font-medium text-dc-navy">
                  Uploading {fileStatuses.filter(s => s === "done").length} of {files.length} files
                </span>
                <span className="text-muted-foreground">
                  {Math.round((fileStatuses.filter(s => s === "done" || s === "error").length / files.length) * 100)}%
                </span>
              </div>
              <div className="h-2 w-full rounded-full bg-muted">
                <div
                  className="h-2 rounded-full bg-dc-blue transition-all duration-300"
                  style={{
                    width: `${Math.round((fileStatuses.filter(s => s === "done" || s === "error").length / files.length) * 100)}%`
                  }}
                />
              </div>
              <p className="text-xs text-muted-foreground">
                {fileStatuses.filter(s => s === "uploading").length > 0
                  ? `${fileStatuses.filter(s => s === "uploading").length} file(s) uploading now`
                  : "Processing..."}
              </p>
            </div>
          )}

          {/* Selected files list */}
          {files.length > 0 && (
            <ul className="max-h-40 space-y-1 overflow-y-auto rounded-md border p-2">
              {files.map((f, i) => {
                const status = fileStatuses[i];
                return (
                  <li
                    key={i}
                    className={cn(
                      "flex items-center gap-2 rounded-md px-2.5 py-1.5 text-sm",
                      status === "done" ? "bg-green-50" : status === "error" ? "bg-destructive/10" : "bg-muted/40"
                    )}
                  >
                    <span className="min-w-0 flex-1 truncate text-dc-navy" title={f.name}>
                      {f.name}
                    </span>
                    <span className="shrink-0 text-xs tabular-nums text-muted-foreground">
                      {formatBytes(f.size)}
                    </span>
                    {status === "uploading" && <Loader2 className="h-3.5 w-3.5 animate-spin text-dc-blue" />}
                    {status === "done" && <CheckCircle2 className="h-3.5 w-3.5 text-green-500" />}
                    {status === "error" && <AlertCircle className="h-3.5 w-3.5 text-destructive" />}
                    {!status && (
                      <button
                        type="button"
                        onClick={(e) => { e.stopPropagation(); removeFile(i); }}
                        disabled={uploading}
                        className="shrink-0 rounded-sm p-0.5 text-muted-foreground hover:text-destructive disabled:opacity-50"
                      >
                        <X className="h-3.5 w-3.5" />
                      </button>
                    )}
                  </li>
                );
              })}
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
